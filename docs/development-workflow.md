# BookFlow — Development Workflow

**Project:** BookFlow  
**Duration:** 8 weeks  
**Methodology:** Agile development  
**Sprint duration:** 2 weeks  
**Repository:** https://github.com/bookflow-team/bookflow

## 1. Project Organization

BookFlow is developed by a four-member software engineering team.

The team uses:

- GitHub for source code and collaboration.
- GitHub Issues for individual tasks.
- GitHub Projects for sprint planning.
- Pull Requests for code review.
- GitHub Actions for automated checks.
- Docker Compose for local development.

The main objective is to deliver a functional MVP within four sprints.

Development is organized into frontend, backend, infrastructure, and integration activities. Each team member is responsible for completing and testing their assigned tasks.

## 2. Team Structure and Responsibilities

| Member | Primary Role | Area |
|---|---|---|
| Ian | Project Coordinator & DevOps Developer | Coordination, infrastructure, documentation, integration and backend support |
| Camilo | Frontend Developer | Assigned frontend pages, components and API integration |
| Nikita | Frontend Developer | Assigned frontend pages, components and API integration |
| Mohamed | Backend Developer | Backend API, database and business logic |

### 2.1 Ian — Project Coordination, DevOps & Integration

Primary responsibilities:

- Coordinate project planning and development activities.
- Maintain technical documentation and GitHub Projects.
- Organize GitHub Issues, sprints and task assignments.
- Configure and maintain Docker Compose.
- Implement GitHub Actions CI workflows.
- Coordinate integration between frontend and backend.
- Support Mohamed with backend implementation and troubleshooting when necessary.
- Monitor project progress and resolve organizational blockers.
- Coordinate testing and prepare the final demonstration.

Ian is responsible for technical coordination and infrastructure but does not replace the individual responsibilities of other developers.

### 2.2 Camilo — Frontend Development

Primary responsibilities:

- Develop assigned frontend pages and features using React and TypeScript.
- Implement the required UI components and responsive layouts.
- Use Tailwind CSS for styling.
- Implement client-side logic for assigned features.
- Connect assigned pages directly to the corresponding backend API endpoints.
- Implement loading, validation and error states.
- Test the functionality of assigned pages.
- Coordinate shared components and frontend conventions with Nikita.

### 2.3 Nikita — Frontend Development

Primary responsibilities:

- Develop assigned frontend pages and features using React and TypeScript.
- Implement the required UI components and responsive layouts.
- Use Tailwind CSS for styling.
- Implement client-side logic for assigned features.
- Connect assigned pages directly to the corresponding backend API endpoints.
- Implement loading, validation and error states.
- Test the functionality of assigned pages.
- Coordinate shared components and frontend conventions with Camilo.

### 2.4 Frontend Task Distribution

Camilo and Nikita have equivalent technical responsibilities as frontend developers.

Frontend work is divided by complete features and application pages. Each developer is responsible for implementing the interface, client-side logic, API integration, and testing of their assigned features.

The frontend codebase is organized by application area and user role, not by developer.

#### Camilo — Core User Flows

Camilo is responsible for frontend features that require frequent backend interaction, iterative testing, and coordination.

Assigned features:

**Authentication**
- Login page.
- Registration page.
- Authentication state and session handling.
- Protected route integration.

**Customer**
- Appointment booking interface.
- Service time-slot selection.
- Customer appointment history.
- Booking cancellation and pending-request withdrawal.

**Business**
- Business reservation management.
- Booking approval and rejection interfaces.
- Business booking cancellation.

#### Nikita — Business and Administration Features

Nikita is responsible for complete frontend features with clearly defined interfaces and API contracts.

Assigned features:

**Public**
- Home page.
- Business catalog and search.
- Business details and service listings.

**Business**
- Business dashboard.
- Business profile and registration interface.
- Service creation and management.
- Schedule and availability management.
- External capacity-block management.
- Business statistics interface.

**Administration**
- Administrative dashboard.
- Business approval and rejection interface.
- User and business oversight.
- Reservation oversight and administrative cancellation.
- Administrative statistics and audit views.

