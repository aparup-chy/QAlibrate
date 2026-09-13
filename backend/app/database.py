from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_legacy_schema():
    """Add columns introduced after the first local database was created."""
    if "users" not in inspect(engine).get_table_names():
        return
    user_columns = {column["name"] for column in inspect(engine).get_columns("users")}
    if "is_active" not in user_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE"))
    workspace_columns = {column["name"] for column in inspect(engine).get_columns("workspace_settings")}
    if "automation_webhook_url" not in workspace_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE workspace_settings ADD COLUMN automation_webhook_url VARCHAR(500) DEFAULT ''"))

    for table in ("suites", "test_cases", "test_runs", "workspace_settings", "invitations", "api_keys"):
        columns = {column["name"] for column in inspect(engine).get_columns(table)}
        if "workspace_id" not in columns:
            with engine.begin() as connection:
                connection.execute(text(f"ALTER TABLE {table} ADD COLUMN workspace_id INTEGER"))

    from . import models

    db = SessionLocal()
    try:
        default_workspace = db.query(models.Workspace).order_by(models.Workspace.id.asc()).first()
        first_user = db.query(models.User).order_by(models.User.id.asc()).first()
        if not default_workspace and first_user:
            default_workspace = models.Workspace(name="Default workspace", created_by=first_user.id)
            db.add(default_workspace)
            db.flush()

        if default_workspace:
            for user in db.query(models.User).all():
                membership = db.query(models.WorkspaceMember).filter_by(
                    workspace_id=default_workspace.id, user_id=user.id
                ).first()
                if not membership:
                    db.add(models.WorkspaceMember(workspace_id=default_workspace.id, user_id=user.id))
            for model in (models.Suite, models.TestCase, models.TestRun, models.Invitation, models.ApiKey):
                db.query(model).filter(model.workspace_id.is_(None)).update(
                    {model.workspace_id: default_workspace.id}, synchronize_session=False
                )
            db.query(models.WorkspaceSettings).filter(models.WorkspaceSettings.workspace_id.is_(None)).update(
                {models.WorkspaceSettings.workspace_id: default_workspace.id}, synchronize_session=False
            )

            # Older versions stored renamed workspace names only in settings.
            # Preserve custom names and replace only stale generic defaults.
            generic_names = {"default workspace", "qalibrate workspace"}
            for workspace_settings in db.query(models.WorkspaceSettings).filter(
                models.WorkspaceSettings.workspace_id.isnot(None)
            ).all():
                workspace = db.query(models.Workspace).filter(
                    models.Workspace.id == workspace_settings.workspace_id
                ).first()
                if workspace and workspace_settings.name and workspace.name != workspace_settings.name:
                    if workspace_settings.name.strip().lower() in generic_names:
                        workspace_settings.name = workspace.name
                    else:
                        workspace.name = workspace_settings.name
            db.commit()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
