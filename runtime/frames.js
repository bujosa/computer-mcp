import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { Fault, requireThat } from './errors.js';

export const frameLimits = {
  count: 3,
  bytes: 512 * 1024,
  timeoutMs: 8000,
  width: 640,
  height: 400,
};

// Decode in a separate guest UID. The working agent cannot read the private
// historical video through another UID1000 process's /proc file descriptors.
export async function decodeFrames(
  video,
  workflow,
  atSeconds,
  signal,
  launch = spawn,
) {
  const file = video.file(workflow.id);
  const stat = await fs.lstat(file);
  requireThat(
    stat.isFile() && !stat.isSymbolicLink() && stat.size <= video.limits.bytes,
    'video_storage',
    'The private video is not a bounded regular file.',
  );
  const data = await fs.readFile(file);
  const end = Math.max(
    0,
    Math.min(300, (workflow.video.frames - 1) / workflow.video.fps - 0.03),
  );
  const times = atSeconds || [
    ...new Set([0, Number((end / 2).toFixed(3)), Number(end.toFixed(3))]),
  ];
  requireThat(
    times.length > 0 &&
      times.length <= frameLimits.count &&
      times.every((n) => Number.isFinite(n) && n >= 0 && n <= end + 0.001),
    'invalid_timestamp',
    'Choose up to three timestamps within the encoded video.',
  );
  const frames = [];
  for (const time of times) {
    requireThat(!signal?.aborted, 'cancelled', 'Video analysis was cancelled.');
    const frame = await new Promise((resolve, reject) => {
      const child = launch(
        'ffmpeg',
        [
          '-hide_banner',
          '-loglevel',
          'error',
          // CPU quotas do not limit detected cores; bound input and filter
          // workers separately from the output encoder within the PID budget.
          '-filter_threads',
          '1',
          '-threads',
          '1',
          '-i',
          'pipe:0',
          '-ss',
          String(time),
          '-frames:v',
          '1',
          '-an',
          '-vf',
          'scale=640:400',
          '-threads',
          '1',
          '-f',
          'image2pipe',
          '-c:v',
          'png',
          'pipe:1',
        ],
        {
          uid: 1001,
          gid: 1001,
          env: { PATH: '/usr/bin:/bin', HOME: '/tmp', LANG: 'C.UTF-8' },
          stdio: ['pipe', 'pipe', 'ignore'],
        },
      );
      const chunks = [];
      let bytes = 0;
      let error;
      const stop = (code, message) => {
        error ||= new Fault(code, message, 409);
        child.kill('SIGKILL');
      };
      const abort = () => stop('cancelled', 'Frame extraction cancelled.');
      const timer = setTimeout(
        () => stop('frame_timeout', 'Frame extraction exceeded its deadline.'),
        frameLimits.timeoutMs,
      );
      signal?.addEventListener('abort', abort, { once: true });
      child.stdin.on('error', () => {});
      child.stdout.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > frameLimits.bytes)
          stop('frame_limit', 'Decoded frame exceeds its byte limit.');
        else chunks.push(chunk);
      });
      child.once('error', (failure) => {
        error = failure;
      });
      child.once('close', (code) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        if (error || code !== 0 || !bytes)
          reject(
            error ||
              new Fault(
                'frame_decode_failed',
                'Video frame could not be decoded.',
                409,
              ),
          );
        else resolve(Buffer.concat(chunks));
      });
      if (signal?.aborted) abort();
      child.stdin.end(data);
    });
    requireThat(
      frame.subarray(0, 8).toString('hex') === '89504e470d0a1a0a',
      'invalid_frame',
      'The decoder did not return a PNG.',
    );
    frames.push({
      atSeconds: time,
      mimeType: 'image/png',
      data: frame.toString('base64'),
    });
  }
  return { frames, lastFrameSeconds: end, limits: frameLimits };
}
