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

The project is organized into four two-week sprints.

Each sprint must produce a verifiable deliverable. Development tasks may begin before their target sprint when dependencies are ready.

Frontend responsibilities are divided by complete features. Camilo and Nikita each implement, integrate, and test their assigned pages.

### Sprint 1 — Project Foundation

**Weeks 1–2**

**Goal:** Establish a working development environment and the initial application structure.

#### Ian — Infrastructure and Coordination
- Configure Docker Compose for frontend, backend, and PostgreSQL.
- Define environment variables in `.env.example`.
- Configure initial GitHub Actions workflows.
- Maintain project documentation.
- Verify that all services can start locally.

#### Camilo — Frontend Initialization
- Initialize React, TypeScript, and Vite.
- Configure Tailwind CSS.
- Install and configure React Router.
- Create the agreed role-based directory structure.
- Implement basic application layouts and navigation.
- Create initial login and registration pages with client-side validation.
- Document frontend installation and development commands.

#### Nikita — Public Frontend Pages
- Develop the Home page.
- Develop the business catalog page.
- Develop the business details page.
- Create reusable components required by these pages.
- Use mock data until the corresponding backend endpoints are available.
- Follow the shared frontend conventions established by Camilo.

#### Mohamed — Backend Initialization
- Initialize Bun and ElysiaJS.
- Configure PostgreSQL connectivity through Drizzle ORM.
- Implement initial database schemas and migrations.
- Create a health-check endpoint.
- Configure backend environment variables.
- Verify database connectivity and migration execution.

**Acceptance Criteria:**
- Docker Compose starts the application services.
- The backend responds to a health-check request.
- PostgreSQL is accessible from the backend.
- Database migrations execute successfully.
- The frontend starts and supports navigation between initial pages.
- Initial frontend pages render correctly.
- GitHub Actions runs initial automated checks.

**Deliverable:** A reproducible local development environment with functional frontend and backend foundations.

### Sprint 2 — Authentication and Business Management

**Weeks 3–4**

**Goal:** Implement working authentication and allow approved businesses to publish services.

#### Ian — Integration and CI
- Verify frontend/backend communication.
- Extend CI with available build, type-checking, and test commands.
- Support integration troubleshooting.
- Review API contract consistency.

#### Camilo — Authentication
- Connect registration and login pages to the backend.
- Implement authentication state and logout.
- Implement protected routes.
- Handle authentication errors and loading states.
- Test customer and business-owner authentication flows.

#### Nikita — Business Management
- Connect the public catalog and business details pages to the API.
- Implement business registration and profile pages.
- Implement service creation, editing, and deactivation interfaces.
- Implement a minimal administrative business-approval page.
- Integrate assigned pages with the corresponding API endpoints.

#### Mohamed — Authentication and Business API
- Implement registration, login, logout, and session handling.
- Implement role-based authorization.
- Implement business registration and administrative approval.
- Implement public business and service endpoints.
- Implement service management endpoints.
- Begin implementing recurring schedules and availability calculations.
- Add tests for authentication and permissions.

**Acceptance Criteria:**
- Customers and business owners can register and log in.
- Protected endpoints reject unauthorized requests.
- A business owner can submit a business for approval.
- An administrator can approve or reject a business.
- An approved business can create and manage services.
- Published services appear in the public catalog.
- Frontend pages use real API responses.

**Deliverable:** Functional authentication, business approval, service management, and public catalog integration.

### Sprint 3 — Appointment Booking

**Weeks 5–6**

**Goal:** Complete the main booking workflow with correct availability and capacity management.

#### Ian — Integration and Testing
- Coordinate end-to-end booking integration.
- Prepare concurrency and capacity test scenarios.
- Support backend troubleshooting.
- Verify booking flows across user roles.

#### Camilo — Customer and Business Reservations
- Implement appointment slot selection.
- Implement booking request submission.
- Implement customer booking history.
- Implement pending-request withdrawal and cancellation.
- Implement business booking approval and rejection interfaces.
- Implement business booking cancellation.
- Integrate all assigned pages with the backend.

#### Nikita — Availability Management
- Implement recurring schedule management.
- Implement availability exception management.
- Implement external capacity-block management.
- Integrate these features with the backend.
- Test schedule changes and availability updates.

#### Mohamed — Booking API
- Complete availability calculation.
- Implement transactional booking creation.
- Implement pending booking expiration.
- Implement booking approval and rejection.
- Implement customer and business cancellation rules.
- Implement external capacity blocks.
- Enforce independent service capacity.
- Prevent concurrent overbooking.
- Add tests for booking state transitions and capacity.

**Acceptance Criteria:**
- Customers can view available appointment slots.
- Customers can submit booking requests.
- Pending requests reserve capacity.
- Business owners can approve or reject requests.
- Customers and businesses can cancel according to their deadlines.
- External capacity blocks affect availability.
- Expired requests no longer occupy capacity.
- Concurrent requests cannot exceed service capacity.

**Deliverable:** A functional end-to-end appointment booking system.

### Sprint 4 — Administration, Testing and Delivery

**Weeks 7–8**

**Goal:** Complete administrative functionality, stabilize the application, and prepare the final demonstration.

#### Ian — Final Integration and Delivery
- Coordinate complete system testing.
- Verify Docker Compose and environment configuration.
- Verify GitHub Actions workflows.
- Update technical documentation.
- Prepare demonstration scenarios.
- Coordinate critical bug fixes.

#### Camilo — Authentication and Booking Quality
- Fix authentication and reservation interface defects.
- Improve loading, validation, and error handling.
- Test complete customer booking workflows.
- Test business booking management workflows.
- Support final frontend integration.

#### Nikita — Administration and Statistics
- Implement administrative dashboard pages.
- Implement user, business, and booking oversight interfaces.
- Implement administrative booking cancellation.
- Implement business and platform statistics interfaces.
- Integrate administrative audit views.
- Test assigned features and fix UI defects.

#### Mohamed — Administration and Backend Quality
- Implement administrative booking oversight.
- Implement administrative cancellation and audit logging.
- Implement business and platform statistics endpoints.
- Complete backend tests.
- Fix critical backend defects.
- Verify database migrations and data integrity.

**Acceptance Criteria:**
- Administrators can inspect users, businesses, and bookings.
- Administrators can cancel problematic bookings with recorded reasons.
- Business and platform statistics are available.
- Critical booking and authorization tests pass.
- Frontend and backend integrations function correctly.
- Docker Compose starts the complete application.
- GitHub Actions checks pass.
- The MVP can be demonstrated locally.

**Deliverable:** A tested, documented, and demonstrable BookFlow MVP.

### 7.1 Sprint Execution Rules

- Tasks must be tracked through GitHub Issues.
- Every Issue must have an owner, sprint, and acceptance criteria.
- Dependencies must be identified before implementation.
- Developers may use mock data when backend endpoints are not ready.
- Mock data must be replaced by real API integration before a feature is considered complete.
- Shared frontend changes must be coordinated between Camilo and Nikita.
- Critical backend functionality should be implemented and tested as early as possible.
- Unfinished tasks must be reviewed and rescheduled rather than automatically marked complete.
- Sprint deliverables must be verified before closing the sprint.

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
