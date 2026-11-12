
# BookFlow — Development Workflow

**Project:** BookFlow  
**Duration:** 8 weeks  
**Methodology:** Agile development  
**Sprint duration:** 2 weeks  
**Repository:** https://github.com/bookflow-team/bookflow

## 1. Project Organization

BookFlow is developed by a team of four students.

The team uses:
- GitHub for source code and collaboration.
- GitHub Issues for individual tasks.
- GitHub Projects for sprint planning.
- Pull Requests for code review.
- GitHub Actions for automated checks.
- Docker Compose for local development.

The main objective is to deliver a functional MVP within four sprints.

## 2. Team Responsibilities

### Coordination, DevOps and Integration — EuRuni

Responsibilities:
- Coordinate development activities.
- Maintain project documentation.
- Configure GitHub Projects and Issues.
- Configure Docker Compose.
- Implement GitHub Actions CI.
- Support backend development when necessary.
- Coordinate frontend/backend integration.
- Review integration problems and prepare the final demonstration.

### Frontend UI — Camilo

Responsibilities:
- Develop reusable interface components.
- Implement responsive page layouts.
- Apply Tailwind CSS styling.
- Implement customer-facing pages.
- Coordinate frontend components with Nikita.
- Participate in code reviews.

### Frontend Integration — Nikita

Responsibilities:
- Configure the React application.
- Implement routing and shared frontend structure.
- Integrate frontend pages with REST endpoints.
- Manage API requests and authentication state.
- Implement frontend validation and error handling.
- Coordinate page implementation with Camilo.

### Backend Development — Backend Developer

Responsibilities:
- Configure Bun and ElysiaJS.
- Implement PostgreSQL and Drizzle ORM.
- Implement authentication and authorization.
- Develop business, service and booking endpoints.
- Implement capacity and scheduling logic.
- Implement administrative endpoints.
- Create database migrations and backend tests.
- Review the API contract with the team.

Responsibilities may be adjusted according to workload and availability.

## 3. Git Branching Strategy

The `main` branch contains reviewed and approved changes.

Developers must create a separate branch for each task.

Recommended branch names:

- `feat/authentication`
- `feat/booking-api`
- `feat/customer-pages`
- `fix/availability-calculation`
- `docs/api-contract`
- `chore/docker-compose`

Direct changes to `main` are not allowed.

## 4. Pull Request Workflow

1. Create or select a GitHub Issue.
2. Assign the Issue to a developer.
3. Create a feature branch.
4. Implement the requested changes.
5. Run relevant local checks.
6. Open a Pull Request targeting `main`.
7. Link the corresponding Issue.
8. Request a review from another team member.
9. Address review comments.
10. Merge after approval and required checks.
11. Update the Issue and project board.

At least one approving review is required.

Developers must not approve their own Pull Requests.

Small Pull Requests are preferred.

Approximately 700 changed lines per code delivery is a guideline. Documentation, generated files, and justified exceptions may exceed this amount.

## 5. GitHub Projects Workflow

The project board uses the following statuses:

| Status | Meaning |
|---|---|
| Backlog | Planned work not yet scheduled |
| To do | Ready to begin |
| In Progress | Currently being developed |
| In Review | Pull Request awaiting review |
| Done | Completed and merged |

Every development Issue should include:
- A descriptive title.
- A clear task description.
- Acceptance criteria.
- An assignee.
- A sprint.
- Relevant labels.

Issues should be moved through the board as work progresses.

## 6. Sprint Planning

### Sprint 1 — Project Foundation

**Weeks 1–2**

Objectives:
- Confirm MVP requirements.
- Complete architecture and API documentation.
- Configure React, TypeScript, Vite and Tailwind CSS.
- Configure Bun, ElysiaJS and PostgreSQL.
- Define Drizzle ORM schemas.
- Configure Docker Compose.
- Configure initial GitHub Actions workflows.
- Establish the basic frontend and backend structure.

Deliverable:
- Project starts locally with the initial frontend, backend and database services.

### Sprint 2 — Authentication and Business Management

**Weeks 3–4**

Objectives:
- Implement registration and login.
- Implement role-based authorization.
- Implement business registration and approval.
- Implement business and service management.
- Implement recurring schedules and availability exceptions.
- Develop the public business catalog.
- Integrate the initial frontend pages with the API.

Deliverable:
- Users can register and log in; approved businesses can configure and publish services.

### Sprint 3 — Booking System

**Weeks 5–6**

Objectives:
- Implement appointment availability calculations.
- Implement booking requests.
- Implement manual booking approval and rejection.
- Implement booking expiration.
- Implement cancellation rules.
- Implement external capacity blocks.
- Prevent concurrent overbooking.
- Integrate customer and business reservation interfaces.

Deliverable:
- A functional end-to-end appointment booking flow.

### Sprint 4 — Administration, Testing and Delivery

**Weeks 7–8**

Objectives:
- Implement administrative booking oversight.
- Implement administrative audit logging.
- Implement basic business statistics.
- Complete remaining frontend/backend integration.
- Test authentication, authorization and booking rules.
- Fix critical bugs.
- Verify Docker Compose setup.
- Verify GitHub Actions checks.
- Prepare the final demonstration and documentation.

Deliverable:
- A tested and demonstrable BookFlow MVP.

## 7. Definition of Done

A task is considered complete when:

- The required functionality is implemented.
- Acceptance criteria are satisfied.
- Relevant tests or manual verification have been performed.
- Code follows the agreed architecture.
- No known critical bugs remain.
- Required documentation is updated.
- The Pull Request has been reviewed and merged.
- The corresponding GitHub Issue is closed or marked Done.

## 8. Communication Rules

- Important technical decisions must be documented.
- Developers should report blockers as soon as possible.
- API changes must be communicated to frontend developers.
- Database changes must include migrations.
- Integration issues should be discussed before making incompatible changes.
- Tasks may be reassigned when necessary to maintain progress.

## 9. Integration Strategy

Frontend and backend development may proceed in parallel.

The API contract is the shared reference between both teams.

Frontend developers may initially use mock data while backend endpoints are under development.

Before completing an integration task:
1. Confirm the implemented endpoint.
2. Verify request and response schemas.
3. Test successful requests.
4. Test validation and authorization errors.
5. Verify the user interface updates correctly.

## 10. Testing Strategy

Testing priorities:

- Authentication and authorization.
- Business approval.
- Service creation and management.
- Schedule and availability calculations.
- Booking state transitions.
- Cancellation deadlines.
- Concurrent booking capacity.
- External capacity blocks.
- Administrative permissions.
- End-to-end user workflows.

Automated tests should focus on critical backend business rules.

Manual testing may be used for frontend flows and final demonstrations.

## 11. Final Delivery

The project must include:

- Functional frontend.
- Functional backend.
- PostgreSQL database and migrations.
- Docker Compose configuration.
- GitHub Actions CI.
- Technical documentation.
- Required UML diagrams.
- A reproducible local setup.
- A working MVP demonstration.

Public hosting is not required.
