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

async function fetchPuzzles() {
  const res = await fetch('/api/puzzles');
  const puzzles = await res.json();

  tableBody.innerHTML = '';
  puzzles.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.word}</td>
      <td>${p.hint || '-'}</td>
      <td>${p.active ? 'Yes' : 'No'}</td>
      <td><button data-id="${p.id}" data-active="${p.active ? '1' : '0'}">${p.active ? 'Deactivate' : 'Activate'}</button></td>
    `;
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
async function createPuzzle() {
  adminMsg.textContent = '';
  adminMsg.className = 'small';

  const word = document.getElementById('wordInput').value.trim();
  const hint = document.getElementById('hintInput').value.trim();
  const active = document.getElementById('activeInput').checked;

  try {
    const res = await fetch('/api/puzzles', {
      method: 'POST',
      headers: adminHeaders(),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, hint, active }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to create puzzle');

    setMessage(`Puzzle ${data.word} created.`, 'success');
    adminMsg.className = 'success';
    adminMsg.textContent = `Puzzle ${data.word} created.`;
    document.getElementById('wordInput').value = '';
    document.getElementById('hintInput').value = '';
    await fetchPuzzles();
  } catch (err) {
    setMessage(err.message, 'error');
    adminMsg.className = 'error';
    adminMsg.textContent = err.message;
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
  await fetch(`/api/puzzles/${id}/active`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: !currentActive }),
  });

  fetchPuzzles();
});

document.getElementById('createBtn').addEventListener('click', createPuzzle);
fetchPuzzles();