#### Shared Frontend Responsibilities

Both developers must:

- Use React, TypeScript, Vite, and Tailwind CSS.
- Implement and integrate their own assigned pages.
- Follow the shared frontend architecture.
- Reuse common components and API utilities.
- Coordinate shared routing and authentication requirements.
- Handle loading, validation, and error states.
- Test assigned features before submitting Pull Requests.

Camilo maintains the initial shared authentication integration, while Nikita uses the agreed authentication utilities in his assigned pages.

Shared changes affecting both developers must be coordinated before implementation.

Feature assignments may be adjusted during sprint planning if necessary.

### 2.5 Mohamed — Backend Development

Primary responsibilities:

- Configure and maintain the Bun and ElysiaJS backend.
- Design PostgreSQL schemas using Drizzle ORM.
- Implement database migrations.
- Develop authentication and role-based authorization.
- Implement business and service management endpoints.
- Implement availability and booking logic.
- Enforce cancellation deadlines and booking state transitions.
- Prevent overbooking through transactional capacity checks.
- Implement external capacity blocks.
- Develop administrative functionality and statistics.
- Write backend tests.
- Coordinate API contracts with the frontend developers and Ian.

### 2.6 Shared Responsibilities

All team members are expected to:

- Participate in technical discussions and planning.
- Maintain their assigned GitHub Issues.
- Submit changes through Pull Requests.
- Review teammates' contributions when appropriate.
- Report blockers and integration problems.
- Follow the agreed technical architecture.
- Contribute to testing and final project delivery.

Task ownership may be adjusted according to project priorities and team availability.

## 3. Technology and Development Conventions

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Fetch API

### Backend

- Bun
- ElysiaJS
- Zod
- Drizzle ORM
- PostgreSQL

### Infrastructure

- Docker
- Docker Compose
- GitHub Actions

All developers must follow the documented architecture and API contract.

Shared frontend components should be reused instead of duplicated.

Backend business rules must not be implemented exclusively in the frontend.

## 4. Git Branching Strategy

The `main` branch contains reviewed and approved changes.

Developers must create a separate branch for each task or closely related group of changes.

Recommended branch names:

- `feat/customer-auth-pages`
- `feat/business-dashboard`
- `feat/booking-api`
- `feat/service-management`
- `fix/availability-calculation`
- `docs/api-contract`
- `chore/docker-compose`

Direct changes to `main` are not allowed.

Developers should synchronize their feature branches with the latest approved changes before integration.

## 5. Pull Request Workflow

1. Create or select a GitHub Issue.
2. Assign the Issue to a developer.
3. Create a feature branch.
4. Implement the requested functionality.
5. Run relevant local checks.
6. Open a Pull Request targeting `main`.
7. Link the corresponding Issue.
8. Request a review from another team member.
9. Address review comments.
10. Merge after approval and required checks.
11. Update the Issue and project board.

At least one approving review is required.

Developers must not approve their own Pull Requests.

Small, focused Pull Requests are preferred.

Approximately 700 changed lines per code delivery is a guideline. Documentation, generated files and justified exceptions may exceed this amount.

Frontend Pull Requests should include the relevant page functionality and API integration whenever the corresponding backend endpoint is available.

## 6. GitHub Projects Workflow

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

Frontend Issues should normally assign complete pages or features to Camilo or Nikita, including their integration responsibilities.

Backend Issues should identify the endpoints or business rules that must be implemented.

Infrastructure and coordination Issues should be assigned to Ian.

## 7. Sprint Planning

The project consists of four two-week sprints.

### Sprint 1 — Project Foundation

**Weeks 1–2**

Objectives:

- Confirm MVP requirements.
- Complete architecture and API documentation.
- Configure React, TypeScript, Vite and Tailwind CSS.
- Configure Bun, ElysiaJS and PostgreSQL.
- Define initial Drizzle ORM schemas.
- Configure Docker Compose.
- Configure initial GitHub Actions workflows.
- Establish the frontend and backend project structures.
- Agree on frontend conventions and reusable components.

