import hashlib
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_admin, require_workspace_id

router = APIRouter(prefix="/workspace", tags=["workspace"])
GENERIC_WORKSPACE_NAMES = {"default workspace", "qalibrate workspace"}


def _next_settings_id(db: Session) -> int:
    return (db.query(func.max(models.WorkspaceSettings.id)).scalar() or 0) + 1


def _synchronize_workspace_name(db: Session, workspace: models.Workspace) -> None:
    settings = workspace.settings
    if not settings or not settings.name or settings.name == workspace.name:
        return
    if settings.name.strip().lower() in GENERIC_WORKSPACE_NAMES:
        settings.name = workspace.name
    else:
        workspace.name = settings.name


def _settings(db: Session, workspace_id: int) -> models.WorkspaceSettings:
    workspace = _workspace_or_404(db, workspace_id)
    settings = db.query(models.WorkspaceSettings).filter(models.WorkspaceSettings.workspace_id == workspace_id).first()
    if not settings:
        settings = models.WorkspaceSettings(id=_next_settings_id(db), workspace_id=workspace_id, name=workspace.name)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    else:
        _synchronize_workspace_name(db, workspace)
        db.commit()
    return settings


@router.get("/settings", response_model=schemas.WorkspaceSettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
    workspace_id: int = Depends(require_workspace_id),
):
    return _settings(db, workspace_id)


@router.put("/settings", response_model=schemas.WorkspaceSettingsOut)
def update_settings(
    payload: schemas.WorkspaceSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
    workspace_id: int = Depends(require_workspace_id),
):
    settings = _settings(db, workspace_id)
    workspace = _workspace_or_404(db, workspace_id)
    workspace.name = payload.name
    settings.name = payload.name
    settings.require_invite = payload.require_invite
    settings.default_priority = payload.default_priority
    settings.automation_webhook_url = payload.automation_webhook_url
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/api-keys", response_model=list[schemas.ApiKeyOut])
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
    workspace_id: int = Depends(require_workspace_id),
):
    return (
        db.query(models.ApiKey)
        .filter(models.ApiKey.revoked_at.is_(None), models.ApiKey.workspace_id == workspace_id)
        .order_by(models.ApiKey.created_at.desc())
        .all()
    )


