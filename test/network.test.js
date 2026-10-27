import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { computerSubnets, assertSubnetAvailability } from '../src/network.js';
import {
  compose,
  checkNetwork,
  checkSubnetAvailability,
  networkCapacityAdvice,
} from '../src/docker.js';

test('explicit private /24 IPAM splits isolated networks and leaves existing default configurations unchanged', () => {
  const config = {
    computerId: randomUUID(),
    network: 'isolated',
    port: 17670,
    subnet: '10.234.80.0/24',
  };
  const subnets = { owned: '10.234.80.0/25', console: '10.234.80.128/25' };
  assert.deepEqual(computerSubnets(config.subnet), subnets);
  const spec = compose(config);
  assert.equal(spec.networks.owned.internal, true);
  assert.equal(spec.networks.console.internal, undefined);
  for (const [name, subnet] of Object.entries(subnets))
    assert.deepEqual(spec.networks[name].ipam.config, [{ subnet }]);
  assert.equal(
    compose({ ...config, subnet: undefined }).networks.owned.ipam,
    undefined,
  );
  assert.deepEqual(computerSubnets(config.subnet, 'internet'), {
    owned: config.subnet,
  });
  for (const bad of [
    '8.8.8.0/24',
    '10.234.80.1/24',
    '10.234.80.0/16',
    '127.0.0.0/24',
    '10.234.080.0/24',
    '10.234.256.0/24',
    '10.234.80.0/024',
    '::/24',
    null,
  ])
    assert.throws(() => computerSubnets(bad));
});

test('subnet verification rejects enclosing, enclosed and exact Docker/interface overlap without creating networks', async () => {
  for (const occupied of ['10.0.0.0/8', '10.234.80.64/26', '10.234.80.0/24'])
    assert.throws(
      () => assertSubnetAvailability('10.234.80.0/24', [occupied]),
      /overlaps/,
    );
  assert.doesNotThrow(() =>
    assertSubnetAvailability('10.234.80.0/24', ['10.234.81.0/24', 'fd00::/64']),
  );
  const calls = [];
  const run = async (_config, args) => {
    calls.push(args);
    return args[1] === 'ls'
      ? 'abc\ndef\n'
      : JSON.stringify([{ IPAM: { Config: [{ Subnet: '172.16.0.0/16' }] } }]);
  };
  await checkSubnetAvailability({ subnet: '10.234.80.0/24' }, run, {});
  await assert.rejects(
    checkSubnetAvailability({ subnet: '10.234.80.0/24' }, run, {
      test: [{ family: 'IPv4', cidr: '10.234.80.10/24' }],
    }),
    /overlaps/,
  );
  assert.ok(
    calls.every(
      (args) => args[0] === 'network' && ['ls', 'inspect'].includes(args[1]),
    ),
  );
  assert.match(
    networkCapacityAdvice(
      'all predefined address pools have been fully subnetted',
    ),
    /--subnet/,
  );
});

test('orphaned console networks still require ownership and configured subnets are checked before attaching', async () => {
  const config = {
    computerId: randomUUID(),
    network: 'isolated',
    subnet: '10.234.80.0/24',
  };
  let correctOwner = false;
  const run = async (_config, args) =>
    args[1] === 'ls'
      ? args[3].includes('-console')
        ? 'console'
        : ''
      : JSON.stringify([
          {
            Labels: {
              'computer-mcp.owner': correctOwner
                ? config.computerId
                : randomUUID(),
            },
            Internal: false,
            IPAM: { Config: [{ Subnet: '10.234.80.128/25' }] },
          },
        ]);
  await assert.rejects(checkNetwork(config, run), /ownership/);
  correctOwner = true;
  await checkNetwork(config, run);
  await assert.rejects(
    checkNetwork({ ...config, subnet: '10.234.81.0/24' }, run),
    /subnet/,
  );
});
