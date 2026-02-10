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

I cannot directly log into your GitHub account from this environment, but the repo is prepared for one-click deployment from GitHub.

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


### Pull request conflict safety (important)

If GitHub shows conflicts, **do not use “Accept all incoming changes”** blindly.
That often drops required scripts/files and breaks CI/builds.

Recommended conflict flow:

```bash
git checkout work
git fetch origin
git rebase origin/main
# resolve each conflict carefully, keep required scripts/files
npm run validate:repo
npm run check
git rebase --continue
```

The repo now includes `npm run validate:repo` and CI runs it automatically to catch:
- leftover merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
- missing critical files (like `server.js` or CI workflow)
- missing `package.json` scripts (`start`, `check`)

### Render deploy troubleshooting

If Render logs `SyntaxError: Unexpected end of input` for `server.js`:

1. Verify Render is deploying the branch that contains the latest commit.
2. Ensure GitHub has the latest pushed code (`git push`).
3. In Render, trigger **Manual Deploy** → **Clear build cache & deploy**.
4. Confirm the service start command is `npm start`.

This repo now runs a startup syntax check (`npm run check`) and includes a GitHub Actions CI workflow that checks `server.js` syntax before deploy.

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
