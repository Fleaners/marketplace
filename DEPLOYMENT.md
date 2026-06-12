# Deployment Guide - Railway (Production)

This guide walks you through deploying the DealerConnect marketplace backend to Railway and connecting the frontend.

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Click **"Start Project"** and select **"GitHub"**
3. Authorize Railway to access your GitHub account
4. Select the **`Fleaners/marketplace`** repository

## Step 2: Configure Railway Project

1. Railway auto-detects the Dockerfile and Node.js configuration
2. Click **"Deploy"** to start the build
3. Wait for deployment to complete (usually 2-3 minutes)

## Step 3: Add Environment Variables

Once deployed, click **"Variables"** and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Required for Express optimization |
| `PORT` | `5000` | Keep as-is (Railway assigns public port automatically) |
| `DATABASE_URL` | See below | PostgreSQL connection string |
| `JWT_SECRET` | Your secret key | Use a strong random string |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary name | From Cloudinary account |
| `CLOUDINARY_API_KEY` | Your API key | From Cloudinary account |
| `CLOUDINARY_API_SECRET` | Your API secret | From Cloudinary account |

### Getting DATABASE_URL from Railway PostgreSQL

1. In Railway dashboard, click **"New"** → **"Database"** → **"PostgreSQL"**
2. Wait for PostgreSQL to provision (1-2 minutes)
3. Click the PostgreSQL service
4. Copy the connection string from **"Connection"** tab
5. Paste it as `DATABASE_URL` in your project variables

Example: `postgresql://postgres:xxxxx@postgres.railway.internal:5432/railway`

## Step 4: Initialize Database Schema

The database schema is auto-applied on server startup. If you need manual setup:

1. Open Railway PostgreSQL plugin
2. Go to **"Data"** tab
3. Run the SQL from `backend/sql/schema.sql`

## Step 5: Get Your Public URL

1. Click your Railway project
2. Find the **"Public URL"** in the service details
3. Example: `https://dealerconnect-production.railway.app`

## Step 6: Connect Frontend to Backend

### Option A: Using Query Parameter (Easiest)
```
https://fleaners.github.io/marketplace/?api=https://your-railway-url.railway.app
```

### Option B: Using localStorage (Persistent)
1. Visit https://fleaners.github.io/marketplace/
2. Open browser DevTools (F12)
3. Go to Console tab
4. Run:
```javascript
localStorage.setItem('API_URL', 'https://your-railway-url.railway.app')
location.reload()
```

### Option C: Update Frontend Code (If Self-Hosting)
If you deploy the frontend separately:
- Edit [web_app/app.js](../web_app/app.js) line 4
- Change: `const API_URL = 'https://your-railway-url.railway.app';`

## Step 7: Test the Connection

1. Visit your frontend with the API parameter:
   ```
   https://fleaners.github.io/marketplace/?api=https://your-railway-url.railway.app
   ```

2. You should see real products from your backend instead of demo data

3. Check browser console (F12) for any CORS errors

## Troubleshooting

### "Cannot GET /api/products" Error
- Check that `DATABASE_URL` is set correctly
- Verify PostgreSQL database is running in Railway
- Check that the schema was initialized

### CORS Errors in Console
- This is normal if frontend and backend are on different domains
- The backend is already configured with CORS enabled
- Check browser console for actual error details

### Blank Page or Fallback Content
- Backend may not be initialized
- Check Railway logs: click service → "Logs" tab
- Ensure all environment variables are set

## Next Steps (Optional)

1. **Add Custom Domain**: Railway → Settings → Custom Domain
2. **Enable Auto-Deploy**: Push to `main` branch, Railway auto-deploys
3. **Monitor Logs**: Click "Logs" tab to watch real-time activity
4. **Scale**: Click "Deploy" → "Replicas" for redundancy

## Useful Commands

**Check backend status:**
```bash
curl https://your-railway-url.railway.app/api/status
```

**Test from browser console:**
```javascript
fetch('https://your-railway-url.railway.app/api/status').then(r => r.json()).then(console.log)
```

---

**Need help?** Check Railway docs: https://docs.railway.app
