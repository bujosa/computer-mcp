const form = document.getElementById('note-form');
function showNote(saved) {
  if (
    !saved ||
    typeof saved.project !== 'string' ||
    typeof saved.note !== 'string'
  )
    return;
  document.getElementById('result-project').textContent = saved.project;
  document.getElementById('result-note').textContent = saved.note;
  document.getElementById('result').hidden = false;
}
try {
  showNote(JSON.parse(localStorage.getItem('computer-mcp-demo')));
} catch {
  /* An invalid previous note must not block the practice task. */
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const project = document.getElementById('project').value;
  const note = document.getElementById('note').value;
  localStorage.setItem('computer-mcp-demo', JSON.stringify({ project, note }));
  showNote({ project, note });
});
