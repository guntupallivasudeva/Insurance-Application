# Local Development Setup Guide

This guide explains how to run the Insurance Application locally with proper secret management.

## Prerequisites

- Node.js 22+
- MongoDB (local or remote Atlas cluster)
- Git

## Environment Security Policy

✅ **SAFE**: Environment variables in `.env` files (these are gitignored)
❌ **UNSAFE**: Hardcoded secrets in source code
❌ **UNSAFE**: Pushing `.env` files to git

All `.env` files are listed in `.gitignore` and will never be committed to the repository.

---

## Backend Setup

### 1. Create Local Environment File

```bash
cd backend
cp .env.example .env
```

### 2. Edit `.env` with Your Configuration

```env
PORT=8000
MONGODB_URL=mongodb://127.0.0.1:27017/insurance_application
JWT_SECRET=your_strong_random_secret_here
FRONTEND_URL=http://localhost:4200
FRONTEND_PREVIEW_URL=
```

**Option A: Local MongoDB** (requires MongoDB running on port 27017)
```bash
MONGODB_URL=mongodb://127.0.0.1:27017/insurance_application
```

**Option B: MongoDB Atlas** (cloud MongoDB)
1. Create account at [mongodb.com/cloud](https://mongodb.com/cloud)
2. Create a cluster and database user
3. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/database`
4. Update `MONGODB_URL` in `.env`

### 3. Generate JWT Secret

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Random -Count 24 | ForEach-Object { [char]$_ }) -join ''))

# Or just use a strong random string (recommended for local dev):
JWT_SECRET=local_dev_secret_min12chars
```

### 4. Start Backend

```bash
npm install
npm run dev
```

Expected output:
```
Connected to MongoDB
Server is ready at http://localhost:8000/api/v1
```

---

## Frontend Setup

### 1. Verify Environment Files (No .env needed for frontend locally)

Frontend uses Angular environment files instead:
- `src/environments/environment.ts` - Local development (used by `ng serve`)
- `src/environments/environment.development.ts` - Alternative dev config
- `src/environments/environment.prod.ts` - Production (used for `npm run build`)

### 2. Update Local API URL (If Needed)

Edit `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api/v1'
};
```

### 3. Start Frontend

```bash
npm install
npm start
```

Expected output:
```
✔ Compiled successfully.
Local: http://localhost:4200/
```

---

## Verify Local Connectivity

### Health Check

```bash
# Check backend health
curl http://localhost:8000/api/v1/health
# Response: {"ok":true}

# Check frontend (should load in browser)
open http://localhost:4200/
```

### Test API Connection

1. Open frontend at `http://localhost:4200/`
2. Try login/signup
3. Check browser DevTools → Network tab
4. Requests should go to `http://localhost:8000/api/v1/*`

---

## Production Environment Variables

These are set in **Vercel Project Settings** (NOT in git):

### Backend (Vercel Project: `backend/`)
- `MONGODB_URL` - Your MongoDB Atlas connection string
- `JWT_SECRET` - Strong random secret (different from local!)
- `FRONTEND_URL` - Your production frontend domain (e.g., `https://insurance-app-frontend.vercel.app`)
- `FRONTEND_PREVIEW_URL` - (Optional) Vercel preview deployment URL

### Frontend (Vercel Project: `frontend/`)
- Update `src/environments/environment.prod.ts` with production backend URL
- No Vercel env vars needed (URLs are hardcoded in TypeScript configs)

---

## Troubleshooting

### Backend: "MONGODB_URL is required"
- ✅ Solution: Create `backend/.env` file with valid `MONGODB_URL`

### Frontend: "Port 4200 already in use"
- ✅ Solution: Use alternate port: `ng serve --port 4201`
- Or modify start script in `frontend/package.json`

### MongoDB Connection Failed
- Check MongoDB is running: `mongosh` (local) or verify Atlas network access
- Verify connection string is correct in `.env`
- Check firewall/VPN settings

### CORS Error in Browser Console
- Verify backend is running at `http://localhost:8000`
- Check `FRONTEND_URL` in backend `.env` matches frontend URL (e.g., `http://localhost:4200`)

---

## Git Safety Checklist

Before committing:

```bash
# ✅ Verify .env files are ignored
git check-ignore backend/.env frontend/.env .env

# ✅ Never stage .env files
git status  # Should not show .env files

# ✅ Verify .env.example has only templates
cat backend/.env.example  # Should show <your_...> placeholders, NOT real values

# ✅ Safe to commit
git add .
git commit -m "Your message"
```

---

## Docker Setup (Optional)

To run with Docker Compose (includes MongoDB):

```bash
docker-compose up
```

This starts:
- MongoDB on `localhost:27017`
- Backend on `localhost:8000`
- Frontend on `localhost:8080`

Requires: Docker Desktop installed

---

## Security Best Practices

1. **Never commit `.env` files** – They're gitignored for a reason
2. **Different secrets per environment** – Use unique `JWT_SECRET` for local vs production
3. **Rotate production secrets** – Change values periodically
4. **Use strong secrets** – Min 32 characters for production
5. **Document templates only** – `.env.example` shows structure, not values

---

## Resources

- [MongoDB Atlas Setup](https://www.mongodb.com/docs/atlas/getting-started/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [Environment Variables Best Practices](https://12factor.net/config)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
