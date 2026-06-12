# DealerConnect Marketplace.store

This workspace contains the DealerConnect full-stack starter for a mobile-first dealer networking, inventory, and marketplace application.

## Structure

- `backend/` - Node.js + Express backend
- `flutter_app/` - Flutter mobile frontend
- `web_app/` - Static fallback frontend ready for free online hosting

## Online hosting

### Frontend (Static Web App)

The `web_app/` folder is deployed to **GitHub Pages** at: **https://fleaners.github.io/marketplace/**

The site displays live data when the backend is online, or shows demo content when offline.

**Status**: ✅ **LIVE** at https://fleaners.github.io/marketplace/

### Backend API (Node.js + Express)

Deploy the backend to a free service like **Railway**, **Render**, or **Heroku**.

#### Deploy to Railway (Recommended)

1. Go to [railway.app](https://railway.app) and sign up (free tier available)
2. Click "New Project" → "Deploy from GitHub"
3. Connect your GitHub repo (`Fleaners/marketplace`)
4. Railway will auto-detect the `Dockerfile` and deploy the backend
5. Set environment variables in Railway dashboard:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `DATABASE_URL=<Railway PostgreSQL connection string>`
   - `JWT_SECRET=<your-secret-key>`
   - `CLOUDINARY_CLOUD_NAME=<your-cloudinary-name>`
   - `CLOUDINARY_API_KEY=<your-api-key>`
   - `CLOUDINARY_API_SECRET=<your-api-secret>`
6. Railway will provide a public URL (e.g., `https://your-app.railway.app`)
7. Connect the web_app to your backend:
   - Visit: `https://fleaners.github.io/marketplace/?api=https://your-app.railway.app`
   - Or add to localStorage: `localStorage.setItem('API_URL', 'https://your-app.railway.app')`

#### Deploy to Render

1. Go to [render.com](https://render.com) and sign up (free tier available)
2. Click "New+" → "Web Service"
3. Connect your GitHub repo
4. Set runtime to Node.js 18+
5. Build command: `npm install` (in `backend` folder)
6. Start command: `npm start`
7. Add environment variables (same as Railway)
8. Deploy and get your public URL

#### Connect Web App to Backend

Once your backend is deployed, connect the web_app:

```html
<!-- Option 1: Pass API URL as query param -->
https://fleaners.github.io/marketplace/?api=https://your-backend-url.com

<!-- Option 2: Set in browser console -->
localStorage.setItem('API_URL', 'https://your-backend-url.com');

<!-- Option 3: Local development (auto-detects localhost:5000) -->
http://localhost:3000/  (web_app)
http://localhost:5000/  (backend)
```

## Next steps

1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create `backend/.env` from `backend/.env.example` and configure PostgreSQL + Cloudinary.
3. Initialize the database schema:
   ```bash
   psql $DATABASE_URL -f backend/sql/schema.sql
   ```
4. Start backend in development:
   ```bash
   cd backend
   npm run dev
   ```
5. Open `flutter_app/` in a Flutter-capable editor and run the app.

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
