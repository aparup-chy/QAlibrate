import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_admin, get_workspace_id, filter_workspace_query

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _owned_query(query, model, workspace_id):
    return filter_workspace_query(query, model, workspace_id)


@router.get("/overview", response_model=schemas.OverviewOut)
def overview(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    workspace_id: int | None = Depends(get_workspace_id),
):
    total_test_cases = _owned_query(db.query(models.TestCase), models.TestCase, workspace_id).count()
    total_suites = _owned_query(db.query(models.Suite), models.Suite, workspace_id).count()
    total_runs = _owned_query(db.query(models.TestRun), models.TestRun, workspace_id).count()
    active_runs = _owned_query(
        db.query(models.TestRun).filter(models.TestRun.status == models.RunStatus.in_progress),
        models.TestRun,
        workspace_id,
    ).count()

    run_ids = [r.id for r in _owned_query(db.query(models.TestRun), models.TestRun, workspace_id).all()]
    executed = db.query(models.RunItem).filter(models.RunItem.run_id.in_(run_ids), models.RunItem.status != models.ItemStatus.pending).count() if run_ids else 0
    passed = db.query(models.RunItem).filter(models.RunItem.run_id.in_(run_ids), models.RunItem.status == models.ItemStatus.passed).count() if run_ids else 0
    pass_rate = round((passed / executed) * 100, 1) if executed else 0.0

    return schemas.OverviewOut(
        total_test_cases=total_test_cases,
        total_suites=total_suites,
        total_runs=total_runs,
        overall_pass_rate=pass_rate,
        active_run_count=active_runs,
    )


@router.get("/suite-health", response_model=list[schemas.SuiteHealthOut])
def suite_health(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    workspace_id: int | None = Depends(get_workspace_id),
):
    suites = _owned_query(db.query(models.Suite), models.Suite, workspace_id).all()
    results = []
    for suite in suites:
        tc_ids = [tc.id for tc in suite.test_cases]
        if not tc_ids:
            results.append(schemas.SuiteHealthOut(suite_name=suite.name, total_executions=0, pass_rate=0.0))
            continue
        items = (
            db.query(models.RunItem)
            .filter(models.RunItem.test_case_id.in_(tc_ids))
            .filter(models.RunItem.status != models.ItemStatus.pending)
            .all()
        )
        total = len(items)
        passed = len([i for i in items if i.status == models.ItemStatus.passed])
        rate = round((passed / total) * 100, 1) if total else 0.0
        results.append(schemas.SuiteHealthOut(suite_name=suite.name, total_executions=total, pass_rate=rate))
    return results


@router.get("/run-trend", response_model=list[schemas.RunTrendPoint])
def run_trend(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    workspace_id: int | None = Depends(get_workspace_id),
):
    runs = (
        _owned_query(db.query(models.TestRun), models.TestRun, workspace_id)
        .options(joinedload(models.TestRun.items))
        .order_by(models.TestRun.created_at.desc())
        .limit(20)
        .all()
    )
    runs.reverse()
    points = []
    for run in runs:
        executed = [i for i in run.items if i.status != models.ItemStatus.pending]
        if not executed:
            continue
        passed = len([i for i in executed if i.status == models.ItemStatus.passed])
        rate = round((passed / len(executed)) * 100, 1)
        points.append(schemas.RunTrendPoint(run_name=run.name, created_at=run.created_at, pass_rate=rate))
    return points


@router.get("/flaky-tests", response_model=list[schemas.FlakyTestOut])
def flaky_tests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    workspace_id: int | None = Depends(get_workspace_id),
):
    test_cases = _owned_query(db.query(models.TestCase), models.TestCase, workspace_id).all()
    results = []
    for tc in test_cases:
        executed = [i for i in tc.run_items if i.status != models.ItemStatus.pending]
        pass_count = len([i for i in executed if i.status == models.ItemStatus.passed])
        fail_count = len([i for i in executed if i.status == models.ItemStatus.failed])
        if pass_count > 0 and fail_count > 0:
            results.append(
                schemas.FlakyTestOut(
                    code=tc.code,
                    title=tc.title,
                    pass_count=pass_count,
                    fail_count=fail_count,
                    total_runs=len(executed),
                )
            )
    results.sort(key=lambda r: r.fail_count, reverse=True)
    return results


@router.get("/export.csv")
def export_report(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
    workspace_id: int | None = Depends(get_workspace_id),
):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["section", "name", "value", "total_executions"])
    for row in suite_health(db, current_user, workspace_id):
        writer.writerow(["suite_health", row.suite_name, row.pass_rate, row.total_executions])
    for row in flaky_tests(db, current_user, workspace_id):
        writer.writerow(["flaky_test", f"{row.code} {row.title}", f"{row.fail_count} failures", row.total_runs])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=qalibrate-report.csv"},
    )
