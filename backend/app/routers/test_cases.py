from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_admin, get_workspace_id, require_workspace_id, filter_workspace_query

router = APIRouter(prefix="/test-cases", tags=["test-cases"])


def _next_code(db: Session) -> str:
    count = db.query(models.TestCase).count()
    return f"TC-{count + 1:04d}"


def _to_out(tc: models.TestCase) -> schemas.TestCaseOut:
    out = schemas.TestCaseOut.model_validate(tc)
    out.suite_name = tc.suite.name if tc.suite else None
    return out


@router.get("", response_model=list[schemas.TestCaseOut])
def list_test_cases(
    suite_id: Optional[int] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    workspace_id: int | None = Depends(get_workspace_id),
):
    q = db.query(models.TestCase)
    q = filter_workspace_query(q, models.TestCase, workspace_id)
    if suite_id:
        q = q.filter(models.TestCase.suite_id == suite_id)
    if priority:
        q = q.filter(models.TestCase.priority == priority)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (models.TestCase.title.ilike(like)) | (models.TestCase.code.ilike(like))
        )
    test_cases = q.order_by(models.TestCase.created_at.desc()).all()
    return [_to_out(tc) for tc in test_cases]


@router.post("", response_model=schemas.TestCaseOut, status_code=201)
def create_test_case(
    payload: schemas.TestCaseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    workspace_id: int = Depends(require_workspace_id),
):
    suite = db.query(models.Suite).filter(models.Suite.id == payload.suite_id, models.Suite.workspace_id == workspace_id).first()
    if not suite:
        raise HTTPException(status_code=404, detail="Suite not found")

    tc = models.TestCase(
        code=_next_code(db),
        suite_id=payload.suite_id,
        title=payload.title,
        preconditions=payload.preconditions,
        steps=payload.steps,
        expected_result=payload.expected_result,
        priority=payload.priority,
        is_automated=payload.is_automated,
        created_by=current_user.id,
        workspace_id=workspace_id,
    )
    db.add(tc)
    db.commit()
    db.refresh(tc)
    return _to_out(tc)


@router.put("/{test_case_id}", response_model=schemas.TestCaseOut)
def update_test_case(
    test_case_id: int,
    payload: schemas.TestCaseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    workspace_id: int | None = Depends(get_workspace_id),
):
    query = db.query(models.TestCase).filter(models.TestCase.id == test_case_id)
    query = filter_workspace_query(query, models.TestCase, workspace_id)
    tc = query.first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    suite_query = db.query(models.Suite).filter(models.Suite.id == payload.suite_id)
    suite_query = filter_workspace_query(suite_query, models.Suite, workspace_id)
    suite = suite_query.first()
    if not suite:
        raise HTTPException(status_code=404, detail="Suite not found")
    tc.suite_id = payload.suite_id
    tc.workspace_id = suite.workspace_id
    tc.title = payload.title
    tc.preconditions = payload.preconditions
    tc.steps = payload.steps
    tc.expected_result = payload.expected_result
    tc.priority = payload.priority
    tc.is_automated = payload.is_automated
    db.commit()
    db.refresh(tc)
    return _to_out(tc)


@router.delete("/{test_case_id}", status_code=204)
def delete_test_case(
    test_case_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
    workspace_id: int | None = Depends(get_workspace_id),
):
    query = db.query(models.TestCase).filter(models.TestCase.id == test_case_id)
    query = filter_workspace_query(query, models.TestCase, workspace_id)
    tc = query.first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    db.delete(tc)
    db.commit()
    return None
