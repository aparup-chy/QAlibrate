from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_admin, get_workspace_id, require_workspace_id, filter_workspace_query

router = APIRouter(prefix="/suites", tags=["suites"])


@router.get("", response_model=list[schemas.SuiteOut])
def list_suites(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    workspace_id: int | None = Depends(get_workspace_id),
):
    query = (
        db.query(models.Suite, func.count(models.TestCase.id).label("test_case_count"))
        .outerjoin(models.TestCase, models.TestCase.suite_id == models.Suite.id)
        .group_by(models.Suite.id)
        .order_by(models.Suite.created_at.desc())
    )
    query = filter_workspace_query(query, models.Suite, workspace_id)
    rows = query.all()
    result = []
    for suite, count in rows:
        out = schemas.SuiteOut.model_validate(suite)
        out.test_case_count = count
        result.append(out)
    return result


@router.post("", response_model=schemas.SuiteOut, status_code=201)
def create_suite(
    payload: schemas.SuiteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
    workspace_id: int = Depends(require_workspace_id),
):
    suite = models.Suite(name=payload.name, description=payload.description, created_by=current_user.id, workspace_id=workspace_id)
    db.add(suite)
    db.commit()
    db.refresh(suite)
    out = schemas.SuiteOut.model_validate(suite)
    out.test_case_count = 0
    return out


@router.put("/{suite_id}", response_model=schemas.SuiteOut)
def update_suite(
    suite_id: int,
    payload: schemas.SuiteUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
    workspace_id: int | None = Depends(get_workspace_id),
):
    query = db.query(models.Suite).filter(models.Suite.id == suite_id)
    query = filter_workspace_query(query, models.Suite, workspace_id)
    suite = query.first()
    if not suite:
        raise HTTPException(status_code=404, detail="Suite not found")
    suite.name = payload.name
    suite.description = payload.description
    db.commit()
    db.refresh(suite)
    out = schemas.SuiteOut.model_validate(suite)
    out.test_case_count = len(suite.test_cases)
    return out


@router.delete("/{suite_id}", status_code=204)
def delete_suite(
    suite_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
    workspace_id: int | None = Depends(get_workspace_id),
):
    query = db.query(models.Suite).filter(models.Suite.id == suite_id)
    query = filter_workspace_query(query, models.Suite, workspace_id)
    suite = query.first()
    if not suite:
        raise HTTPException(status_code=404, detail="Suite not found")
    db.delete(suite)
    db.commit()
    return None
