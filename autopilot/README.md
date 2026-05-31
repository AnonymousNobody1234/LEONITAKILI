# Autopilot — a money-safe mini-Polsia

A self-hostable **autonomous company builder**. Describe a company and it
**researches the market, writes a strategy doc, builds a real live landing
page, and drafts your launch email + tweet — on its own**, with a live terminal
feed and a Documents / Website / Outreach dashboard. Inspired by
[Polsia](https://polsia.com/), but built so it **cannot surprise-bill you**.

## What it does (the "company" flow)

Type a name + one sentence about the idea → hit **Launch company** → watch it
run four chained phases automatically:

1. **Investigating** — market analysis (problem, customer, differentiators)
2. **Writing strategy** — a saved go-to-market document
3. **Building landing page** — a real HTML page served live at `/sites/<id>`
   you can open in a browser
4. **Drafting outreach** — a launch email + tweet, saved as drafts for review

Everything is visible on the dashboard: a live terminal log, a status panel
with progress, and panels for the Documents, the live Website link, and the
Outreach drafts.

> Honest scope vs. Polsia: this **drafts** the email and tweet rather than
> actually sending them or posting to X — because real email needs an API key
> and the Twitter/X API costs ~$100/mo. The landing page, however, is genuinely
> live. Switch to a real AI brain (below) for high-quality copy; on the free
> `mock` brain you still get the full working flow with sensible placeholder
> copy.

You can also still use the lower-level **task** API (research / content /
coding / general) directly — see the API section.

## Why it won't burn your money

The whole point. Three "brains" you can switch between:

| Provider | Cost per task | Quality | Notes |
|----------|---------------|---------|-------|
| `mock` (default) | **$0** | canned | Instant. Proves the system works with zero setup. |
| `ollama` | **$0** | good | Free local model on your own machine. |
| `openai` | costs money | best | **Only runs under a hard monthly dollar cap.** |

For the paid path, every single call goes through a **budget guard**: before
spending, it estimates the cost, and if that would push the month over your
`MONTHLY_USD_CAP`, it **refuses the call** (logged as a `refused` run) instead
of spending. `mock` and `ollama` are always $0 and never touch the guard.

## Quick start (free, 60 seconds)

```bash
cd autopilot
npm install
cp .env.example .env      # defaults to the free `mock` provider
npm run build
npm start
```

Open **http://localhost:3000**. Create a task, hit **Run now**, watch it appear
in the live feed. No API keys, no cost.

## Switch to a real free model (Ollama)

```bash
# 1. Install Ollama from https://ollama.com, then:
ollama serve
ollama pull llama3.2

# 2. In autopilot/.env:
LLM_PROVIDER=ollama

# 3. rebuild + restart
npm run build && npm start
```

Still **$0 per task** — it runs on your own machine.

## Enable the paid brain (with a hard cap)

Only if you want top quality and are OK spending a *bounded* amount:

```ini
# autopilot/.env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
MONTHLY_USD_CAP=5            # it will NEVER spend past this in a month
OPENAI_INPUT_USD_PER_MTOK=0.15
OPENAI_OUTPUT_USD_PER_MTOK=0.60
```

Once the month's spend would cross `$5`, further paid calls are refused
automatically. Set the cap to whatever you're comfortable with.

> Works with any OpenAI-compatible endpoint (OpenRouter, Together, local
> servers, etc.) — just change `OPENAI_BASE_URL`, `OPENAI_MODEL`, and the
> pricing vars.

## Task types

- **research** — fetches the source URLs you list, strips them to text, and has
  the model write a cited digest. Great for a daily news/competitor briefing.
- **content** — generates ready-to-publish copy from your brief.
- **coding** — the model emits files (`FILE: path` + code block) which are
  written **only inside the sandboxed `workspace/` folder** (path-escape blocked).
- **general** — any instruction; the model carries it out and reports back.

Each task has its own `cron` schedule (blank = the nightly default,
`0 3 * * *`, Polsia-style). The scheduler runs enabled tasks automatically.

## Run it 24/7 on a free cloud tier

So it keeps working when your computer is off (use `mock` or `openai` — Ollama
needs a machine with the model on it):

1. Push this repo to GitHub.
2. On [Render](https://render.com) (free web service) or
   [Railway](https://railway.app) / [Fly.io](https://fly.io):
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Root directory:** `autopilot`
   - Add env vars from `.env.example` (set `LLM_PROVIDER`, and for paid,
     `OPENAI_API_KEY` + `MONTHLY_USD_CAP`).
3. Open the service URL — same dashboard, now always on.

> The JSON store (`data/db.json`) lives on the instance disk. On free tiers
> that disk can be ephemeral (reset on redeploy). For durable history, attach a
> persistent volume/disk mounted at `autopilot/data`.

## How it works (architecture)

```
src/
  config.ts        env + the monthly cap
  store.ts         JSON-file store (no native deps) — tasks, runs, spend ledger
  spend.ts         the budget guard (checkBudget / recordSpend / recordRefusal)
  providers/       mock | ollama | openai  (only openai is paid + guarded)
  tasks/           research | content | coding | general handlers
  runner.ts        executes one task, captures result + tokens + cost as a Run
  scheduler.ts     node-cron — runs enabled tasks automatically
  api.ts           REST API (tasks CRUD, run-now, runs feed, spend)
  server.ts        boot: store + api + static dashboard + scheduler
public/            the dashboard (spend meter, tasks, live activity feed)
```

Every run is single-shot (one model call) — no runaway agent loops — so it's
reliable even on small local models and predictable on cost.

## API (if you want to script it)

```
GET    /api/health
GET    /api/spend
GET    /api/tasks
POST   /api/tasks            {name, type, prompt, sources?, cron?}
PUT    /api/tasks/:id
DELETE /api/tasks/:id
POST   /api/tasks/:id/run
GET    /api/runs?taskId=&limit=
```