@router.post("/api-keys", response_model=schemas.ApiKeyOut, status_code=201)
def create_api_key(
    payload: schemas.ApiKeyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
    workspace_id: int = Depends(require_workspace_id),
):
    raw_key = f"qak_{secrets.token_urlsafe(32)}"
    api_key = models.ApiKey(
        name=payload.name,
        key_prefix=raw_key[:12],
        hashed_key=hashlib.sha256(raw_key.encode()).hexdigest(),
        created_by=current_user.id,
        workspace_id=workspace_id,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return schemas.ApiKeyOut(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        created_at=api_key.created_at,
        revoked_at=api_key.revoked_at,
        token=raw_key,
    )


@router.delete("/api-keys/{key_id}", status_code=204)
def revoke_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
    workspace_id: int = Depends(require_workspace_id),
):
    api_key = db.query(models.ApiKey).filter(models.ApiKey.id == key_id, models.ApiKey.workspace_id == workspace_id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    api_key.revoked_at = datetime.utcnow()
    db.commit()
    return None


@router.get("/workspaces", response_model=list[schemas.WorkspaceOut])
def list_workspaces(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Workspace)
    if current_user.role != models.UserRole.admin:
        query = query.join(models.WorkspaceMember).filter(models.WorkspaceMember.user_id == current_user.id)
    workspaces = query.order_by(models.Workspace.created_at.asc()).all()
    for workspace in workspaces:
        _synchronize_workspace_name(db, workspace)
    db.commit()
    return [
        schemas.WorkspaceOut(
            id=workspace.id,
            name=workspace.name,
            created_at=workspace.created_at,
            member_count=len(workspace.memberships),
        )
        for workspace in workspaces
    ]


@router.post("/workspaces", response_model=schemas.WorkspaceOut, status_code=201)
def create_workspace(
    payload: schemas.WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    workspace = models.Workspace(name=payload.name, created_by=current_user.id)
    db.add(workspace)
    db.flush()
    db.add(models.WorkspaceMember(workspace_id=workspace.id, user_id=current_user.id))
    db.add(models.WorkspaceSettings(id=_next_settings_id(db), workspace_id=workspace.id, name=workspace.name))
    db.commit()
    db.refresh(workspace)
    return schemas.WorkspaceOut(id=workspace.id, name=workspace.name, created_at=workspace.created_at, member_count=1)


@router.delete("/workspaces/{workspace_id}", status_code=204)
def delete_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    workspace = _workspace_or_404(db, workspace_id)
    if db.query(models.Workspace).count() <= 1:
        raise HTTPException(status_code=400, detail="You cannot delete the last workspace")

    suite_ids = [suite.id for suite in db.query(models.Suite.id).filter(models.Suite.workspace_id == workspace_id).all()]
    test_case_filters = [models.TestCase.workspace_id == workspace_id]
    if suite_ids:
        test_case_filters.append(models.TestCase.suite_id.in_(suite_ids))
    test_case_ids = [test_case.id for test_case in db.query(models.TestCase.id).filter(or_(*test_case_filters)).all()]
    run_ids = [run.id for run in db.query(models.TestRun.id).filter(models.TestRun.workspace_id == workspace_id).all()]

    run_item_filters = []
    if run_ids:
        run_item_filters.append(models.RunItem.run_id.in_(run_ids))
    if test_case_ids:
        run_item_filters.append(models.RunItem.test_case_id.in_(test_case_ids))
    if run_item_filters:
        db.query(models.RunItem).filter(or_(*run_item_filters)).delete(synchronize_session=False)

    if test_case_ids:
        db.query(models.TestCase).filter(models.TestCase.id.in_(test_case_ids)).delete(synchronize_session=False)
    db.query(models.TestRun).filter(models.TestRun.workspace_id == workspace_id).delete(synchronize_session=False)
    db.query(models.Suite).filter(models.Suite.workspace_id == workspace_id).delete(synchronize_session=False)
    db.query(models.Invitation).filter(models.Invitation.workspace_id == workspace_id).delete(synchronize_session=False)
    db.query(models.ApiKey).filter(models.ApiKey.workspace_id == workspace_id).delete(synchronize_session=False)
    db.query(models.WorkspaceSettings).filter(models.WorkspaceSettings.workspace_id == workspace_id).delete(synchronize_session=False)
    db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == workspace_id).delete(synchronize_session=False)
    db.delete(workspace)
    db.commit()
    return None


def _workspace_or_404(db: Session, workspace_id: int) -> models.Workspace:
    workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.get("/workspaces/{workspace_id}/members", response_model=list[schemas.WorkspaceMemberOut])
def list_workspace_members(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    _workspace_or_404(db, workspace_id)
    assigned_ids = {
        member.user_id for member in db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == workspace_id)
    }
    users = db.query(models.User).order_by(models.User.created_at.asc()).all()
    return [
        schemas.WorkspaceMemberOut(
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=user.role,
            assigned=user.id in assigned_ids,
        )
        for user in users
    ]


@router.put("/workspaces/{workspace_id}/members/{user_id}", response_model=schemas.WorkspaceMemberOut)
def update_workspace_member(
    workspace_id: int,
    user_id: int,
    payload: schemas.WorkspaceAssignment,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    _workspace_or_404(db, workspace_id)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    membership = db.query(models.WorkspaceMember).filter_by(workspace_id=workspace_id, user_id=user_id).first()
    if payload.assigned and not membership:
        membership = models.WorkspaceMember(workspace_id=workspace_id, user_id=user_id)
        db.add(membership)
    elif not payload.assigned and membership:
        if user_id == current_user.id:
            raise HTTPException(status_code=400, detail="You cannot remove yourself from a workspace")
        db.delete(membership)
    db.commit()
    return schemas.WorkspaceMemberOut(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        assigned=payload.assigned,
    )