Responsibilities:

- **Ian:** Documentation, Docker Compose, CI and repository coordination.
- **Camilo:** Frontend foundation and assigned initial components or pages.
- **Nikita:** Frontend foundation and assigned initial components or pages.
- **Mohamed:** Backend foundation, database configuration and initial schemas.

**Deliverable:** The frontend, backend and database services start locally, with a working project structure.

### Sprint 2 — Authentication and Business Management

**Weeks 3–4**

Objectives:

- Implement registration and login.
- Implement role-based authorization.
- Implement business registration and administrative approval.
- Implement business and service management.
- Implement recurring schedules and availability exceptions.
- Develop the public business catalog.
- Connect completed frontend pages to the corresponding backend endpoints.

Responsibilities:

- **Ian:** Integration support, infrastructure maintenance and progress coordination.
- **Camilo:** Assigned authentication, catalog or business-management frontend features, including API integration.
- **Nikita:** Assigned authentication, catalog or business-management frontend features, including API integration.
- **Mohamed:** Authentication, authorization, business and service endpoints.

**Deliverable:** Users can register and log in, and approved businesses can configure and publish services.

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
- Develop and integrate customer and business reservation interfaces.

Responsibilities:

- **Ian:** Integration coordination, backend support and infrastructure verification.
- **Camilo:** Assigned booking-related frontend pages and API integration.
- **Nikita:** Assigned booking-related frontend pages and API integration.
- **Mohamed:** Booking endpoints, availability calculations, capacity protection and booking state transitions.

**Deliverable:** A functional end-to-end appointment booking flow.

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

Responsibilities:

- **Ian:** Integration testing, infrastructure verification, documentation and demonstration coordination.
- **Camilo:** Assigned administrative or statistics frontend features, UI fixes and testing.
- **Nikita:** Assigned administrative or statistics frontend features, API integration fixes and testing.
- **Mohamed:** Administrative endpoints, statistics, backend testing and bug fixes.

**Deliverable:** A tested and demonstrable BookFlow MVP.

## 8. Definition of Done

A task is considered complete when:

- The required functionality is implemented.
- Acceptance criteria are satisfied.
- Relevant tests or manual verification have been performed.
- Code follows the agreed architecture.
- No known critical bugs remain.
- Required documentation is updated.
- The Pull Request has been reviewed and merged.
- The corresponding GitHub Issue is closed or marked Done.

For frontend features, completion also requires verifying communication with the relevant backend endpoints when those endpoints are available.

## 9. Communication Rules

- Important technical decisions must be documented.
- Developers should report blockers as soon as possible.
- API changes must be communicated to both frontend developers.
- Database changes must include migrations.
- Shared frontend conventions must be respected.
- Integration issues should be discussed before making incompatible changes.
- Tasks may be reassigned when necessary to maintain progress.

## 10. Integration Strategy

Frontend and backend development may proceed in parallel.

The API contract is the shared reference between frontend and backend development.

Camilo and Nikita are individually responsible for integrating their assigned frontend features with the backend.

Frontend developers may initially use mock data while backend endpoints are under development.

Shared API utilities should be reused to maintain consistent request handling and authentication behavior.

Before completing an integrated frontend feature:

1. Confirm the implemented backend endpoint.
2. Verify request and response schemas.
3. Test successful requests.
4. Test validation and authorization errors.
5. Verify loading and error states.
6. Verify that the user interface updates correctly.

Ian coordinates integration activities and assists with cross-component issues but is not responsible for implementing every frontend integration.

## 11. Testing Strategy

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

Frontend developers must test their assigned pages and interactions.

Manual testing may be used for complete user flows and final demonstrations.

## 12. Final Delivery

The project must include:

- Functional React frontend.
- Functional ElysiaJS backend.
- PostgreSQL database and migrations.
- Docker Compose configuration.
- GitHub Actions CI.
- Technical documentation.
- Required UML diagrams.
- A reproducible local setup.
- A working MVP demonstration.

Public hosting is not required.
