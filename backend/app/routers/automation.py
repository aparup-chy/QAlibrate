import hashlib
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/automation", tags=["automation"])


def get_api_key(
    x_api_key: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.ApiKey:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="X-API-Key header is required")
    digest = hashlib.sha256(x_api_key.encode()).hexdigest()
    api_key = (
        db.query(models.ApiKey)
        .filter(models.ApiKey.hashed_key == digest, models.ApiKey.revoked_at.is_(None))
        .first()
    )
    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key


@router.post("/results", response_model=schemas.RunItemOut)
def record_automation_result(
    payload: schemas.AutomationResult,
    db: Session = Depends(get_db),
    api_key: models.ApiKey = Depends(get_api_key),
):
    item = db.query(models.RunItem).filter(models.RunItem.id == payload.run_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Run item not found")
    if item.run.workspace_id != api_key.workspace_id:
        raise HTTPException(status_code=403, detail="API key cannot update this workspace")
    item.status = payload.status
    item.notes = payload.notes
    item.executed_at = datetime.utcnow()
    item.executed_by = api_key.created_by
    db.commit()
    if all(run_item.status != models.ItemStatus.pending for run_item in item.run.items):
        item.run.status = models.RunStatus.completed
        db.commit()
    tc = item.test_case
    return schemas.RunItemOut(
        id=item.id,
        test_case_id=item.test_case_id,
        status=item.status,
        notes=item.notes,
        executed_at=item.executed_at,
        test_case_code=tc.code if tc else None,
        test_case_title=tc.title if tc else None,
        priority=tc.priority if tc else None,
    )
