import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_admin, require_workspace_id

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    return db.query(models.User).order_by(models.User.created_at.asc()).all()


@router.patch("/{user_id}/role", response_model=schemas.UserOut)
def update_role(
    user_id: int,
    payload: schemas.UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id and payload.role != models.UserRole.admin:
        raise HTTPException(status_code=400, detail="You cannot remove your own admin role")
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/status", response_model=schemas.UserOut)
def update_status(
    user_id: int,
    payload: schemas.UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


@router.get("/invitations", response_model=list[schemas.InvitationOut])
def list_invitations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    return db.query(models.Invitation).order_by(models.Invitation.created_at.desc()).all()


@router.post("/invitations", response_model=schemas.InvitationOut, status_code=201)
def create_invitation(
    payload: schemas.InvitationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
    workspace_id: int = Depends(require_workspace_id),
):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    invitation = models.Invitation(
        email=payload.email,
        role=payload.role,
        token=secrets.token_urlsafe(32),
        expires_at=datetime.utcnow() + timedelta(days=7),
        created_by=current_user.id,
        workspace_id=workspace_id,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return schemas.InvitationOut(
        id=invitation.id,
        email=invitation.email,
        role=invitation.role,
        expires_at=invitation.expires_at,
        accepted_at=invitation.accepted_at,
        token=invitation.token,
    )
