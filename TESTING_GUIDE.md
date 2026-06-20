# Firebase Migration Testing Guide

## Deployment Completion Checklist

After `firebase deploy` completes, you should see:
- ✅ Functions deployed to `us-central1-marketplace-store-fef91.cloudfunctions.net`
- ✅ Hosting deployed (Firebase-managed URL will be displayed)
- ✅ No deployment errors

## Manual Testing Steps

### 1. Test Cloud Functions API (No Auth Required)

```bash
# Test status endpoint (public)
curl "https://us-central1-marketplace-store-fef91.cloudfunctions.net/api/status"

# Expected response:
{
  "message": "MarketPlace.Store backend is running on Firebase",
  "timestamp": "2026-06-20T...",
  "environment": "production"
}
```

### 2. Test Firebase Authentication Flow

#### a. Create Account (Email/Password)
```bash
curl -X POST "https://us-central1-marketplace-store-fef91.cloudfunctions.net/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "shopName": "Test Shop",
    "phone": "+919876543210",
    "email": "test@example.com",
    "password": "Password123"
  }'

# Expected: { "business": {...}, "token": "jwt..." }
```

#### b. Login with Email/Password
```bash
curl -X POST "https://us-central1-marketplace-store-fef91.cloudfunctions.net/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'

# Expected: { "business": {...}, "token": "jwt..." }
```

#### c. Firebase Token Login
Get a test Firebase token from console, then:
```bash
curl -X POST "https://us-central1-marketplace-store-fef91.cloudfunctions.net/api/auth/login/firebase" \
  -H "Content-Type: application/json" \
  -d '{"idToken": "your-firebase-id-token"}'

# Expected: { "business": {...}, "token": "jwt..." }
```

### 3. Test Protected Endpoints (Requires JWT)

Get the JWT token from login, then:

```bash
# Get business profile
curl "https://us-central1-marketplace-store-fef91.cloudfunctions.net/api/business/profile" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected: { "id": "...", "shop_name": "...", ... }
```

### 4. Test Frontend

Visit your Firebase Hosting URL:
- Check browser console for any API errors
- Test login with Firebase OTP
- Verify all API calls go to Firebase endpoints (check Network tab)

## Data Migration

Once functions are deployed successfully:

```bash
# Set PostgreSQL connection string
$env:DATABASE_URL="postgresql://user:password@host:5432/database"

# Run migration
cd functions
npm run migrate

# Expected output:
# ✓ Migrated business: Shop Name 1
# ✓ Migrated business: Shop Name 2
# ✓ Products migration completed
# ✓ Posts migration completed
# ✓ Invoices migration completed
# ✅ Migration completed!
```

## Firestore Verification

Check Firebase Console → Firestore:
1. Collections should exist:
   - `businesses` (root collection)
   - Each business should have subcollections: `products`, `posts`, `invoices`

2. Document structure example:
```
/businesses/business-id-1/
  - shop_name: "Test Shop"
  - phone: "+919876543210"
  - email: "test@example.com"
  - created_at: timestamp
  
/businesses/business-id-1/products/
  - product-id-1:
    - name: "Product Name"
    - price: 100
    - stock: 50

/businesses/business-id-1/invoices/
  - invoice-id-1:
    - customer_name: "Customer"
    - total: 500
    - items/ (subcollection)
```

## Troubleshooting

### Issue: "Failed to load function definition"
**Solution**: Check Cloud Build logs in Firebase Console. Usually a syntax error in functions code.

### Issue: Firestore "Missing or insufficient permissions"
**Solution**: Deploy with proper authentication. Production uses Application Default Credentials automatically.

### Issue: 404 on API endpoints
**Solution**: 
1. Verify Cloud Functions deployed successfully
2. Check the function name is exported as `api`
3. Test direct URL: `https://us-central1-marketplace-store-fef91.cloudfunctions.net/api/status`

### Issue: CORS errors in browser
**Solution**: Check CORS middleware in `functions/index.js`. Update origins if needed.

### Issue: JWT token invalid
**Solution**: 
1. Ensure JWT_SECRET environment variable is set on Cloud Functions
2. Re-deploy with: `firebase functions:config:set jwt.secret="your-secret"`

## Rollback Plan

If something fails:

1. **Keep Railway running** during transition
2. **Revert API URL** in web_app/app.js to Railway
3. **Re-deploy hosting**: `firebase deploy --only hosting`
4. **Repeat after fixes**

## Performance Notes

- **Cold Start**: First request may take 500ms - 1s
- **Subsequent Requests**: <100ms (warm)
- **Firestore**: <50ms for document reads
- **Concurrency**: Automatic scaling

## Next Steps After Successful Migration

1. ✅ All tests passing
2. ✅ Data migrated from PostgreSQL
3. ✅ Users can log in via Firebase OTP
4. ✅ All business features working
5. 🔜 Set up monitoring/alerts in Firebase Console
6. 🔜 Configure backup strategy
7. 🔜 Migrate custom domain (optional)
