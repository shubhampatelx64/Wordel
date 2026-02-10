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
ADMIN_TOKEN=your-secret-token npm start
npm start
```

Then open:

- Game: `http://localhost:3000`
- Admin: `http://localhost:3000/admin.html`

> In Admin page, enter the same token you used in `ADMIN_TOKEN`.

## API overview

- `POST /api/puzzles` - create puzzle (admin token required)
- `PATCH /api/puzzles/:id/active` - toggle puzzle active status (admin token required)
- `GET /api/puzzles` - list puzzles (admin token required)
- `POST /api/sessions` - start a player session
- `POST /api/sessions/:id/guess` - submit guess
- `GET /api/sessions/:id` - fetch session progress
- `GET /api/progress?playerName=...` - fetch recent player history
## API overview

- `POST /api/puzzles` - create puzzle
- `PATCH /api/puzzles/:id/active` - toggle puzzle active status
- `POST /api/sessions` - start a player session
- `POST /api/sessions/:id/guess` - submit guess
- `GET /api/sessions/:id` - fetch session progress
- `GET /api/leaderboard` - leaderboard data
- `GET /api/stats` - player/session analytics
