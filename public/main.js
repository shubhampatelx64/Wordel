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

async function fetchLeaderboard() {
  const res = await fetch('/api/leaderboard');
  const data = await res.json();
  const tbody = document.querySelector('#leaderboardTable tbody');
  tbody.innerHTML = '';
  data.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.playerName}</td><td>${row.bestScore}</td><td>${row.wins}</td>`;
    tbody.appendChild(tr);
  });
}

async function fetchStats() {
  const res = await fetch('/api/stats');
  const stats = await res.json();
  document.getElementById('totalSessions').textContent = stats.totalSessions;
  document.getElementById('uniquePlayers').textContent = stats.uniquePlayers;
  document.getElementById('avgScore').textContent = stats.avgScore;
  document.getElementById('wlr').textContent = `${stats.wins} / ${stats.losses}`;
}

async function refreshSession() {
  if (!sessionId) return;
  const res = await fetch(`/api/sessions/${sessionId}`);
  const data = await res.json();

  guesses = data.guesses;
  statusEl.textContent = data.status;
  renderBoard();

  if (data.status !== 'in_progress') {
    gameMsg.textContent = `Game finished. Score: ${data.score}`;
  }
}

document.getElementById('startGameBtn').addEventListener('click', async () => {
  const playerName = document.getElementById('playerName').value.trim();
  startMsg.textContent = '';
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
    gameMsg.textContent = 'Game started!';
    renderBoard();
    await Promise.all([fetchLeaderboard(), fetchStats()]);
  } catch (err) {
    startMsg.className = 'error';
    startMsg.textContent = err.message;
  }
});

document.getElementById('guessBtn').addEventListener('click', async () => {
  const guessInput = document.getElementById('guessInput');
  const guess = guessInput.value.trim();
  if (!sessionId) return;

  gameMsg.textContent = '';
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
    await Promise.all([fetchLeaderboard(), fetchStats()]);

    if (data.status === 'won') {
      gameMsg.className = 'success';
      gameMsg.textContent = `Great job! You won with score ${data.score}.`;
    } else if (data.status === 'lost') {
      gameMsg.className = 'error';
      gameMsg.textContent = 'Out of attempts. Better luck next round.';
    }
  } catch (err) {
    gameMsg.className = 'error';
    gameMsg.textContent = err.message;
  }
});

document.getElementById('refreshSessionBtn').addEventListener('click', refreshSession);

renderBoard();
fetchLeaderboard();
fetchStats();
