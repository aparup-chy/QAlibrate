"""
Optional helper script that fills the database with demo data so the UI
has something to show right after setup.

Run it once after the API has started and the tables exist:

    python seed.py

It creates a demo account:
    email:    demo@qamanager.dev
    password: DemoPass123
"""
import random
from datetime import datetime, timedelta
from sqlalchemy import func

from app.database import SessionLocal, engine, Base
from app import models
from app.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

DEMO_EMAIL = "demo@qamanager.dev"
DEMO_PASSWORD = "DemoPass123"

user = db.query(models.User).filter(models.User.email == DEMO_EMAIL).first()
if not user:
    user = models.User(
        full_name="Demo Tester",
        email=DEMO_EMAIL,
        hashed_password=hash_password(DEMO_PASSWORD),
        role=models.UserRole.admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"Created demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")
else:
    print("Demo user already exists, reusing it.")

workspace = db.query(models.Workspace).order_by(models.Workspace.id.asc()).first()
if not workspace:
    workspace = models.Workspace(name="Default workspace", created_by=user.id)
    db.add(workspace)
    db.flush()
    next_settings_id = (db.query(func.max(models.WorkspaceSettings.id)).scalar() or 0) + 1
    db.add(models.WorkspaceSettings(id=next_settings_id, workspace_id=workspace.id, name=workspace.name))
if not db.query(models.WorkspaceMember).filter_by(workspace_id=workspace.id, user_id=user.id).first():
    db.add(models.WorkspaceMember(workspace_id=workspace.id, user_id=user.id))
db.commit()

if db.query(models.Suite).count() == 0:
    suites_data = [
        ("Authentication", "Login, registration, password reset and session handling."),
        ("Checkout Flow", "Cart, payment and order confirmation."),
        ("User Profile", "Editing account details and preferences."),
    ]
    suites = []
    for name, desc in suites_data:
        s = models.Suite(name=name, description=desc, created_by=user.id, workspace_id=workspace.id)
        db.add(s)
        suites.append(s)
    db.commit()
    for s in suites:
        db.refresh(s)

    priorities = list(models.Priority)
    test_case_titles = {
        "Authentication": [
            "User can log in with valid credentials",
            "User sees an error with an invalid password",
            "Password reset email is sent for a registered address",
            "Session expires after the configured timeout",
            "Account locks after 5 failed login attempts",
        ],
        "Checkout Flow": [
            "Cart total updates when quantity changes",
            "Promo code applies the correct discount",
            "Order confirmation email is sent after purchase",
            "Checkout blocks submission with an expired card",
            "Guest checkout completes without an account",
        ],
        "User Profile": [
            "User can update their display name",
            "Avatar upload accepts JPG and PNG only",
            "Email change requires re-verification",
            "User can deactivate their own account",
        ],
    }

    code_counter = 1
    all_cases = []
    for s in suites:
        for title in test_case_titles[s.name]:
            tc = models.TestCase(
                code=f"TC-{code_counter:04d}",
                suite_id=s.id,
                title=title,
                preconditions="User has a valid test account.",
                steps="1. Navigate to the relevant page\n2. Perform the action\n3. Observe the result",
                expected_result="The system behaves as described in the title.",
                priority=random.choice(priorities),
                is_automated=random.choice([True, False]),
                created_by=user.id,
                workspace_id=workspace.id,
            )
            db.add(tc)
            all_cases.append(tc)
            code_counter += 1
    db.commit()
    for tc in all_cases:
        db.refresh(tc)

    # Create a few historical runs with executed results so analytics has data
    for i in range(4):
        run = models.TestRun(
            name=f"Regression Run #{i + 1}",
            status=models.RunStatus.completed,
            created_by=user.id,
            workspace_id=workspace.id,
            created_at=datetime.utcnow() - timedelta(days=(4 - i) * 3),
        )
        db.add(run)
        db.flush()
        for tc in all_cases:
            outcome = random.choices(
                [models.ItemStatus.passed, models.ItemStatus.failed, models.ItemStatus.blocked],
                weights=[0.75, 0.18, 0.07],
            )[0]
            db.add(
                models.RunItem(
                    run_id=run.id,
                    test_case_id=tc.id,
                    status=outcome,
                    notes="" if outcome == models.ItemStatus.passed else "Investigate on next run.",
                    executed_at=run.created_at,
                    executed_by=user.id,
                )
            )
        db.commit()

    # One fresh, still-open run for the demo to interact with
    open_run = models.TestRun(name="Sprint 24 Smoke Test", created_by=user.id, workspace_id=workspace.id)
    db.add(open_run)
    db.flush()
    for tc in all_cases[:6]:
        db.add(models.RunItem(run_id=open_run.id, test_case_id=tc.id))
    db.commit()

    print("Seeded demo suites, test cases and test runs.")
else:
    print("Suites already exist, skipping demo data seeding.")

db.close()
