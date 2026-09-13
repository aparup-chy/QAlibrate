from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, ensure_legacy_schema
from .config import settings
from .routers import auth, suites, test_cases, test_runs, analytics, users, workspace, automation

Base.metadata.create_all(bind=engine)
ensure_legacy_schema()

app = FastAPI(
    title="QAlibrate API",
    description="API for managing test suites, test cases, test runs and QA analytics.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(suites.router)
app.include_router(test_cases.router)
app.include_router(test_runs.router)
app.include_router(analytics.router)
app.include_router(users.router)
app.include_router(workspace.router)
app.include_router(automation.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "QA Test Case Manager API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
