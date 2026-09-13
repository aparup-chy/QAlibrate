import logging
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models, schemas
from ..database import get_db
from ..security import hash_password, verify_password, create_access_token
from ..deps import get_current_user
from ..email import send_password_reset_otp

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

RESET_MESSAGE = "If an account exists for that email, a reset code has been sent."


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    settings_row = db.query(models.WorkspaceSettings).order_by(models.WorkspaceSettings.id.asc()).first()
    invitation = None
    if payload.invite_token:
        invitation = (
            db.query(models.Invitation)
            .filter(
                models.Invitation.token == payload.invite_token,
                models.Invitation.accepted_at.is_(None),
                models.Invitation.expires_at > datetime.utcnow(),
            )
            .first()
        )
        if not invitation or invitation.email.lower() != payload.email.lower():
            raise HTTPException(status_code=400, detail="Invitation is invalid or expired")
    elif settings_row and settings_row.require_invite and db.query(models.User).count() > 0:
        raise HTTPException(status_code=403, detail="An invitation is required to register")

    is_first_user = db.query(models.User).count() == 0
    user = models.User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=(models.UserRole.admin if is_first_user else invitation.role if invitation else models.UserRole.tester),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    workspace_id = invitation.workspace_id if invitation else None
    if workspace_id is None:
        workspace = db.query(models.Workspace).order_by(models.Workspace.id.asc()).first()
        if not workspace:
            workspace = models.Workspace(name="Default workspace", created_by=user.id)
            db.add(workspace)
            db.flush()
            next_settings_id = (db.query(func.max(models.WorkspaceSettings.id)).scalar() or 0) + 1
            db.add(models.WorkspaceSettings(id=next_settings_id, workspace_id=workspace.id, name=workspace.name))
        workspace_id = workspace.id
    db.add(models.WorkspaceMember(workspace_id=workspace_id, user_id=user.id))
    db.commit()
    if invitation:
        invitation.accepted_at = datetime.utcnow()
        db.commit()

    token = create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is temporarily deactivated. Please contact an administrator to regain access.",
        )
    token = create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/forgot-password")
def forgot_password(
    payload: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not user.is_active:
        return {"message": RESET_MESSAGE}

    latest = (
        db.query(models.PasswordResetOtp)
        .filter(models.PasswordResetOtp.user_id == user.id)
        .order_by(models.PasswordResetOtp.created_at.desc())
        .first()
    )
    if latest and latest.created_at and datetime.utcnow() - latest.created_at < timedelta(minutes=1):
        return {"message": RESET_MESSAGE}

    db.query(models.PasswordResetOtp).filter(
        models.PasswordResetOtp.user_id == user.id,
        models.PasswordResetOtp.used_at.is_(None),
    ).update({models.PasswordResetOtp.used_at: datetime.utcnow()})

    otp = f"{secrets.randbelow(1_000_000):06d}"
    reset = models.PasswordResetOtp(
        user_id=user.id,
        otp_hash=hash_password(otp),
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    )
    db.add(reset)
    try:
        send_password_reset_otp(user.email, otp)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Password reset email delivery failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc) or "The password reset email service is unavailable. Please try again later.",
        )
    return {"message": RESET_MESSAGE}


@router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    reset = (
        db.query(models.PasswordResetOtp)
        .filter(
            models.PasswordResetOtp.user_id == user.id,
            models.PasswordResetOtp.used_at.is_(None),
        )
        .order_by(models.PasswordResetOtp.created_at.desc())
        .first()
    )
    if not reset or reset.expires_at <= datetime.utcnow() or reset.attempts >= 5:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    if not verify_password(payload.otp, reset.otp_hash):
        reset.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    user.hashed_password = hash_password(payload.new_password)
    reset.used_at = datetime.utcnow()
    db.commit()
    return {"message": "Your password has been reset. You can now sign in."}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.email and payload.email.lower() != current_user.email.lower():
        existing = (
            db.query(models.User)
            .filter(models.User.email == payload.email, models.User.id != current_user.id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="An account with this email already exists")
        current_user.email = payload.email

    if payload.full_name is not None:
        current_user.full_name = payload.full_name

    if payload.new_password:
        if not payload.current_password or not verify_password(
            payload.current_password, current_user.hashed_password
        ):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        current_user.hashed_password = hash_password(payload.new_password)

    db.commit()
    db.refresh(current_user)
    return current_user
