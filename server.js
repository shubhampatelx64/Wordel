const path = require('path');
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me-admin-token';
const db = new Database(path.join(__dirname, 'wordel.db'));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function setupDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS puzzles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      hint TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_name TEXT NOT NULL,
      puzzle_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      attempts_used INTEGER NOT NULL DEFAULT 0,
      score INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (puzzle_id) REFERENCES puzzles(id)
    );

    CREATE TABLE IF NOT EXISTS guesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      guess_word TEXT NOT NULL,
      result_pattern TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );
  `);

  const puzzleCount = db.prepare('SELECT COUNT(*) as count FROM puzzles').get().count;
  if (puzzleCount === 0) {
    db.prepare('INSERT INTO puzzles (word, hint, active) VALUES (?, ?, 1)').run('APPLE', 'A common fruit');
  }
}

function validateWord(word) {
  return /^[A-Za-z]{5}$/.test(word);
}

function compareGuess(guess, target) {
  const result = Array(5).fill('absent');
  const targetChars = target.split('');
  const guessChars = guess.split('');

  for (let i = 0; i < 5; i += 1) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = 'correct';
      targetChars[i] = null;
      guessChars[i] = null;
    }
  }

  for (let i = 0; i < 5; i += 1) {
    if (!guessChars[i]) continue;
    const matchIndex = targetChars.indexOf(guessChars[i]);
    if (matchIndex !== -1) {
      result[i] = 'present';
      targetChars[matchIndex] = null;
    }
  }

  return result;
}

function calculateScore(attemptsUsed, won) {
  if (!won) return 0;
  return Math.max(10, 70 - (attemptsUsed - 1) * 10);
}

function requireAdmin(req, res, next) {
  const token = req.get('x-admin-token');
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized. Provide a valid admin token.' });
  }
  return next();
}

setupDatabase();

app.get('/api/puzzles', requireAdmin, (req, res) => {
  const puzzles = db.prepare('SELECT id, word, hint, active, created_at FROM puzzles ORDER BY created_at DESC').all();
  res.json(puzzles);
});

app.post('/api/puzzles', requireAdmin, (req, res) => {
  const { word, hint, active = true } = req.body;
  const cleanWord = (word || '').trim().toUpperCase();

  if (!validateWord(cleanWord)) {
    return res.status(400).json({ error: 'Word must be exactly 5 letters.' });
  }

  const existing = db.prepare('SELECT id FROM puzzles WHERE word = ?').get(cleanWord);
  if (existing) {
    return res.status(400).json({ error: 'Puzzle word already exists.' });
  }

  const result = db
    .prepare('INSERT INTO puzzles (word, hint, active) VALUES (?, ?, ?)')
    .run(cleanWord, hint?.trim() || '', active ? 1 : 0);

  const puzzle = db.prepare('SELECT id, word, hint, active, created_at FROM puzzles WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(puzzle);
});

app.patch('/api/puzzles/:id/active', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { active } = req.body;

  if (!Number.isInteger(id) || typeof active !== 'boolean') {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  const update = db.prepare('UPDATE puzzles SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  if (update.changes === 0) {
    return res.status(404).json({ error: 'Puzzle not found.' });
  }

  const puzzle = db.prepare('SELECT id, word, hint, active, created_at FROM puzzles WHERE id = ?').get(id);
  return res.json(puzzle);
});

app.post('/api/sessions', (req, res) => {
  const playerName = (req.body.playerName || '').trim();
  if (playerName.length < 2) {
    return res.status(400).json({ error: 'Please provide a name with at least 2 characters.' });
  }

  const puzzle = db.prepare('SELECT id, hint FROM puzzles WHERE active = 1 ORDER BY RANDOM() LIMIT 1').get();
  if (!puzzle) {
    return res.status(404).json({ error: 'No active puzzles available. Ask an admin to create one.' });
  }

  const result = db
    .prepare('INSERT INTO sessions (player_name, puzzle_id) VALUES (?, ?)')
    .run(playerName, puzzle.id);

  return res.status(201).json({
    sessionId: result.lastInsertRowid,
    playerName,
    hint: puzzle.hint || '',
    maxAttempts: 6,
  });
});

app.get('/api/sessions/:id', (req, res) => {
  const sessionId = Number(req.params.id);
  const session = db
    .prepare(
      `SELECT s.id, s.player_name as playerName, s.status, s.attempts_used as attemptsUsed, s.score,
              p.hint
         FROM sessions s
         JOIN puzzles p ON p.id = s.puzzle_id
        WHERE s.id = ?`
    )
    .get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const guesses = db
    .prepare('SELECT guess_word as guessWord, result_pattern as resultPattern, created_at as createdAt FROM guesses WHERE session_id = ? ORDER BY id ASC')
    .all(sessionId)
    .map((g) => ({ ...g, resultPattern: JSON.parse(g.resultPattern) }));

  return res.json({ ...session, maxAttempts: 6, guesses });
});

app.post('/api/sessions/:id/guess', (req, res) => {
  const sessionId = Number(req.params.id);
  const guess = (req.body.guess || '').trim().toUpperCase();

  if (!validateWord(guess)) {
    return res.status(400).json({ error: 'Guess must be exactly 5 letters.' });
  }

  const session = db
    .prepare(
      `SELECT s.id, s.status, s.attempts_used as attemptsUsed, s.puzzle_id as puzzleId
         FROM sessions s
        WHERE s.id = ?`
    )
    .get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  if (session.status !== 'in_progress') {
    return res.status(400).json({ error: 'This session has already ended.' });
  }

  const puzzle = db.prepare('SELECT word FROM puzzles WHERE id = ?').get(session.puzzleId);
  const pattern = compareGuess(guess, puzzle.word);
  const isWin = guess === puzzle.word;
  const attemptsUsed = session.attemptsUsed + 1;
  const isLoss = attemptsUsed >= 6 && !isWin;

  db.prepare('INSERT INTO guesses (session_id, guess_word, result_pattern) VALUES (?, ?, ?)').run(
    sessionId,
    guess,
    JSON.stringify(pattern)
  );

  let newStatus = 'in_progress';
  let score = 0;

  if (isWin) {
    newStatus = 'won';
    score = calculateScore(attemptsUsed, true);
  } else if (isLoss) {
    newStatus = 'lost';
    score = 0;
  }

  db.prepare(
    `UPDATE sessions
        SET attempts_used = ?,
            status = ?,
            score = ?,
            completed_at = CASE WHEN ? = 'in_progress' THEN completed_at ELSE CURRENT_TIMESTAMP END
      WHERE id = ?`
  ).run(attemptsUsed, newStatus, score, newStatus, sessionId);

  return res.json({
    pattern,
    status: newStatus,
    attemptsUsed,
    remainingAttempts: Math.max(0, 6 - attemptsUsed),
    score,
  });
});

app.get('/api/progress', (req, res) => {
  const playerName = (req.query.playerName || '').toString().trim();
  if (playerName.length < 2) {
    return res.status(400).json({ error: 'playerName query is required (min 2 characters).' });
  }

  const history = db
    .prepare(
      `SELECT s.id as sessionId,
              s.status,
              s.attempts_used as attemptsUsed,
              s.score,
              s.created_at as createdAt,
              s.completed_at as completedAt,
              p.hint
         FROM sessions s
         JOIN puzzles p ON p.id = s.puzzle_id
        WHERE s.player_name = ?
        ORDER BY s.id DESC
        LIMIT 20`
    )
    .all(playerName);

  return res.json({ playerName, history });
});

app.get('/api/leaderboard', (req, res) => {
  const leaders = db
    .prepare(
      `SELECT player_name as playerName,
              MAX(score) as bestScore,
              COUNT(*) as gamesPlayed,
              SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as wins
         FROM sessions
        GROUP BY player_name
        ORDER BY bestScore DESC, wins DESC, gamesPlayed ASC
        LIMIT 20`
    )
    .all();

  res.json(leaders);
});

app.get('/api/stats', (req, res) => {
  const totals = db
    .prepare(
      `SELECT
         COUNT(*) as totalSessions,
         COUNT(DISTINCT player_name) as uniquePlayers,
         AVG(score) as avgScore,
         SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as wins,
         SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as losses
       FROM sessions`
    )
    .get();

  res.json({
    totalSessions: totals.totalSessions || 0,
    uniquePlayers: totals.uniquePlayers || 0,
    avgScore: Number(totals.avgScore || 0).toFixed(2),
    wins: totals.wins || 0,
    losses: totals.losses || 0,
  });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Wordel server running on http://localhost:${PORT}`);
});
