// Strip the one-time owner ticket before app initialization. It is never logged,
// persisted to localStorage, sent in a URL request or exposed to MCP tools.
window.__computerUITicket = new URLSearchParams(location.hash.slice(1)).get(
  'ticket',
);
if (location.hash) history.replaceState(null, '', location.pathname);
