# Wordel

Wordel is a lightweight Wordle-style game with:

- **Game page** for players to start sessions, submit guesses, and view progress.
- **Admin page** to create and activate/deactivate custom 5-letter puzzles.
- **Leaderboard** showing best player scores and win counts.
- **Progress history** so players can preview their recent sessions.
- **Analytics** for total sessions, unique players, average score, and win/loss counts.
- **Persistent storage** via SQLite (sessions, guesses, puzzles, and scores are saved).

## Run locally

```bash
npm install
cp .env.example .env
# set ADMIN_TOKEN in .env, then:
ADMIN_TOKEN=your-secret-token npm start
```

Then open:

- Game: `http://localhost:3000`
- Admin: `http://localhost:3000/admin.html`

> In Admin page, enter the same token you used in `ADMIN_TOKEN`.

## Deploy to GitHub + Render (recommended)

You asked to host this on GitHub so you can interact with the product. I cannot directly log into your GitHub account from this environment, but the repo is now prepared for one-click deployment from GitHub.

### 1) Push to your GitHub repository

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin work
```

> If your default branch is `main`, open a PR from `work` to `main` and merge.

### 2) Deploy on Render

1. Go to [https://render.com](https://render.com) and sign in.
2. Click **New +** → **Blueprint**.
3. Connect your GitHub repo.
4. Render will detect `render.yaml` and create the web service automatically.
5. After first deploy, open the service URL (e.g., `https://wordel.onrender.com`).

### 3) Set/Rotate admin token

- Render auto-generates `ADMIN_TOKEN` from `render.yaml`.
- To set your own token, open Render service → **Environment** and set `ADMIN_TOKEN` manually, then redeploy.
- Use this same token on `/admin.html`.

## API overview

- `POST /api/puzzles` - create puzzle (admin token required)
- `PATCH /api/puzzles/:id/active` - toggle puzzle active status (admin token required)
- `GET /api/puzzles` - list puzzles (admin token required)
- `POST /api/sessions` - start a player session
- `POST /api/sessions/:id/guess` - submit guess
- `GET /api/sessions/:id` - fetch session progress
- `GET /api/progress?playerName=...` - fetch recent player history
- `GET /api/leaderboard` - leaderboard data
- `GET /api/stats` - player/session analytics
