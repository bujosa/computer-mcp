import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const projectName = (config) => `cmcp-${config.computerId}`;
export function runDocker(
  config,
  args,
  { capture = false, timeoutMs = 120000, extraEnv = {} } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['--context', config.context, ...args], {
      env: { ...process.env, ...extraEnv },
      stdio: ['ignore', capture ? 'pipe' : 'inherit', 'pipe'],
    });
    let output = '',
      errorOutput = '';
    child.stdout?.on('data', (data) => {
      if (output.length < 1024 * 1024) output += data;
    });
    child.stderr.on('data', (data) => {
      const text = data
        .toString()
        .replaceAll(config.token || '\0', '[redacted]')
        .replaceAll(config.ownerToken || '\0', '[redacted]');
      if (capture) errorOutput = (errorOutput + text).slice(-4000);
      else process.stderr.write(text);
    });
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(output)
        : reject(
            new Error(
              `Docker command failed (${code ?? 'timeout'}). ${errorOutput}`,
            ),
          );
    });
  });
}
export function localEndpoint(endpoint) {
  return (
    typeof endpoint === 'string' &&
    (endpoint.startsWith('unix://') || endpoint.startsWith('npipe://'))
  );
}
export async function checkDocker(config) {
  const contexts = JSON.parse(
    await runDocker(config, ['context', 'inspect', config.context], {
      capture: true,
      timeoutMs: 10000,
    }),
  );
  if (!localEndpoint(contexts[0]?.Endpoints?.docker?.Host))
    throw new Error(
      'This MVP accepts only a local Unix socket or Windows named pipe. Remote/SSH/TCP Docker contexts are not supported.',
    );
  const version = JSON.parse(
    await runDocker(config, ['version', '--format', '{{json .Server}}'], {
      capture: true,
      timeoutMs: 10000,
    }),
  );
  if (version.Os !== 'linux')
    throw new Error(
      'Use Docker’s Linux container engine. Windows containers are not supported.',
    );
  const major = Number(version.Version?.split('.')[0]);
  if (major < 28)
    throw new Error(
      'Docker Engine 28+ is required for reliable loopback port publishing.',
    );
  return {
    context: config.context,
    guestOS: version.Os,
    engine: version.Version,
    architecture: version.Arch,
  };
}
export function compose(config) {
  const project = projectName(config);
  const spec = {
    name: project,
    services: {
      computer: {
        build: {
          context: root,
          dockerfile: 'runtime/Dockerfile',
          target: 'desktop',
        },
        image: `${project}:desktop-local`,
        container_name: project,
        hostname: project,
        labels: {
          'computer-mcp.owner': config.computerId,
          'computer-mcp.project': project,
        },
        init: true,
        restart: 'no',
        environment: {
          COMPUTER_ID: config.computerId,
          COMPUTER_TOKEN: '${COMPUTER_TOKEN:?Start through computer-mcp}',
          OWNER_TOKEN: '${OWNER_TOKEN:?Start through computer-mcp}',
          PUBLIC_PORT: String(config.port),
          COMPUTER_NETWORK: config.network || 'isolated',
          DISPLAY: ':1',
        },
        ports: [`127.0.0.1:${config.port}:7070`],
        volumes: [{ type: 'volume', source: 'data', target: '/data' }],
        cap_drop: ['ALL'],
        cap_add: ['SETUID', 'SETGID', 'KILL', 'CHOWN', 'DAC_OVERRIDE'],
        security_opt: ['no-new-privileges:true'],
        cpus: 2,
        mem_limit: '1536m',
        pids_limit: 192,
        shm_size: '256m',
        tmpfs: ['/tmp:size=256m,mode=1777'],
        ulimits: { nofile: { soft: 4096, hard: 4096 }, core: 0 },
        networks: ['owned'],
        logging: {
          driver: 'json-file',
          options: { 'max-size': '5m', 'max-file': '2' },
        },
        healthcheck: {
          test: [
            'CMD',
            'node',
            '-e',
            "fetch('http://127.0.0.1:7070/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))",
          ],
          interval: '5s',
          timeout: '3s',
          retries: 20,
          start_period: '20s',
        },
      },
    },
    volumes: {
      data: {
        name: `${project}-data`,
        labels: { 'computer-mcp.owner': config.computerId },
      },
    },
    networks: {
      owned: {
        internal: config.network !== 'internet',
        name: `${project}-network`,
        labels: { 'computer-mcp.owner': config.computerId },
      },
    },
  };
  if (config.network === 'isolated') {
    delete spec.services.computer.ports;
    spec.networks.console = {
      name: `${project}-console`,
      labels: { 'computer-mcp.owner': config.computerId },
    };
    spec.services.console = {
      build: {
        context: root,
        dockerfile: 'runtime/Dockerfile',
        target: 'relay',
      },
      image: `${project}:relay-local`,
      container_name: `${project}-console`,
      labels: { 'computer-mcp.owner': config.computerId },
      depends_on: ['computer'],
      init: true,
      restart: 'no',
      read_only: true,
      ports: [`127.0.0.1:${config.port}:7070`],
      networks: ['owned', 'console'],
      cap_drop: ['ALL'],
      security_opt: ['no-new-privileges:true'],
      cpus: 0.25,
      mem_limit: '96m',
      pids_limit: 16,
      logging: {
        driver: 'json-file',
        options: { 'max-size': '1m', 'max-file': '2' },
      },
    };
  }
  return spec;
}
export async function composeFile(state, config) {
  const file = path.join(state, 'compose.json');
  await fs.writeFile(file, JSON.stringify(compose(config), null, 2) + '\n', {
    mode: 0o600,
  });
  return file;
}
export async function checkOwned(config) {
  const name = projectName(config);
  const existing = (
    await runDocker(
      config,
      ['ps', '-a', '--filter', `name=^/${name}$`, '--format', '{{.ID}}'],
      { capture: true, timeoutMs: 10000 },
    )
  ).trim();
  if (!existing) return false;
  const [container] = JSON.parse(
    await runDocker(config, ['inspect', existing], {
      capture: true,
      timeoutMs: 10000,
    }),
  );
  if (
    container.Config?.Labels?.['computer-mcp.owner'] !== config.computerId ||
    container.Name !== `/${name}` ||
    container.Mounts?.some(
      (m) => m.Type === 'bind' || m.Destination === '/var/run/docker.sock',
    ) ||
    !container.Mounts?.some(
      (m) => m.Name === `${name}-data` && m.Destination === '/data',
    )
  )
    throw new Error(
      'Container ownership/mounts do not match. Refusing lifecycle changes.',
    );
  for (const bindings of Object.values(container.HostConfig.PortBindings || {}))
    if (
      bindings?.some(
        (b) => b.HostIp !== '127.0.0.1' || b.HostPort !== String(config.port),
      )
    )
      throw new Error(
        'Container has unexpected published ports. Refusing lifecycle changes.',
      );
  return true;
}
export async function checkVolume(config) {
  const name = `${projectName(config)}-data`;
  const exists = (
    await runDocker(
      config,
      ['volume', 'ls', '--filter', `name=^${name}$`, '--format', '{{.Name}}'],
      { capture: true, timeoutMs: 10000 },
    )
  ).trim();
  if (!exists) return;
  const [volume] = JSON.parse(
    await runDocker(config, ['volume', 'inspect', name], {
      capture: true,
      timeoutMs: 10000,
    }),
  );
  if (volume.Labels?.['computer-mcp.owner'] !== config.computerId)
    throw new Error('Volume ownership does not match. Refusing to attach it.');
}

