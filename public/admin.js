const tableBody = document.querySelector('#puzzleTable tbody');
const adminMsg = document.getElementById('adminMsg');
const tokenInput = document.getElementById('adminTokenInput');

const tokenStorageKey = 'wordelAdminToken';
tokenInput.value = localStorage.getItem(tokenStorageKey) || '';

tokenInput.addEventListener('input', () => {
  localStorage.setItem(tokenStorageKey, tokenInput.value.trim());
});

function adminHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-admin-token': tokenInput.value.trim(),
  };
}

function setMessage(message, type = 'small') {
  adminMsg.className = type;
  adminMsg.textContent = message;
}

function renderPuzzles(puzzles) {
  tableBody.innerHTML = '';
  puzzles.forEach((p) => {
    const tr = document.createElement('tr');

    const id = document.createElement('td');
    id.textContent = p.id;
    const word = document.createElement('td');
    word.textContent = p.word;
    const hint = document.createElement('td');
    hint.textContent = p.hint || '-';
    const active = document.createElement('td');
    active.textContent = p.active ? 'Yes' : 'No';

    const action = document.createElement('td');
    const btn = document.createElement('button');
    btn.dataset.id = String(p.id);
    btn.dataset.active = p.active ? '1' : '0';
    btn.textContent = p.active ? 'Deactivate' : 'Activate';
    action.appendChild(btn);

    tr.append(id, word, hint, active, action);
    tableBody.appendChild(tr);
  });
}

async function fetchPuzzles() {
  setMessage('');
  const res = await fetch('/api/puzzles', { headers: { 'x-admin-token': tokenInput.value.trim() } });
  const data = await res.json();

  if (!res.ok) {
    renderPuzzles([]);
    throw new Error(data.error || 'Unable to load puzzles');
  }

  renderPuzzles(data);
}

async function createPuzzle() {
  setMessage('');

  const word = document.getElementById('wordInput').value.trim();
  const hint = document.getElementById('hintInput').value.trim();
  const active = document.getElementById('activeInput').checked;

  try {
    const res = await fetch('/api/puzzles', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ word, hint, active }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to create puzzle');

    setMessage(`Puzzle ${data.word} created.`, 'success');
    document.getElementById('wordInput').value = '';
    document.getElementById('hintInput').value = '';
    await fetchPuzzles();
  } catch (err) {
    setMessage(err.message, 'error');
  }
}

tableBody.addEventListener('click', async (event) => {
  if (!(event.target instanceof HTMLButtonElement)) return;

  const id = Number(event.target.dataset.id);
  const currentActive = event.target.dataset.active === '1';

  try {
    const res = await fetch(`/api/puzzles/${id}/active`, {
      method: 'PATCH',
      headers: adminHeaders(),
      body: JSON.stringify({ active: !currentActive }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to update puzzle status');

    setMessage(`Puzzle ${data.word} is now ${data.active ? 'active' : 'inactive'}.`, 'success');
    await fetchPuzzles();
  } catch (err) {
    setMessage(err.message, 'error');
  }
});

document.getElementById('createBtn').addEventListener('click', createPuzzle);

fetchPuzzles().catch((err) => setMessage(err.message, 'error'));
