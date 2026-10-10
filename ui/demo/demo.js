const form = document.getElementById('note-form');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const project = document.getElementById('project').value;
  const note = document.getElementById('note').value;
  localStorage.setItem('computer-mcp-demo', JSON.stringify({ project, note }));
  document.getElementById('result-project').textContent = project;
  document.getElementById('result-note').textContent = note;
  document.getElementById('result').hidden = false;
});
