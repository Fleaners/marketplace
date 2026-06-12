# DealerConnect Marketplace.store

This workspace contains the DealerConnect full-stack starter for a mobile-first dealer networking, inventory, and marketplace application.

## Structure

- `backend/` - Node.js + Express backend
- `flutter_app/` - Flutter mobile frontend
- `web_app/` - Static fallback frontend ready for free online hosting

## 🚀 Quick Start - Get Everything Running Online

### ✅ Frontend Status
- **Web App**: 🟢 **LIVE** at https://fleaners.github.io/marketplace/
- Deployed to GitHub Pages
- Shows demo content when backend unavailable, live data when connected

### Deploy Backend to Production (Railway) - 10 minutes

**Step 1:** Go to https://railway.app → Sign up (free) → Click "New Project"

**Step 2:** Select "Deploy from GitHub" → Choose `Fleaners/marketplace` repo

**Step 3:** Railway auto-detects the Dockerfile. Click "Deploy"

**Step 4:** Once deployed, click your service → "Variables" → Add these:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `DATABASE_URL` | (Railway PostgreSQL - see below) |
| `JWT_SECRET` | `your-secure-random-string` |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary username |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary secret |

**Get DATABASE_URL from Railway:**
1. In Railway dashboard → Click "New" → "PostgreSQL"
2. Wait for it to provision
3. Click the PostgreSQL service → "Connection" tab
4. Copy the connection string, paste as `DATABASE_URL`

**Step 5:** Railway provides your public URL (e.g., `https://app-name.railway.app`)

**Step 6:** Connect Frontend to Backend - Pick ONE method:

**Option A (Easiest)** - Visit with query parameter:
```
https://fleaners.github.io/marketplace/?api=https://app-name.railway.app
```

**Option B (Persistent)** - Open browser console and run:
```javascript
localStorage.setItem('API_URL', 'https://app-name.railway.app')
location.reload()
```

**Option C (Development)** - Run locally with `http://localhost:5000`

✅ Done! Your marketplace is now live with both frontend and backend running!

## Local Development Setup

### Backend (Node.js + PostgreSQL)

**Prerequisites:**
- Node.js 18+ (https://nodejs.org)
- PostgreSQL 12+ (https://www.postgresql.org/download/)

**Setup Steps:**

1. Navigate to backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Edit `backend/.env` and configure:
   - `DATABASE_URL`: your PostgreSQL connection string
   - `JWT_SECRET`: any random string for development
   - `CLOUDINARY_*`: your Cloudinary credentials (optional for demo)

5. Initialize database:
   ```bash
   psql $DATABASE_URL -f sql/schema.sql
   ```

6. Start the backend:
   ```bash
   npm run dev
   ```
   Backend runs at: http://localhost:5000

7. Visit in browser:
   - Backend API: http://localhost:5000
   - Web App (with local backend): http://localhost:5000
   - Static files are served from `web_app/` folder

### Flutter Mobile App

1. Install Flutter: https://flutter.dev/docs/get-started/install
2. Navigate to flutter_app:
   ```bash
   cd flutter_app
   ```
3. Get dependencies:
   ```bash
   flutter pub get
   ```
4. Run on device/emulator:
   ```bash
   flutter run
   ```

## Backend API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `PUT /api/products/:id/stock`
- `GET /api/posts/feed`
- `POST /api/posts`
- `DELETE /api/posts/:id`
- `POST /api/invoices`
- `GET /api/invoices/:id`
- `GET /api/invoices/:id/pdf`
- `GET /api/ai`
- `GET /api/business/:id`
- `PUT /api/business/:id`
