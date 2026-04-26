# Insurance Application

A full-stack role-based insurance management system built with Angular, Express, and MongoDB.

This project supports three business roles with separate workflows:

- Customer: browse/purchase policies, make payments, raise claims, and track status.
- Agent: review assigned policy requests and claims, then approve or reject them.
- Admin: manage policy catalog, agents, assignments, approvals, audits, and dashboards.

The backend API base path is `/api/v1`.

## Table of Contents

1. [Application Overview](#application-overview)
2. [Core Features](#core-features)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Environment Variables](#environment-variables)
7. [Local Setup (Step-by-Step)](#local-setup-step-by-step)
8. [Run with Docker Compose](#run-with-docker-compose)
9. [API Overview](#api-overview)
10. [Deployment (Vercel)](#deployment-vercel)
11. [Verification Checklist](#verification-checklist)
12. [Troubleshooting](#troubleshooting)
13. [Security Notes](#security-notes)

## Application Overview

The Insurance Application is designed to digitalize policy lifecycle operations:

- Product and policy definition by admins.
- Policy onboarding and approval flow through agents/admins.
- Payment collection and tracking.
- Claim creation, review, and resolution.

The frontend is a single-page Angular application. It communicates with an Express API that persists data in MongoDB via Mongoose models.

## Core Features

### User and Access Management

- User registration and login.
- Role-aware route handling and authorization.
- JWT-based authentication in API flows.

### Customer Features

- View available policy products.
- Purchase policy.
- Make premium payments.
- View payment history and owned policies.
- Raise and track claims.
- Cancel policy requests.

### Agent Features

- Login as agent.
- View assigned policy products and customer mappings.
- Approve/reject policy requests.
- View assigned claims and process claim decisions.
- Track assigned payment-related data and dashboard metrics.

### Admin Features

- Create/update/delete policy products.
- Create/update/delete agent accounts.
- Assign/unassign policy products to agents.
- Approve/reject policy and claim workflows.
- View customers, claims, payments, and audit logs.
- Access summary KPI and DB status endpoints.

## Architecture

Request flow:

1. Angular frontend sends HTTP requests to backend API.
2. Express routes apply auth middleware (role based) where required.
3. Controllers implement business logic.
4. Mongoose models persist and query data in MongoDB.
5. Response is returned as JSON to the frontend.

Backend CORS allows:

- Explicit frontend origins from environment variables.
- Localhost/127.0.0.1 origins for local development.
- Vercel preview/production style origins.

## Tech Stack

- Frontend: Angular 20, RxJS, Tailwind CSS, Font Awesome.
- Backend: Node.js, Express 5, Mongoose, Joi, JWT, bcryptjs.
- Database: MongoDB (local or Atlas).
- Deployment: Vercel (separate frontend/backend projects).
- Containers: Docker + Docker Compose.

## Project Structure

```text
Insurance-Application/
	backend/
		api/index.js                # Vercel serverless entry
		src/
			app.js                    # Express app + CORS + route mount
			index.js                  # Local server bootstrap
			config/db.js              # MongoDB connection
			controllers/              # Business logic
			middleware/               # Auth/role middleware
			models/                   # Mongoose schemas
			routes/                   # API route modules
	frontend/
		src/
			app/components/           # Role-specific UI screens
			app/services/             # API service wrappers
			app/guards/               # Route guards
			environments/             # API environment targets
	docker-compose.yml
```

## Environment Variables

Create `backend/.env` from `backend/.env.example`.

Required for backend runtime:

```dotenv
PORT=8000
MONGODB_URL=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret_key>
FRONTEND_URL=<frontend_origin>
FRONTEND_PREVIEW_URL=<optional_preview_origin>
```

Notes:

- `MONGODB_URL` is mandatory. App startup fails if missing.
- `FRONTEND_URL` should be an origin only, for example `http://localhost:4200`.
- Do not commit real secrets. `.env` is gitignored.

## Local Setup (Step-by-Step)

### Prerequisites

1. Node.js 22+.
2. npm.
3. MongoDB running locally or a MongoDB Atlas connection string.
4. Git.

### 1) Clone and install backend

```powershell
git clone <your-repo-url>
cd Insurance-Application/backend
npm install
```

### 2) Configure backend environment

```powershell
copy .env.example .env
```

Edit `backend/.env` and provide real values.

Examples:

- Local MongoDB:

```dotenv
MONGODB_URL=mongodb://127.0.0.1:27017/insurance_application
```

- MongoDB Atlas:

```dotenv
MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
```

### 3) Start backend

```powershell
npm run dev
```

Expected log:

- `Connected to MongoDB`
- `Server is ready at http://localhost:8000/api/v1`

Health check:

```powershell
curl http://localhost:8000/api/v1/health
```

Expected response:

```json
{"ok":true}
```

### 4) Install and start frontend

Open a second terminal:

```powershell
cd ../frontend
npm install
npm start
```

Frontend default local URL:

- `http://localhost:4200`

### 5) Verify frontend API target

For local dev, confirm:

- `frontend/src/environments/environment.ts`
- `frontend/src/environments/environment.development.ts`

Both should point to:

```ts
apiUrl: 'http://localhost:8000/api/v1'
```

## Run with Docker Compose

From repository root:

```powershell
docker-compose up --build
```

Services:

- MongoDB: `localhost:27017`
- Backend: `localhost:8000`
- Frontend (nginx): `localhost:8080`

Important:

- `docker-compose.yml` passes `MONGODB_URL` and `JWT_SECRET` from host environment.
- Define those in your shell or an `.env` file in the project root before running compose.

## API Overview

Base URL (local):

- `http://localhost:8000/api/v1`

Health endpoint:

- `GET /health`

Primary route groups:

- User auth and role updates: `/users/*`
- Admin operations: `/admin/*`
- Agent operations: `/agents/*`
- Customer operations: `/customers/*`

### Endpoint Reference by Role

Auth notes:

- Public means no auth middleware on the route.
- Protected means JWT plus role-based middleware is required.

#### Health

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | /health | Public | API liveness check. |

#### User Routes (`/users`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | /users/register | Public | Register a new user account. |
| POST | /users/login | Public | Login user and issue auth token. |
| PATCH | /users/update-role | Public | Update user role mapping. |

#### Admin Routes (`/admin`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | /admin/addpolicies | Public | Create a new policy product. |
| GET | /admin/getpolicies | Protected (Admin) | Get all policy products. |
| PUT | /admin/updatepolicies/:id | Protected (Admin) | Update policy product by id. |
| DELETE | /admin/deletepolicies/:id | Protected (Admin) | Delete policy product by id. |
| GET | /admin/userpolicies | Protected (Admin) | View all user policy records. |
| GET | /admin/payments | Protected (Admin) | View all payment records. |
| POST | /admin/createagent | Protected (Admin) | Create an agent account. |
| PUT | /admin/updateagent/:id | Protected (Admin) | Update agent details by id. |
| DELETE | /admin/deleteagent/:id | Protected (Admin) | Delete agent by id. |
| POST | /admin/assignpolicy | Protected (Admin) | Assign policy product to an agent. |
| POST | /admin/unassign-policy | Protected (Admin) | Remove policy assignment from agent. |
| GET | /admin/customerdetails | Protected (Admin) | Fetch customer profile details. |
| POST | /admin/approvepolicy | Protected (Admin) | Approve a policy request. |
| POST | /admin/rejectpolicy | Protected (Admin) | Reject a policy request. |
| POST | /admin/approveclaim | Protected (Admin) | Approve claim workflow step. |
| PUT | /admin/claim/:id | Protected (Admin) | Update claim by id. |
| GET | /admin/allclaims | Protected (Admin) | Get all claims. |
| GET | /admin/policy/:id | Protected (Admin) | Get policy details by id. |
| GET | /admin/claim/:id | Protected (Admin) | Get claim details by id. |
| GET | /admin/agents | Protected (Admin) | List all agents. |
| GET | /admin/audit | Protected (Admin) | Fetch audit logs. |
| GET | /admin/summary | Protected (Admin) | Fetch dashboard KPI summary. |
| GET | /admin/db-status | Protected (Admin) | Check DB health/status summary. |

#### Agent Routes (`/agents`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | /agents/login | Public | Login agent and issue auth token. |
| GET | /agents/assignedpolicies | Protected (Agent) | List policies assigned to logged-in agent. |
| GET | /agents/policy-customers/:policyProductId | Protected (Agent) | Get customers mapped to a policy product. |
| GET | /agents/customer-payments/:userPolicyId | Protected (Agent) | Get payment records for a customer policy. |
| POST | /agents/approvepolicy | Protected (Agent) | Approve customer policy request. |
| GET | /agents/policy-requests | Protected (Agent) | List pending policy requests. |
| POST | /agents/approve-policy-request/:userPolicyId | Protected (Agent) | Approve policy request by user policy id. |
| POST | /agents/reject-policy-request/:userPolicyId | Protected (Agent) | Reject policy request by user policy id. |
| GET | /agents/approved-customers | Protected (Agent) | List approved customers for agent scope. |
| GET | /agents/assignedclaims | Protected (Agent) | List claims assigned to agent. |
| GET | /agents/claims/:id | Protected (Agent) | Get claim details by id. |
| POST | /agents/approveclaim | Protected (Agent) | Approve claim decision. |
| POST | /agents/rejectclaim | Protected (Agent) | Reject claim decision. |
| PUT | /agents/claim/:id | Protected (Agent) | Update claim details by id. |
| GET | /agents/assignedpayments | Protected (Agent) | List assigned payment records. |
| GET | /agents/payment-customers | Protected (Agent) | List customers linked to payment tasks. |
| GET | /agents/dashboard | Protected (Agent) | Fetch agent dashboard stats. |

#### Customer Routes (`/customers`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | /customers/policies | Protected (Customer) | View available policy products. |
| POST | /customers/purchase | Protected (Customer) | Purchase selected policy. |
| POST | /customers/pay | Protected (Customer) | Submit policy payment. |
| GET | /customers/payments | Protected (Customer) | Get payment history. |
| GET | /customers/mypolicies | Protected (Customer) | View customer-owned policies. |
| POST | /customers/raiseclaim | Protected (Customer) | Raise a new claim. |
| GET | /customers/myclaims | Protected (Customer) | View customer claims. |
| POST | /customers/cancelpolicy | Protected (Customer) | Request policy cancellation. |
| GET | /customers/policy/:id | Protected (Customer) | Get policy details by id. |
| GET | /customers/claim/:id | Protected (Customer) | Get claim details by id. |

## Deployment (Vercel)

Deploy backend and frontend as separate Vercel projects from the same repository.

### Backend deployment (`backend/`)

1. Create a new Vercel project.
2. Set Root Directory to `backend`.
3. Framework Preset: `Other`.
4. Deploy.

Backend uses `backend/vercel.json` with `api/index.js` as entry.

Set backend environment variables in Vercel:

- `MONGODB_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `FRONTEND_PREVIEW_URL` (optional)

Verify backend after deploy:

- `https://<your-backend-domain>/api/v1/health`

### Frontend deployment (`frontend/`)

1. Create another Vercel project.
2. Set Root Directory to `frontend`.
3. Framework Preset: `Angular`.
4. Build command: `npm run build`.
5. Output directory: `dist/frontend/browser`.

Frontend uses `frontend/vercel.json` for SPA rewrites.

### Production API URL

Update `frontend/src/environments/environment.prod.ts` to your deployed backend URL, for example:

```ts
apiUrl: 'https://insurance-backend-chi.vercel.app/api/v1'
```

Redeploy frontend after changing this value.

## Verification Checklist

Local:

1. Backend responds at `/api/v1/health`.
2. Frontend loads at `http://localhost:4200`.
3. Signup/login works.
4. Browser network calls target backend API URL.
5. No CORS errors in browser console.

Production:

1. Frontend opens without blank routes (SPA rewrite works).
2. API calls resolve to production backend URL.
3. Auth-protected flows work for customer/agent/admin.
4. No backend CORS rejections for your frontend origin.

## Troubleshooting

### `MONGODB_URL is required`

- Cause: missing `MONGODB_URL` in `backend/.env`.
- Fix: create or update `backend/.env` from `backend/.env.example`.

### Frontend cannot connect to backend

- Confirm backend is running on port `8000`.
- Confirm frontend environment `apiUrl` is correct.
- Check browser DevTools Network tab for failing URL.

### CORS blocked in browser

- Set `FRONTEND_URL` in backend environment to exact frontend origin.
- Optionally set `FRONTEND_PREVIEW_URL` for preview deployments.
- Restart or redeploy backend after env updates.

### Port conflict on `4200` or `8000`

- Stop existing process using that port, or run frontend on a different port.
- If backend port changes, also update frontend `apiUrl`.

## Security Notes

1. Never commit `.env` files or real credentials.
2. Use strong JWT secrets, especially in production.
3. Use different secrets across local/staging/production.
4. Restrict MongoDB network access when using Atlas.
5. Rotate production secrets on a regular schedule.
