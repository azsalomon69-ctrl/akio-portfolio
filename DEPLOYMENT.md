# Deploy the portfolio

The frontend is a static Vercel site. The `/api/chat` backend is a Render Node web service. Keep all `NVIDIA_API_KEY_*` values on Render only.

## 1. Push this folder to GitHub

Commit the deployment files and push the repository. Confirm that `.env` is not included; it is already ignored by Git.

## 2. Create the Render backend

1. In Render, choose **New > Blueprint** and connect the repository.
2. Render reads `render.yaml` and creates `akio-portfolio-api`.
3. Enter at least `NVIDIA_API_KEY_1` when prompted. The other API keys are optional fallbacks.
4. For `FRONTEND_URL`, initially enter the Vercel URL you expect, or a temporary value such as `https://example.invalid`; update it after step 3.
5. Wait for `/health` to report a successful deploy, then copy the service URL, such as `https://akio-portfolio-api.onrender.com`.

## 3. Create the Vercel frontend

1. Import the same GitHub repository into Vercel.
2. Keep the project root at the repository root. `vercel.json` supplies the build command and `dist` output directory.
3. Add `API_BASE_URL` in **Project Settings > Environment Variables**. Set it to the Render service URL with no `/api/chat` suffix.
4. Deploy and copy the final Vercel URL.

## 4. Lock the backend to the frontend

In Render, set `FRONTEND_URL` to the exact Vercel production origin, such as `https://your-project.vercel.app`, with no trailing slash. Redeploy the service. If you add a custom domain, put additional exact origins in `ALLOWED_ORIGINS`, separated by commas.

## Local verification

Run `npm start`, then open `http://localhost:4173`. The local server reads `.env`. Run `npm run check` for syntax checks and `npm run build` to create the Vercel output locally.
