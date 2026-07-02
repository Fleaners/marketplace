# Google OAuth 400 Mismatch Fix

The web app uses Google Identity Services from `https://accounts.google.com/gsi/client`.
For this flow, Google checks the browser origin against the OAuth web client.

Current client ID used by this repo:

```text
360203367218-rr0ttluo501ph5ghi5okjp4d4vqcc832.apps.googleusercontent.com
```

The current Google client JSON allows:

```text
https://marketplace-store-fef91.web.app
https://marketplace-store-fef91.firebaseapp.com
```

Add `https://fleaners.github.io` too if you still publish the same app from GitHub Pages.

## Required Google Cloud settings

Open Google Cloud Console, then go to:

`APIs & Services` -> `Credentials` -> your OAuth 2.0 Client ID.

The client type must be `Web application`.

Add these under `Authorized JavaScript origins`:

```text
https://fleaners.github.io
https://marketplace-store-fef91.web.app
https://marketplace-store-fef91.firebaseapp.com
http://localhost:3000
http://localhost:5173
```

If you use another live domain, add that exact origin too, including `https://` and no trailing slash.

This app does not use a Google redirect callback for sign-in, so `Authorized redirect URIs`
is not the important setting for the current `Continue with Google` button.

## Keep frontend and backend on the same client ID

The Firebase Function returns the client ID from `process.env.GOOGLE_CLIENT_ID`.
Set it to the same OAuth web client ID that has the origins above. With Firebase
Functions, one simple local option is a `functions/.env` file:

```text
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

After changing it, redeploy:

```bash
firebase deploy --only functions,hosting --project marketplace-store-fef91
```

## Browser cache note

The frontend now refreshes the Google client ID from the backend on page load, so old
`localStorage` values should no longer keep causing the mismatch after deployment.
If testing a temporary client ID, use:

```text
https://marketplace-store-fef91.web.app/?google_client_id=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

## User access

The backend now creates a Marketplace profile automatically the first time a verified
Google account signs in. Users no longer need to register their email before using
`Continue with Google`.
