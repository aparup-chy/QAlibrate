# QAlibrate

QAlibrate is a web-based software quality assurance and test management platform. It helps QA teams organize test suites, write and maintain test cases, create execution runs, record outcomes, and monitor quality trends from one workspace-aware application.

The project is designed for teams that need a practical system between spreadsheets and large enterprise test management suites. It provides a focused workflow for planning, executing, reviewing, and improving software testing.

## Project Goals

QAlibrate is built to:

- Centralize test cases, suites, execution history, and QA analytics.
- Make test execution status visible to QA leads, developers, product owners, and managers.
- Separate test data by workspace so different products, teams, or projects can operate independently.
- Give administrators control over users, roles, workspace membership, and account status.
- Support both manual and automated test cases.
- Reduce duplicated, outdated, or untraceable testing information.
- Create a foundation for measurable and repeatable software quality practices.

## Core Features

### Authentication and account management

- User registration and login using email and password.
- JWT-based authentication.
- Password reset flow with one-time passcodes and optional SMTP delivery.
- Role-based access with administrator and tester roles.
- Account activation and deactivation by administrators.
- Deactivated members are blocked during login and receive a clear access message.
- Profile updates and password changes.

### Workspace management

- Multiple workspaces for separate products, teams, or projects.
- Workspace-specific suites, test cases, test runs, settings, members, invitations, and API keys.
- Administrators can create and delete workspaces.
- Administrators can assign or remove members from individual workspaces.
- Member removal requires confirmation.
- Administrators can select one workspace, multiple workspaces, or all workspaces for read-only reporting views.
- Non-administrator members only see workspaces to which they are assigned.

### Test suite and test case management

- Create, edit, view, and delete test suites.
- Create, edit, search, filter, and delete test cases.
- Test case fields include:
  - Unique test case code
  - Title
  - Preconditions
  - Steps
  - Expected result
  - Priority
  - Manual or automated classification
  - Parent suite
- Filter test cases by suite, priority, and search text.

### Test execution

- Create test runs from selected test cases.
- Filter test cases by suite while creating a run.
- Track pending, passed, failed, blocked, and skipped results.
- Add execution notes and timestamps.
- Prevent changes to completed runs.
- Display progress summaries for each run.
- Support API-driven result updates through workspace API keys.

### Dashboards and analytics

- Dashboard overview for total test cases, suites, runs, pass rate, and active runs.
- Recent execution history.
- Pass-rate trend charts.
- Suite health reporting.
- Flaky test detection based on mixed pass and fail results.
- CSV report export for administrator users.
- Workspace-aware reporting so selected workspace data is not mixed with unrelated workspace data.

### Administration

- View and manage team members.
- Change member roles.
- Activate or deactivate accounts.
- Manage workspace membership.
- Create and revoke workspace API keys.
- Configure workspace policies and default priorities.
- Configure an automation webhook URL.

## SQA Impact

QAlibrate supports the complete test management cycle and improves Software Quality Assurance in several practical ways.

### Better test traceability

A structured record connects a test case to its suite, execution run, result, notes, and timestamp. This makes it easier to answer:

- What was tested?
- Which version or release activity did the test belong to?
- Who executed the test?
- What failed and what evidence was recorded?
- Which areas have not been tested recently?

### Higher test consistency

Reusable suites and test cases reduce variation in how testers execute the same feature. Defined preconditions, steps, and expected results make manual testing more repeatable and easier to review.

### Faster defect discovery

Execution statuses and pass-rate trends give teams early visibility into regressions. Failed and blocked tests can be identified while a release is still in progress rather than after deployment.

### Improved regression testing

Test runs allow a team to group a repeatable set of cases for a release, sprint, feature, or regression cycle. This creates a practical baseline for comparing quality between releases.

### Visibility into unstable areas

The flaky-test report highlights test cases that have both passed and failed across executions. These tests often indicate unstable requirements, environments, data, integrations, or implementation behavior and deserve focused investigation.

### Workspace-level quality ownership

Workspace isolation supports separate products and teams without forcing them into one shared data pool. Administrators can review one workspace, compare selected workspaces, or inspect all workspaces while maintaining clear ownership boundaries.

### Stronger access governance

Role-based permissions, workspace membership, account deactivation, and API-key controls reduce the likelihood that the wrong person can modify test assets or execution data.

## Overall Project Impact

Beyond test execution, QAlibrate can improve engineering and delivery processes by making quality information accessible and actionable.

- **QA teams:** spend less time maintaining spreadsheets and more time analyzing risk and validating behavior.
- **Developers:** receive clearer reproduction context through structured steps, expected results, notes, and execution status.
- **Product owners:** gain visibility into feature readiness and regression risk.
- **Engineering managers:** can review quality trends and identify recurring problem areas.
- **Release teams:** can use execution history and pass-rate information as evidence for release decisions.
- **Organizations:** gain a consistent and auditable testing process that can scale across products or departments.

QAlibrate does not replace good test design, exploratory testing, code review, monitoring, or product discovery. It provides the shared system of record that helps those activities work together.

## Technology Stack

### Frontend

