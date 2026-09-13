import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum, UniqueConstraint
)
from sqlalchemy.orm import relationship

from .database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    tester = "tester"


class Priority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class RunStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"


class ItemStatus(str, enum.Enum):
    pending = "pending"
    passed = "passed"
    failed = "failed"
    blocked = "blocked"
    skipped = "skipped"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.tester, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    suites = relationship("Suite", back_populates="created_by_user")
    test_cases = relationship("TestCase", back_populates="created_by_user")
    test_runs = relationship("TestRun", back_populates="created_by_user")
    invitations = relationship("Invitation", back_populates="created_by_user")
    api_keys = relationship("ApiKey", back_populates="created_by_user")
    password_reset_otps = relationship("PasswordResetOtp", back_populates="user", cascade="all, delete-orphan")
    workspace_memberships = relationship("WorkspaceMember", back_populates="user", cascade="all, delete-orphan")


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    memberships = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    suites = relationship("Suite", back_populates="workspace")
    settings = relationship("WorkspaceSettings", back_populates="workspace", uselist=False, cascade="all, delete-orphan")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    __table_args__ = (UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),)

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="memberships")
    user = relationship("User", back_populates="workspace_memberships")


class PasswordResetOtp(Base):
    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    otp_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="password_reset_otps")


class Suite(Base):
    __tablename__ = "suites"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)

    created_by_user = relationship("User", back_populates="suites")
    workspace = relationship("Workspace", back_populates="suites")
    test_cases = relationship(
        "TestCase", back_populates="suite", cascade="all, delete-orphan"
    )


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    suite_id = Column(Integer, ForeignKey("suites.id"))
    title = Column(String(255), nullable=False)
    preconditions = Column(Text, default="")
    steps = Column(Text, default="")
    expected_result = Column(Text, default="")
    priority = Column(Enum(Priority), default=Priority.medium, nullable=False)
    is_automated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)

    suite = relationship("Suite", back_populates="test_cases")
    created_by_user = relationship("User", back_populates="test_cases")
    run_items = relationship("RunItem", back_populates="test_case")


class TestRun(Base):
    __tablename__ = "test_runs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    status = Column(Enum(RunStatus), default=RunStatus.in_progress, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)

    created_by_user = relationship("User", back_populates="test_runs")
    items = relationship(
        "RunItem", back_populates="run", cascade="all, delete-orphan"
    )


class RunItem(Base):
    __tablename__ = "run_items"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("test_runs.id"))
    test_case_id = Column(Integer, ForeignKey("test_cases.id"))
    status = Column(Enum(ItemStatus), default=ItemStatus.pending, nullable=False)
    notes = Column(Text, default="")
    executed_at = Column(DateTime, nullable=True)
    executed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    run = relationship("TestRun", back_populates="items")
    test_case = relationship("TestCase", back_populates="run_items")


class WorkspaceSettings(Base):
    __tablename__ = "workspace_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, unique=True, index=True)
    name = Column(String(150), nullable=False, default="QAlibrate Workspace")
    require_invite = Column(Boolean, default=False, nullable=False)
    default_priority = Column(Enum(Priority), default=Priority.medium, nullable=False)
    automation_webhook_url = Column(String(500), default="")

    workspace = relationship("Workspace", back_populates="settings")


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), nullable=False, index=True)
    token = Column(String(128), unique=True, nullable=False, index=True)
    role = Column(Enum(UserRole), default=UserRole.tester, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)

    created_by_user = relationship("User", back_populates="invitations")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    key_prefix = Column(String(16), nullable=False)
    hashed_key = Column(String(255), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)

    created_by_user = relationship("User", back_populates="api_keys")
