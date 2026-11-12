
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

## 2. Team Structure and Responsibilities

BookFlow is developed by a four-member software engineering team.

Responsibilities are assigned according to each member's primary technical area. All members participate in planning, code reviews, testing, and integration activities.

### Ian — Project Coordination, DevOps & Integration

Primary responsibilities:
- Coordinate project planning and development activities.
- Maintain technical documentation and GitHub Projects.
- Configure Docker Compose and development infrastructure.
- Implement and maintain GitHub Actions CI workflows.
- Coordinate integration between frontend and backend.
- Support backend development and troubleshooting.
- Monitor project progress and prepare the final demonstration.

### Camilo — Frontend Development (UI)

Primary responsibilities:
- Design and implement responsive user interfaces.
- Develop reusable React components.
- Implement page layouts using Tailwind CSS.
- Develop customer-facing pages and shared UI elements.
- Collaborate with Nikita on frontend integration.
- Test frontend functionality and usability.

### Nikita — Frontend Development (Integration)

Primary responsibilities:
- Configure and maintain the React application structure.
- Implement routing using React Router.
- Integrate frontend components with REST API endpoints.
- Implement authentication state and protected routes.
- Handle API requests, loading states, and errors.
- Collaborate with Camilo on frontend development and testing.

### Mohamed — Backend Development

Primary responsibilities:
- Configure the Bun and ElysiaJS backend.
- Design and implement PostgreSQL schemas using Drizzle ORM.
- Develop authentication and role-based authorization.
- Implement business, service, and booking endpoints.
- Implement availability, capacity, and booking rules.
- Develop administrative functionality and statistics.
- Create database migrations and backend tests.
- Coordinate API contracts and integration with frontend developers.

### Shared Responsibilities

All team members are expected to:
- Participate in technical discussions and planning.
- Maintain their assigned GitHub Issues.
- Submit changes through Pull Requests.
- Review teammates' contributions when appropriate.
- Report blockers and integration problems.
- Contribute to testing and final project delivery.

Task ownership may be adjusted according to project priorities and team availability.

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
