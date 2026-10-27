// Pure shell formatting shared by the trusted host CLI and owner console.
// Windows output targets PowerShell; POSIX output targets a POSIX shell.
export function formatCommandEntry(entry, platform = 'posix') {
  if (!['posix', 'win32'].includes(platform))
    throw new Error('Choose posix or win32 command formatting.');
  if (
    !entry ||
    typeof entry.command !== 'string' ||
    !entry.command ||
    !Array.isArray(entry.args) ||
    entry.args.some((value) => typeof value !== 'string') ||
    [entry.command, ...entry.args].some((value) => /[\0\r\n]/.test(value))
  )
    throw new Error('Invalid command entry.');
  const quote = (value) =>
    platform === 'win32'
      ? `'${value.replaceAll("'", "''")}'`
      : `'${value.replaceAll("'", "'\\''")}'`;
  return (
    (platform === 'win32' ? '& ' : '') +
    [entry.command, ...entry.args].map(quote).join(' ')
  );
}
