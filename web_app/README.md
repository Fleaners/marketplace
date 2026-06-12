# Marketplace Web

Minimal static frontend that can run locally or be hosted on a free static site service.

## Run locally

```powershell
cd web_app
node server.js
# then open http://localhost:8081/
```

## Online hosting (free)

This site is ready for free static hosting services such as GitHub Pages, Netlify, or Vercel.

### GitHub Pages

1. Push this repository to GitHub.
2. Enable GitHub Pages for the repository and use the `gh-pages` branch.
3. A workflow file is included to publish `web_app` automatically.

### Netlify

1. Connect your GitHub repository to Netlify.
2. Set the publish directory to `web_app`.
3. No build command is required.

### Vercel

1. Connect your GitHub repository to Vercel.
2. Set the root directory to `web_app`.
3. No build command is required.

## Behavior when backend is offline

If the local backend is unavailable, the site falls back to demo product data so it still displays a working UI online.