export async function checkNetwork(config) {
  const name = `${projectName(config)}-network`;
  const exists = (
    await runDocker(
      config,
      ['network', 'ls', '--filter', `name=^${name}$`, '--format', '{{.Name}}'],
      { capture: true, timeoutMs: 10000 },
    )
  ).trim();
  if (!exists) return;
  const [network] = JSON.parse(
    await runDocker(config, ['network', 'inspect', name], {
      capture: true,
      timeoutMs: 10000,
    }),
  );
  if (
    network.Labels?.['computer-mcp.owner'] !== config.computerId ||
    network.Internal !== (config.network !== 'internet')
  )
    throw new Error(
      'Network ownership/policy does not match. Refusing to attach it.',
    );
  if (config.network === 'isolated') {
    const consoleName = `${projectName(config)}-console`;
    const present = (
      await runDocker(
        config,
        [
          'network',
          'ls',
          '--filter',
          `name=^${consoleName}$`,
          '--format',
          '{{.Name}}',
        ],
        { capture: true, timeoutMs: 10000 },
      )
    ).trim();
    if (present) {
      const [consoleNetwork] = JSON.parse(
        await runDocker(config, ['network', 'inspect', consoleName], {
          capture: true,
          timeoutMs: 10000,
        }),
      );
      if (
        consoleNetwork.Labels?.['computer-mcp.owner'] !== config.computerId ||
        consoleNetwork.Internal
      )
        throw new Error('Console network ownership/policy mismatch.');
    }
  }
}

export async function checkRelay(config) {
  const name = `${projectName(config)}-console`;
  const existing = (
    await runDocker(
      config,
      ['ps', '-a', '--filter', `name=^/${name}$`, '--format', '{{.ID}}'],
      { capture: true, timeoutMs: 10000 },
    )
  ).trim();
  if (!existing) return false;
  const [relay] = JSON.parse(
    await runDocker(config, ['inspect', existing], {
      capture: true,
      timeoutMs: 10000,
    }),
  );
  if (
    config.network !== 'isolated' ||
    relay.Config?.Labels?.['computer-mcp.owner'] !== config.computerId ||
    relay.Name !== `/${name}` ||
    relay.Mounts?.length ||
    relay.HostConfig?.PortBindings?.['7070/tcp']?.length !== 1 ||
    relay.HostConfig.PortBindings['7070/tcp'][0].HostIp !== '127.0.0.1' ||
    relay.HostConfig.PortBindings['7070/tcp'][0].HostPort !==
      String(config.port)
  )
    throw new Error(
      'Console relay ownership/mounts/ports do not match. Refusing lifecycle changes.',
    );
  return true;
}
