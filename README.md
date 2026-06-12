# DealerConnect Marketplace.store

This workspace contains the DealerConnect full-stack starter for a mobile-first dealer networking, inventory, and marketplace application.

## Structure

- `backend/` - Node.js + Express backend
- `flutter_app/` - Flutter mobile frontend
- `web_app/` - Static fallback frontend ready for free online hosting

## Online hosting

The `web_app/` folder is designed to be deployed to a free static hosting service like GitHub Pages, Netlify, or Vercel.

If you want the UI available even when your local system is off, deploy `web_app/` and open the published URL.

### Push to GitHub and deploy

1. Install Git locally if needed.
2. Initialize the repo and commit:
   ```powershell
   cd "C:\Users\ELCOT\Documents\New folder\marketplace"
   git init
   git add .
   git commit -m "Initial marketplace web_app deployment"
   ```
3. Create a GitHub repository and add it as a remote:
   ```powershell
   git remote add origin https://github.com/USERNAME/REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```
4. GitHub Pages will automatically publish the `web_app` folder if you use the workflow in `.github/workflows/deploy-web_app.yml`.

### Netlify / Vercel

1. Push your repo to GitHub.
2. Connect the repo to Netlify or Vercel.
3. Set the publish directory to `web_app`.
4. No build command is required for this static site.

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
