from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, ConfigDict, Field

from .models import UserRole, Priority, RunStatus, ItemStatus


# ---------- Auth / Users ----------

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    invite_token: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(default=None, min_length=6)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    is_active: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)


class WorkspaceOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    member_count: int = 0


class WorkspaceMemberOut(BaseModel):
    user_id: int
    full_name: str
    email: EmailStr
    role: UserRole
    assigned: bool


class WorkspaceAssignment(BaseModel):
    assigned: bool


# ---------- Suites ----------

class SuiteBase(BaseModel):
    name: str
    description: Optional[str] = ""


class SuiteCreate(SuiteBase):
    pass


class SuiteUpdate(SuiteBase):
    pass


class SuiteOut(SuiteBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    test_case_count: int = 0


# ---------- Test Cases ----------

class TestCaseBase(BaseModel):
    title: str
    suite_id: int
    preconditions: Optional[str] = ""
    steps: Optional[str] = ""
    expected_result: Optional[str] = ""
    priority: Priority = Priority.medium
    is_automated: bool = False


class TestCaseCreate(TestCaseBase):
    pass


class TestCaseUpdate(TestCaseBase):
    pass


class TestCaseOut(TestCaseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    created_at: datetime
    suite_name: Optional[str] = None


# ---------- Test Runs ----------

class TestRunCreate(BaseModel):
    name: str
    test_case_ids: List[int]


class RunItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    test_case_id: int
    status: ItemStatus
    notes: Optional[str] = ""
    executed_at: Optional[datetime] = None
    test_case_code: Optional[str] = None
    test_case_title: Optional[str] = None
    priority: Optional[Priority] = None


class RunItemUpdate(BaseModel):
    status: ItemStatus
    notes: Optional[str] = ""


class TestRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    status: RunStatus
    created_at: datetime
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    total: int = 0
    passed: int = 0
    failed: int = 0
    blocked: int = 0
    skipped: int = 0
    pending: int = 0


class TestRunDetailOut(TestRunOut):
    items: List[RunItemOut] = []


# ---------- Analytics ----------

class OverviewOut(BaseModel):
    total_test_cases: int
    total_suites: int
    total_runs: int
    overall_pass_rate: float
    active_run_count: int


class SuiteHealthOut(BaseModel):
    suite_name: str
    total_executions: int
    pass_rate: float


class RunTrendPoint(BaseModel):
    run_name: str
    created_at: datetime
    pass_rate: float


class FlakyTestOut(BaseModel):
    code: str
    title: str
    pass_count: int
    fail_count: int
    total_runs: int


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserStatusUpdate(BaseModel):
    is_active: bool


class InvitationCreate(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.tester


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    role: UserRole
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    token: Optional[str] = None


class WorkspaceSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    require_invite: bool
    default_priority: Priority
    automation_webhook_url: str = ""


class WorkspaceSettingsUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    require_invite: bool
    default_priority: Priority
    automation_webhook_url: str = Field(default="", max_length=500)


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ApiKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    key_prefix: str
    created_at: datetime
    revoked_at: Optional[datetime] = None
    token: Optional[str] = None


class AutomationResult(BaseModel):
    run_item_id: int
    status: ItemStatus
    notes: Optional[str] = ""
