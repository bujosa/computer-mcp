// Shared host/guest persistence primitive; no runtime, transport or provider imports.
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export async function atomicJSON(target, value) {
  const temporary = `${target}.${randomUUID()}.tmp`;
  let handle;
  let created = false;
  try {
    handle = await fs.open(temporary, 'wx', 0o600);
    created = true;
    await handle.writeFile(JSON.stringify(value, null, 2) + '\n');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fs.rename(temporary, target);
  } finally {
    try {
      await handle?.close();
    } finally {
      if (created)
        await fs.unlink(temporary).catch((error) => {
          if (error.code !== 'ENOENT') throw error;
        });
    }
  }
}
