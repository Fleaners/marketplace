# Firebase Migration Guide

## What Has Been Created

✅ **Cloud Functions structure**
- `functions/index.js` - Main entry point (Express app wrapped as Cloud Function)
- `functions/package.json` - Dependencies for Firebase Functions
- `functions/controllers/authController.js` - Authentication logic (Firestore-based)
- `functions/routes/` - All API routes converted to Firestore
  - auth.js - Authentication endpoints
  - business.js - Business profile management
  - products.js - Product CRUD operations
  - posts.js - Social posts
  - invoices.js - Invoice management
  - ai.js - Placeholder for AI features

✅ **Configuration**
- `firebase.json` - Firebase project configuration
- `functions/.env.local` - Environment variables template

## Next Steps

### Step 1: Install Firebase CLI & Dependencies

```bash
# Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools

# Go to functions directory
cd functions

# Install dependencies
npm install

# Go back to project root
cd ..
```

### Step 2: Setup Environment Variables

Edit `functions/.env.local` with your actual values:
```bash
JWT_SECRET=your-secure-secret-key-here
CLOUDINARY_CLOUD_NAME=your-value
CLOUDINARY_API_KEY=your-value
CLOUDINARY_API_SECRET=your-value
```

### Step 3: Test Locally with Emulator

```bash
# Start Firebase emulator
firebase emulators:start --only functions,firestore

# In another terminal, test endpoints:
curl http://localhost:5001/marketplace-store-fef91/us-central1/api/status
```

### Step 4: Fix JWT Middleware (Important!)

The functions use a stub middleware. You need to properly implement JWT verification.

1. Install jsonwebtoken in functions:
```bash
cd functions
npm install jsonwebtoken
cd ..
```

2. Create `functions/middleware/auth.js`:
```javascript
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

3. Update all route files to use: `import { verifyToken } from '../middleware/auth.js';`

### Step 5: Migrate Data from PostgreSQL to Firestore

Run this script to migrate existing data:

```bash
# Create migration script at: functions/scripts/migrate-data.js
# This requires:
# 1. Connection to current PostgreSQL database
# 2. Firestore initialized
# 3. Follow the collection structure in the migration plan
```

### Step 6: Deploy Cloud Functions

```bash
# Authenticate with Firebase
firebase login

# Deploy functions only
firebase deploy --only functions

# Or deploy functions + hosting
firebase deploy
```

### Step 7: Update Frontend API URLs

Update `web_app/app.js` to call Firebase endpoints instead of Railway:

Replace:
```javascript
const API_BASE_URL = 'https://marketplacestore-production.up.railway.app/api';
```

With:
```javascript
const API_BASE_URL = 'https://us-central1-marketplace-store-fef91.cloudfunctions.net/api';
```

### Step 8: Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

### Step 9: Verify Deployment

- Test endpoints at: `https://us-central1-marketplace-store-fef91.cloudfunctions.net/api/status`
- Test frontend at: Firebase Hosting URL (check firebase deploy output)
- Test custom domain setup for fleaners.github.io

## Important Notes

1. **Firestore Structure**: The collections are nested under businesses for multi-tenancy
2. **No PostgreSQL**: All data now uses Firestore - no migrations needed for schema
3. **Performance**: Consider Firestore indexes for frequently queried fields
4. **Costs**: Free tier includes generous free limits on functions and firestore
5. **Regions**: Functions deployed in us-central1 (adjust in firebase.json if needed)

## Troubleshooting

**Issue**: Functions won't deploy
- Check `firebase.json` has correct project ID
- Verify Node 20 compatibility
- Check all imports are correct

**Issue**: 404 on API endpoints
- Verify Firebase hosting rewrites in `firebase.json`
- Check Cloud Functions are actually deployed
- Test with direct Cloud Functions URL

**Issue**: Authentication errors
- Verify JWT_SECRET is set
- Check token is being sent in Authorization header
- Test with the debug endpoint

## Rollback to Railway

If needed, keep Railway running during testing and switch back:
```bash
# Update web_app/app.js
const API_BASE_URL = 'https://marketplacestore-production.up.railway.app/api';
```
