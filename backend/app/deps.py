from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from .security import decode_access_token
from . import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def get_workspace_id(
    x_workspace_id: int | None = Header(default=None),
    x_workspace_scope: str | None = Header(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> int | list[int] | None:
    if current_user.role == models.UserRole.admin and x_workspace_scope:
        if x_workspace_scope.lower() == "all":
            return None
        try:
            workspace_ids = [int(value) for value in x_workspace_scope.split(",") if value.strip()]
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid workspace selection") from exc
        if not workspace_ids:
            return None
        existing_ids = {
            workspace_id
            for (workspace_id,) in db.query(models.Workspace.id).filter(models.Workspace.id.in_(workspace_ids)).all()
        }
        if len(existing_ids) != len(set(workspace_ids)):
            raise HTTPException(status_code=404, detail="Workspace not found")
        return workspace_ids
    if current_user.role == models.UserRole.admin:
        return None
    query = db.query(models.WorkspaceMember.workspace_id).filter(models.WorkspaceMember.user_id == current_user.id)
    if x_workspace_id is not None:
        member = query.filter(models.WorkspaceMember.workspace_id == x_workspace_id).first()
        if not member:
            raise HTTPException(status_code=403, detail="You are not assigned to this workspace")
        return x_workspace_id
    membership = query.order_by(models.WorkspaceMember.workspace_id.asc()).first()
    if not membership:
        raise HTTPException(status_code=403, detail="You are not assigned to a workspace")
    return membership.workspace_id


def require_workspace_id(
    x_workspace_id: int | None = Header(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> int:
    if x_workspace_id is not None:
        if current_user.role == models.UserRole.admin:
            exists = db.query(models.Workspace.id).filter(models.Workspace.id == x_workspace_id).first()
            if not exists:
                raise HTTPException(status_code=404, detail="Workspace not found")
            return x_workspace_id
        member = db.query(models.WorkspaceMember).filter_by(
            workspace_id=x_workspace_id, user_id=current_user.id
        ).first()
        if not member:
            raise HTTPException(status_code=403, detail="You are not assigned to this workspace")
        return x_workspace_id
    if current_user.role == models.UserRole.admin:
        workspace = db.query(models.Workspace).order_by(models.Workspace.id.asc()).first()
        if workspace:
            return workspace.id
        raise HTTPException(status_code=400, detail="Create a workspace before changing workspace data")
    workspace_id = get_workspace_id(None, None, db, current_user)
    if workspace_id is None:
        raise HTTPException(status_code=400, detail="Select a workspace before changing workspace data")
    return workspace_id


def filter_workspace_query(query, model, workspace_scope: int | list[int] | None):
    if isinstance(workspace_scope, list):
        return query.filter(model.workspace_id.in_(workspace_scope))
    if workspace_scope is not None:
        return query.filter(model.workspace_id == workspace_scope)
    return query
