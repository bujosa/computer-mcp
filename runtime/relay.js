// Transport-only relay for an offline guest. No credentials, routing API or host files.
import net from 'node:net';
const peers = new Set();
const server = net.createServer((client) => {
  if (peers.size >= 32) {
    client.destroy();
    return;
  }
  const guest = net.createConnection({ host: 'computer', port: 7070 });
  peers.add(client);
  client.setTimeout(120000);
  guest.setTimeout(120000);
  const close = () => {
    client.destroy();
    guest.destroy();
    peers.delete(client);
  };
  client.on('error', close);
  guest.on('error', close);
  client.on('timeout', close);
  guest.on('timeout', close);
  client.on('close', close);
  guest.on('close', close);
  // Stream piping applies TCP backpressure in both directions, including WebSockets.
  client.pipe(guest);
  guest.pipe(client);
});
server.listen(7070, '0.0.0.0');
process.once('SIGTERM', () => {
  for (const peer of peers) peer.destroy();
  server.close(() => process.exit(0));
});