- **React 18.3** for component-based user interfaces.
- **Vite 5** for development server, module bundling, and production builds.
- **React Router 6** for client-side navigation.
- **Axios** for HTTP communication with the FastAPI API.
- **Tailwind CSS 3** for utility-first styling.
- **Recharts** for dashboard and analytics visualizations.
- **Lucide React** for interface icons.
- **PostCSS and Autoprefixer** for CSS processing and browser compatibility.

The frontend uses React context providers for authentication and workspace state. Workspace selections are persisted in browser storage and sent through request headers so the backend can apply the same scope consistently across pages.

### Backend

- **Python 3.10+** as the implementation language.
- **FastAPI 0.115** for REST API routing, dependency injection, validation, and OpenAPI documentation.
- **Uvicorn** as the ASGI server.
- **SQLAlchemy 2** for ORM-based database access and relationships.
- **PostgreSQL** as the production relational database.
- **Pydantic 2 and pydantic-settings** for request schemas and environment configuration.
- **python-jose** for JWT creation and validation.
- **Passlib with bcrypt** for password hashing and verification.
- **python-multipart** for OAuth2 form-based login input.
- **python-dotenv** for environment-file support.
- **SMTP integration** for password reset email delivery.

### Data model

The main entities are:

- Users
- Workspaces
- Workspace memberships
- Workspace settings
- Invitations
- API keys
- Suites
- Test cases
- Test runs
- Run items
- Password reset OTP records

Workspace ownership is represented through `workspace_id` relationships on workspace-owned entities. Administrative read requests can use a single workspace, a comma-separated workspace scope, or `all`. Write operations continue to require one active workspace to avoid ambiguous creates and updates.

## Architecture

```text
Browser
  |
  | React + React Router + Axios
  v
FastAPI REST API
  |
  | JWT authentication
  | Dependency-based authorization
  | Workspace scope filtering
  v
SQLAlchemy ORM
  |
  v
PostgreSQL
```

## Technology Requirements

The project is built with:

- Python 3.10 or newer
- Node.js 18 or newer
- npm
- PostgreSQL 14 or newer
- Git
- VS Code is recommended for development.


## Security and Access Control

QAlibrate uses several layers of protection:

- Passwords are stored as bcrypt hashes rather than plaintext.
- Login sessions use signed JWT access tokens.
- Inactive users are rejected during login.
- Administrator-only endpoints use explicit authorization dependencies.
- Workspace membership is checked for non-administrator users.
- Workspace-owned reads are filtered by the selected workspace scope.
- Workspace writes require one specific workspace.
- API keys are associated with a workspace and can be revoked.
- CORS origins are configured through environment settings.
- Password reset responses avoid revealing whether an email address exists.

For production use, replace development secrets, restrict CORS origins, use HTTPS, protect PostgreSQL, configure secure SMTP credentials, and add centralized audit logging.

## QA and Testing Strategy

A production rollout should validate the following areas:

### Authentication

- Valid and invalid login attempts.
- Login with a deactivated account.
- Registration and invitation acceptance.
- Password reset expiration and reuse behavior.
- Token expiration and unauthorized requests.

### Workspace isolation

- A member sees only assigned workspaces.
- Selecting one workspace shows only that workspace's data.
- Selecting multiple workspaces shows the union of only those workspaces' data.
- Selecting all workspaces shows all permitted workspace data.
- Workspace writes cannot target a different workspace accidentally.
- Deleting a workspace removes its owned data according to the configured policy.

### Test management

- Suite and test case CRUD operations.
- Search and filtering behavior.
- Cross-workspace suite and case protection.
- Test run creation with valid and invalid case selections.
- Result updates and completed-run restrictions.

### Reporting

- Dashboard totals match underlying records.
- Pass-rate calculations handle empty and pending runs.
- Trend and flaky-test results respect workspace scopes.
- CSV exports contain the correct selected workspace data.

### User experience

- Confirmation before destructive actions.
- Clear empty, loading, and error states.
- Responsive layout across desktop and mobile widths.
- Keyboard and screen-reader access for critical controls.

## Current Limitations and Future Roadmap

Potential future improvements include:

- Automated backend API tests and frontend component tests.
- End-to-end browser tests for authentication and workspace isolation.
- Database migrations managed through Alembic instead of startup compatibility logic.
- Release/version metadata on test runs.
- Defect tracker integration.
- Evidence attachments such as screenshots and logs.
- Requirement-to-test traceability.
- Scheduled regression runs.
- Richer audit logs for administrative actions.
- Pagination and server-side sorting for large datasets.
- CI/CD quality gates based on selected test-run results.
- Containerized deployment with Docker and production reverse proxy configuration.

## License

No license has been declared yet. Add a license file before publishing the repository for external reuse.

## Contact

For questions, feedback, collaboration, or project-related inquiries, contact:

- Email: [aparupchowdhury79@gmail.com](mailto:aparupchowdhury79@gmail.com)

## Project Summary

QAlibrate is a practical foundation for disciplined software testing. By combining structured test management, execution visibility, analytics, workspace isolation, and administrative control, it helps teams make quality measurable and release decisions more evidence-based.
