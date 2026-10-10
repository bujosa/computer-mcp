import net from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';

// The runtime authorizes every upgrade; this bridge never publishes raw RFB.
export class Desktop {
  constructor() {
    this.server = new WebSocketServer({
      noServer: true,
      maxPayload: 1024 * 1024,
      perMessageDeflate: false,
    });
    this.clients = new Map();
  }
  upgrade(req, socket, head, { actor, control }) {
    if (this.clients.size >= 8) {
      socket.write(
        'HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n',
      );
      socket.destroy();
      return;
    }
    this.server.handleUpgrade(req, socket, head, (ws) => {
      const tcp = net.createConnection({
        host: '127.0.0.1',
        port: control ? 5901 : 5900,
      });
      this.clients.set(ws, control ? actor : null);
      const close = () => {
        tcp.destroy();
        this.clients.delete(ws);
        if (ws.readyState === WebSocket.OPEN) ws.close(1000);
      };
      tcp.on('data', (data) => {
        if (ws.readyState !== WebSocket.OPEN) return close();
        // Pause TCP while the WebSocket send drains: no unbounded frame queue.
        tcp.pause();
        ws.send(data, { binary: true }, (error) => {
          if (error) close();
          else tcp.resume();
        });
      });
      ws.on('message', (data, isBinary) => {
        if (!isBinary) return ws.close(1003, 'Binary RFB frames required');
        if (!tcp.write(data)) ws.pause();
      });
      tcp.on('drain', () => ws.resume());
      tcp.on('error', close);
      tcp.on('close', close);
      ws.on('error', close);
      ws.on('close', close);
    });
  }
  sync(owner) {
    for (const [ws, actor] of this.clients)
      if (actor && actor !== owner) ws.close(1000, 'Control released');
  }
}
