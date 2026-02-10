const boardEl = document.getElementById('board');
const startPanel = document.getElementById('startPanel');
const gamePanel = document.getElementById('gamePanel');
const startMsg = document.getElementById('startMsg');
const gameMsg = document.getElementById('gameMsg');
const activePlayerEl = document.getElementById('activePlayer');
const hintEl = document.getElementById('hint');
const statusEl = document.getElementById('status');

let sessionId = null;
let guesses = [];

function setStartMessage(message, type = 'small') {
  startMsg.className = type;
  startMsg.textContent = message;
}

function setGameMessage(message, type = 'small') {
  gameMsg.className = type;
  gameMsg.textContent = message;
}

function renderBoard() {
  boardEl.innerHTML = '';
  for (let i = 0; i < 6; i += 1) {
    const row = document.createElement('div');
    row.className = 'row';
    const guess = guesses[i];

    for (let j = 0; j < 5; j += 1) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (guess) {
        cell.textContent = guess.guessWord[j] || '';
        cell.classList.add(guess.resultPattern[j]);
      }
      row.appendChild(cell);
    }

    boardEl.appendChild(row);
  }
}

function renderLeaderboard(entries) {
  const tbody = document.querySelector('#leaderboardTable tbody');
  tbody.innerHTML = '';

  entries.forEach((row) => {
    const tr = document.createElement('tr');

    const player = document.createElement('td');
    player.textContent = row.playerName;
    const best = document.createElement('td');
    best.textContent = String(row.bestScore);
    const wins = document.createElement('td');
    wins.textContent = String(row.wins);

    tr.append(player, best, wins);
    tbody.appendChild(tr);
  });
}

function renderProgress(history) {
  const tbody = document.querySelector('#progressTable tbody');
  tbody.innerHTML = '';

  history.forEach((item) => {
    const tr = document.createElement('tr');

    const session = document.createElement('td');
    session.textContent = String(item.sessionId);
    const status = document.createElement('td');
    status.textContent = item.status;
    const attempts = document.createElement('td');
    attempts.textContent = String(item.attemptsUsed);
    const score = document.createElement('td');
    score.textContent = String(item.score);

    tr.append(session, status, attempts, score);
    tbody.appendChild(tr);
  });
}

async function fetchLeaderboard() {
  const res = await fetch('/api/leaderboard');
  const data = await res.json();
  renderLeaderboard(data);
}

async function fetchStats() {
  const res = await fetch('/api/stats');
  const stats = await res.json();
  document.getElementById('totalSessions').textContent = stats.totalSessions;
  document.getElementById('uniquePlayers').textContent = stats.uniquePlayers;
  document.getElementById('avgScore').textContent = stats.avgScore;
  document.getElementById('wlr').textContent = `${stats.wins} / ${stats.losses}`;
}

async function fetchProgress() {
  const playerName = document.getElementById('playerName').value.trim();
  if (playerName.length < 2) {
    setStartMessage('Enter your name first to load progress.', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/progress?playerName=${encodeURIComponent(playerName)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to load progress');

    renderProgress(data.history);
    setStartMessage(`Loaded ${data.history.length} recent sessions for ${data.playerName}.`, 'success');
  } catch (err) {
    setStartMessage(err.message, 'error');
  }
}

async function refreshSession() {
  if (!sessionId) return;
  const res = await fetch(`/api/sessions/${sessionId}`);
  const data = await res.json();

  guesses = data.guesses;
  statusEl.textContent = data.status;
  renderBoard();

  if (data.status !== 'in_progress') {
    setGameMessage(`Game finished. Score: ${data.score}`);
  }
}

document.getElementById('startGameBtn').addEventListener('click', async () => {
  const playerName = document.getElementById('playerName').value.trim();
  setStartMessage('');
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to start game');

    sessionId = data.sessionId;
    guesses = [];
    startPanel.style.display = 'none';
    gamePanel.style.display = 'block';
    activePlayerEl.textContent = data.playerName;
    hintEl.textContent = data.hint || 'No hint';
    statusEl.textContent = 'in_progress';
    setGameMessage('Game started!');
    renderBoard();
    await Promise.all([fetchLeaderboard(), fetchStats(), fetchProgress()]);
  } catch (err) {
    setStartMessage(err.message, 'error');
  }
});

document.getElementById('guessBtn').addEventListener('click', async () => {
  const guessInput = document.getElementById('guessInput');
  const guess = guessInput.value.trim();
  if (!sessionId) return;

  setGameMessage('');
  try {
    const res = await fetch(`/api/sessions/${sessionId}/guess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guess }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Guess failed');

    guessInput.value = '';
    await refreshSession();
    await Promise.all([fetchLeaderboard(), fetchStats(), fetchProgress()]);

    if (data.status === 'won') {
      setGameMessage(`Great job! You won with score ${data.score}.`, 'success');
    } else if (data.status === 'lost') {
      setGameMessage('Out of attempts. Better luck next round.', 'error');
    }
  } catch (err) {
    setGameMessage(err.message, 'error');
  }
});

document.getElementById('refreshSessionBtn').addEventListener('click', refreshSession);
document.getElementById('loadProgressBtn').addEventListener('click', fetchProgress);

renderBoard();
fetchLeaderboard();
fetchStats();
