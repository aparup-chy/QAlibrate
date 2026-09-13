from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_admin, get_workspace_id, require_workspace_id, filter_workspace_query

router = APIRouter(prefix="/test-runs", tags=["test-runs"])


def _counts(run: models.TestRun) -> dict:
    counts = {"passed": 0, "failed": 0, "blocked": 0, "skipped": 0, "pending": 0}
    for item in run.items:
        counts[item.status.value] += 1
    counts["total"] = len(run.items)
    return counts


def _summary_out(run: models.TestRun) -> schemas.TestRunOut:
    counts = _counts(run)
    return schemas.TestRunOut(
        id=run.id,
        name=run.name,
        status=run.status,
        created_at=run.created_at,
        created_by=run.created_by,
        created_by_name=run.created_by_user.full_name if run.created_by_user else None,
        total=counts["total"],
        passed=counts["passed"],
        failed=counts["failed"],
        blocked=counts["blocked"],
        skipped=counts["skipped"],
        pending=counts["pending"],
    )


@router.get("", response_model=list[schemas.TestRunOut])
def list_runs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    workspace_id: int | None = Depends(get_workspace_id),
):
    query = (
        db.query(models.TestRun)
        .options(joinedload(models.TestRun.items))
        .order_by(models.TestRun.created_at.desc())
    )
    query = filter_workspace_query(query, models.TestRun, workspace_id)
    runs = query.all()
    return [_summary_out(r) for r in runs]


@router.post("", response_model=schemas.TestRunDetailOut, status_code=201)
def create_run(
    payload: schemas.TestRunCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
    workspace_id: int = Depends(require_workspace_id),
):
    if not payload.test_case_ids:
        raise HTTPException(status_code=400, detail="Select at least one test case for this run")

    test_cases = db.query(models.TestCase).filter(
        models.TestCase.workspace_id == workspace_id,
        models.TestCase.id.in_(payload.test_case_ids),
    ).all()
    if len(test_cases) != len(set(payload.test_case_ids)):
        raise HTTPException(status_code=400, detail="All selected test cases must belong to the active workspace")

    run = models.TestRun(name=payload.name, created_by=current_user.id, workspace_id=workspace_id)
    db.add(run)
    db.flush()

    for tc_id in payload.test_case_ids:
        db.add(models.RunItem(run_id=run.id, test_case_id=tc_id))

    db.commit()
    db.refresh(run)
    return _detail_out(run, db)


def _detail_out(run: models.TestRun, db: Session) -> schemas.TestRunDetailOut:
    summary = _summary_out(run)
    items_out = []
    for item in run.items:
        tc = item.test_case
        items_out.append(
            schemas.RunItemOut(
                id=item.id,
                test_case_id=item.test_case_id,
                status=item.status,
                notes=item.notes,
                executed_at=item.executed_at,
                test_case_code=tc.code if tc else None,
                test_case_title=tc.title if tc else None,
                priority=tc.priority if tc else None,
            )
        )
    return schemas.TestRunDetailOut(**summary.model_dump(), items=items_out)


@router.get("/{run_id}", response_model=schemas.TestRunDetailOut)
def get_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    workspace_id: int | None = Depends(get_workspace_id),
):
    query = (
        db.query(models.TestRun)
        .options(joinedload(models.TestRun.items).joinedload(models.RunItem.test_case))
        .filter(models.TestRun.id == run_id)
    )
    query = filter_workspace_query(query, models.TestRun, workspace_id)
    run = query.first()
    if not run:
        raise HTTPException(status_code=404, detail="Test run not found")
    return _detail_out(run, db)


@router.patch("/{run_id}/items/{item_id}", response_model=schemas.RunItemOut)
def update_run_item(
    run_id: int,
    item_id: int,
    payload: schemas.RunItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    workspace_id: int | None = Depends(get_workspace_id),
):
    query = (
        db.query(models.RunItem)
        .filter(models.RunItem.id == item_id, models.RunItem.run_id == run_id)
    )
    query = filter_workspace_query(query.join(models.TestRun), models.TestRun, workspace_id)
    item = query.first()
    if not item:
        raise HTTPException(status_code=404, detail="Run item not found")
    if item.run.status == models.RunStatus.completed:
        raise HTTPException(status_code=409, detail="Completed runs cannot be changed")

    item.status = payload.status
    item.notes = payload.notes
    item.executed_at = datetime.utcnow()
    item.executed_by = current_user.id
    db.commit()
    db.refresh(item)

    run = db.query(models.TestRun).filter(models.TestRun.id == run_id).first()
    if run and all(i.status != models.ItemStatus.pending for i in run.items):
        run.status = models.RunStatus.completed
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


@router.delete("/{run_id}", status_code=204)
def delete_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    workspace_id: int | None = Depends(get_workspace_id),
):
    query = db.query(models.TestRun).filter(models.TestRun.id == run_id)
    query = filter_workspace_query(query, models.TestRun, workspace_id)
    run = query.first()
    if not run:
        raise HTTPException(status_code=404, detail="Test run not found")
    if current_user.role != models.UserRole.admin and run.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the run creator or an admin can delete this run")
    db.delete(run)
    db.commit()
    return None
