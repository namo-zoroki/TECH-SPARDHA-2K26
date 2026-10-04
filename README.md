<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4b28ac27-b91c-4bd7-b488-06998f4e3fd3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## VS Code / Local Setup (fixed package configuration)

1. Open this folder in VS Code.
2. Make sure Node.js and npm are installed.
3. Run `npm install`. The project now uses Vite 8.3.x with esbuild 0.28.x, which resolves the previous ERESOLVE conflict.
4. The included `.env` already contains the configured Google Apps Script Web App URL.
5. Run `npm run dev`. The app is configured for `http://localhost:3000`.

### Google Apps Script
The frontend uses `VITE_GAS_API_URL`. The backend script is in `backend/code.gs`. The script is configured with the supplied Drive folder ID and enforces Gamer Fiesta (Event 08) payment of ₹200 with a payment screenshot.

### If you change the Apps Script deployment
Update `VITE_GAS_API_URL` in `.env` with the new `/exec` URL and restart the Vite dev server.
