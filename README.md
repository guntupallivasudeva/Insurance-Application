# Insurance-Application

Full-stack insurance application with:
- Angular frontend in `frontend/`
- Express + MongoDB backend in `backend/`

The backend API base path is `/api/v1`.

## Quick Start (Local)

1. Open two terminals.
2. Start backend from `backend/`.
3. Start frontend from `frontend/`.
4. Open `http://localhost:4200`.

Detailed steps are below.

## Prerequisites

1. Node.js 22 or later.
2. npm (comes with Node.js).
3. MongoDB running locally, or a MongoDB Atlas connection string.

## Step-by-Step Local Run

### 1) Backend setup

1. Go to backend folder:

```powershell
cd backend
```

2. Install dependencies:

```powershell
npm install
```

3. Create `.env` from template:

```powershell
copy .env.example .env
```

4. Edit `backend/.env` and set values:

```dotenv
PORT=8000
MONGODB_URL=<your_mongodb_connection_string>
FRONTEND_URL=http://localhost:4200 (optional for local, required in production)
FRONTEND_PREVIEW_URL=
```

Notes:
- For MongoDB Atlas, replace `MONGODB_URL` with your Atlas URI.
- Keep `FRONTEND_URL` as an origin only (no path).

5. Run backend:

```powershell
npm run dev
```

6. Verify backend health:

Open `http://localhost:8000/api/v1/health` and confirm you get:

```json
{"ok":true}
```

### 2) Frontend setup

1. Open a new terminal and go to frontend folder:

```powershell
cd frontend
```

2. Install dependencies:

```powershell
npm install
```

3. Confirm local API URL in `frontend/src/environments/environment.ts` is:

```ts
apiUrl: 'http://localhost:8000/api/v1'
```

4. Run frontend:

```powershell
npm start
```

5. Open:

`http://localhost:4200`

### 3) Local verification checklist

1. Home page loads.
2. Signup/login works.
3. Browser network calls go to `http://localhost:8000/api/v1/...`.
4. No CORS errors in browser console.

## Step-by-Step Vercel Deployment

Deploy backend and frontend as two separate Vercel projects from the same repository.

### 1) Deploy backend project

1. In Vercel, click Add New Project.
2. Import this repository.
3. Set Root Directory: `backend`
4. Framework Preset: `Other`
5. Install Command: `npm ci`
6. Build Command: leave empty
7. Output Directory: leave empty
8. Deploy.

Then set backend environment variables in Vercel Project Settings:
- `MONGODB_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `FRONTEND_PREVIEW_URL` (optional)

Recommended values for your current deployment:
- `FRONTEND_URL=https://insurance-frontend-vert.vercel.app`
- `FRONTEND_PREVIEW_URL=` (or your preview URL)

Redeploy backend after adding env vars.

Verify backend:
- `https://insurance-backend-chi.vercel.app/api/v1/health`

### 2) Deploy frontend project

1. In Vercel, click Add New Project again.
2. Import the same repository.
3. Set Root Directory: `frontend`
4. Framework Preset: `Angular`
5. Install Command: `npm ci`
6. Build Command: `npm run build`
7. Output Directory: `dist/frontend/browser`
8. Deploy.

`frontend/vercel.json` already handles SPA rewrites.

### 3) Confirm production API URL

In `frontend/src/environments/environment.prod.ts`, the API URL is:

```ts
apiUrl: 'https://insurance-backend-chi.vercel.app/api/v1'
```

If you change this value, commit and push, then redeploy frontend.

### 4) Production verification checklist

1. Open frontend: `https://insurance-frontend-vert.vercel.app/home`
2. Test login.
3. In DevTools Network tab, confirm requests go to:
	`https://insurance-backend-chi.vercel.app/api/v1/...`
4. Confirm no CORS errors.

## CI/CD

GitHub Actions workflow:
- `.github/workflows/ci.yml`

It runs on push and pull request to `main`:
1. Backend install + syntax checks.
2. Frontend install + production build.

Vercel handles deployment from connected Git branches.

## Optional: Run with Docker Compose

From project root:

```powershell
docker-compose up --build
```

Services:
- MongoDB: `localhost:27017`
- Backend: `localhost:8000`
- Frontend (nginx): `localhost:8080`

## Troubleshooting

### Error: frontend calling `http://localhost:8000` in production

1. Redeploy frontend from Vercel after latest commit.
2. Confirm production build uses `environment.prod.ts`.
3. Confirm network requests point to `https://insurance-backend-chi.vercel.app/api/v1`.

### Error: CORS blocked

1. Set backend `FRONTEND_URL` to your frontend origin.
2. Redeploy backend.
3. Retry login after hard refresh (`Ctrl+F5`).

## Security Notes

1. Never commit real secrets.
2. Keep `.env` files local only.
3. Use strong, unique `JWT_SECRET` in production.
