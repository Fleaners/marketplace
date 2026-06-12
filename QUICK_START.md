# 🚀 QUICK START - Deploy in 10 Minutes

## Current Status
✅ **Frontend Live**: https://fleaners.github.io/marketplace/  
⏳ **Backend**: Ready to deploy (Railway recommended)

---

## Step 1: Deploy Backend to Railway (5 minutes)

1. **Sign up**: https://railway.app (free tier)
2. **Click**: "New Project" → "Deploy from GitHub"
3. **Select**: `Fleaners/marketplace` repo
4. **Wait**: Railway auto-detects and starts deploying
5. **Once deployed**, you'll see a public URL like: `https://xxx.railway.app`

---

## Step 2: Set Environment Variables (3 minutes)

In Railway dashboard → Your Project → Variables:

```
NODE_ENV = production
PORT = 5000
DATABASE_URL = <Copy from Railway PostgreSQL connection>
JWT_SECRET = any-secure-random-string
CLOUDINARY_CLOUD_NAME = your-cloudinary-name
CLOUDINARY_API_KEY = your-api-key
CLOUDINARY_API_SECRET = your-api-secret
```

**Get DATABASE_URL:**
- Railway → "New" → "PostgreSQL"
- Click PostgreSQL service → "Connection"
- Copy the connection string

---

## Step 3: Connect Frontend to Backend (1 minute)

**Easiest way** - Just add `?api=` parameter:

```
https://fleaners.github.io/marketplace/?api=https://xxx.railway.app
```

Replace `xxx.railway.app` with your actual Railway URL.

**That's it!** Your marketplace now connects to your live backend.

---

## Verify It Works

1. Visit the URL from Step 3 above
2. You should see real products from your backend (not demo data)
3. Check browser console (F12) for any errors

---

## Optional: Other Deployment Options

### Render.com (Alternative to Railway)
1. Go to https://render.com
2. "New Web Service" → Connect GitHub
3. Same environment variables as Railway
4. Get public URL, add to frontend

### Local Development
```bash
cd backend
npm install
npm run dev
# Opens at http://localhost:5000
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Cannot GET /api/products" | Wait 2-3 min for Railway deployment, DATABASE_URL not set |
| CORS errors in console | Normal - frontend on GitHub Pages, backend on Railway. Already configured. |
| Blank page | Check browser console (F12) - look for fetch errors |
| "Cannot connect" | Verify Railway URL is correct, public URL is active |

---

## Need More Help?

- **Deployment FAQ**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Local setup**: See [README.md](README.md#local-development-setup)
- **API endpoints**: See [README.md](README.md#backend-api)

**You're all set! Your full marketplace is now online.** 🎉
