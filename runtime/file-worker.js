import { Files } from './files.js';
let input = '';
for await (const chunk of process.stdin) input += chunk;
try {
  const { root, action, args } = JSON.parse(input);
  const files = new Files(root);
  const result = await files[action](...args);
  process.stdout.write(JSON.stringify({ result }));
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      error: {
        code: error.code || 'file_error',
        message: error.message,
        status: error.status || 400,
      },
    }),
  );
}
