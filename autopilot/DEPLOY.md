# Deploy Autopilot to a real URL (no Node, no terminal needed)

You'll get a link like `https://autopilot-xxxx.onrender.com` that you can open
from any device, running 24/7 even when your computer is off. **Free.**

The cloud host installs Node and builds everything for you — you don't need
anything installed locally.

## Option A — Render (recommended, click-only)

1. Go to **https://render.com** and sign up (use the "Sign in with GitHub"
   button — it's the smoothest).
2. Authorize Render to see your GitHub, and pick the repo
   **`AnonymousNobody1234/LEONITAKILI`**.
3. Click **New +** → **Blueprint**.
4. Select this repo. Render finds the `render.yaml` at the root and fills in
   everything automatically (build command, start command, free plan).
5. Click **Apply** / **Create**. Wait ~2–3 minutes for the first build.
6. When it goes green, click the URL at the top of the service page
   (`https://autopilot-….onrender.com`). **That's your app.**

That's it. Create a task, hit **Run now**, watch the live feed.

> Free-tier note: Render's free web service "sleeps" after ~15 min of no
> traffic and wakes on the next visit (first load takes ~30s). Scheduled tasks
> run while it's awake; for guaranteed 24/7 nightly runs, upgrade to a paid
> instance later, or use a free uptime pinger to keep it awake.

## Option B — Railway (alternative)

1. Go to **https://railway.app**, sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → pick `LEONITAKILI`.
3. In the service **Settings**:
   - **Root Directory:** `autopilot`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add the same env vars as `render.yaml` (LLM_PROVIDER=mock, MONTHLY_USD_CAP=0).
5. Deploy, then open the generated domain.

## After it's live

- It starts on the **free `mock` brain** ($0). To get smarter output later,
  change `LLM_PROVIDER` to `openai`, add `OPENAI_API_KEY`, and set
  `MONTHLY_USD_CAP` to your limit (e.g. `5`) in the host's env-vars panel — no
  redeploy of code needed, just restart.
- Note: the free **local** `ollama` brain can't run on these hosts (no model on
  the box). On cloud, use `mock` (free) or `openai` (capped).
