import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Fault } from './errors.js';
export class FileService {
  constructor(root) {
    this.root = root;
  }
  call(action, ...args) {
    return new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [fileURLToPath(new URL('./file-worker.js', import.meta.url))],
        {
          uid: 1000,
          gid: 1000,
          env: { PATH: '/usr/bin:/bin' },
          stdio: ['pipe', 'pipe', 'ignore'],
        },
      );
      let output = '';
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Fault('file_timeout', 'File operation timed out.'));
      }, 5000);
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.stdout.on('data', (data) => {
        output += data;
        if (output.length > 2 * 1024 * 1024) child.kill('SIGKILL');
      });
      child.once('close', () => {
        clearTimeout(timer);
        try {
          const value = JSON.parse(output);
          if (value.error)
            reject(
              new Fault(
                value.error.code,
                value.error.message,
                value.error.status,
              ),
            );
          else resolve(value.result);
        } catch {
          reject(new Fault('file_error', 'File worker failed.'));
        }
      });
      child.stdin.end(JSON.stringify({ root: this.root, action, args }));
    });
  }
  list(path) {
    return this.call('list', path);
  }
  read(path) {
    return this.call('read', path);
  }
  write(path, text) {
    return this.call('write', path, text);
  }
  resolve(path, options) {
    return this.call('resolve', path, options);
  }
}
