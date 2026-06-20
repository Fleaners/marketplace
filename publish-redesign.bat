@echo off
setlocal
cd /d "%~dp0"
git add web_app/index.html web_app/app.js web_app/styles.css web_app/assets/marketplace-store-logo.svg
git commit -m "Improve marketplace browse experience"
git push origin main
git subtree split --prefix web_app -b gh-pages-temp
git push origin gh-pages-temp:gh-pages --force
