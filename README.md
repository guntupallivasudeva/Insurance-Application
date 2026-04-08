# Insurance-Application

## Host this project on Vercel (No GitHub Secrets)

This setup uses:
- CI: GitHub Actions (`.github/workflows/ci.yml`)
- CD: Vercel Git Integration (auto deploy on push, no GitHub secret keys required)

## What is deployed on Vercel

- Frontend Angular app from `frontend/`
- Backend Express API from `backend/` as a Vercel Serverless Function.

## Deploy backend on Vercel

1. In Vercel, click "Add New Project" and import the same repository again.
2. Set Root Directory to `backend`.
3. Framework preset: Other.
4. Build command: leave empty.
5. Output directory: leave empty.
6. Deploy.

`backend/vercel.json` routes all requests to `api/index.js`.

### Backend environment variables (set in Vercel Project Settings)

Add these in Vercel for backend project:
- `MONGODB_URL`
- `JWT_SECRET`
- `FRONTEND_URL` (your production frontend URL)
- `FRONTEND_PREVIEW_URL` (optional)

This does not require any GitHub Actions secrets.

## Vercel project setup

1. Push this repo to GitHub.
2. In Vercel, click "Add New Project" and import this repository.
3. Set Root Directory to `frontend`.
4. Framework preset: Angular.
5. Build command: `npm run build -- --configuration production`.
6. Output directory: `dist/frontend/browser`.
7. Deploy.

`frontend/vercel.json` is added to support SPA routing.

## Configure production API URL

Update `frontend/src/environments/environment.prod.ts`:
- `apiUrl: 'https://your-backend-domain.example.com/api/v1'`

Then commit and push to `main`. Vercel will auto-deploy.

## CI/CD flow

### CI (`.github/workflows/ci.yml`)

Runs on push/PR to `main`:
- backend dependency install + syntax check
- frontend dependency install + production build

### CD (Vercel native)

No GitHub Action deploy workflow is required.
Vercel automatically deploys every push to `main` and creates preview deployments for pull requests.

## Notes

- Do not commit real secrets to the repository.
- If frontend and backend are on different domains, enable CORS for the frontend domain in backend/src/index.js.

## Example final URLs

- Frontend: `https://insurance-application-frontend.vercel.app`
- Backend: `https://insurance-application-backend.vercel.app`
- frontend `apiUrl`: `https://insurance-application-backend.vercel.app/api/v1`
