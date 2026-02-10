const tableBody = document.querySelector('#puzzleTable tbody');
const adminMsg = document.getElementById('adminMsg');

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

async function createPuzzle() {
  adminMsg.textContent = '';
  adminMsg.className = 'small';

  const word = document.getElementById('wordInput').value.trim();
  const hint = document.getElementById('hintInput').value.trim();
  const active = document.getElementById('activeInput').checked;

  try {
    const res = await fetch('/api/puzzles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, hint, active }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to create puzzle');

    adminMsg.className = 'success';
    adminMsg.textContent = `Puzzle ${data.word} created.`;
    document.getElementById('wordInput').value = '';
    document.getElementById('hintInput').value = '';
    await fetchPuzzles();
  } catch (err) {
    adminMsg.className = 'error';
    adminMsg.textContent = err.message;
  }
}

tableBody.addEventListener('click', async (event) => {
  if (!(event.target instanceof HTMLButtonElement)) return;

  const id = Number(event.target.dataset.id);
  const currentActive = event.target.dataset.active === '1';

  await fetch(`/api/puzzles/${id}/active`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: !currentActive }),
  });

  fetchPuzzles();
});

document.getElementById('createBtn').addEventListener('click', createPuzzle);
fetchPuzzles();
