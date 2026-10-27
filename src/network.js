// Explicit per-computer IPAM. Never changes Docker's global address pools.
export function ipv4Range(cidr) {
  if (typeof cidr !== 'string') throw new Error('Invalid IPv4 subnet.');
  const match =
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d|[12]\d|3[0-2])$/.exec(
      cidr,
    );
  if (!match) throw new Error('Invalid IPv4 subnet.');
  const octets = match.slice(1, 5).map(Number);
  if (octets.some((n, i) => n > 255 || String(n) !== match[i + 1]))
    throw new Error('Invalid IPv4 subnet.');
  const prefix = Number(match[5]);
  const address = octets.reduce((value, n) => value * 256 + n, 0);
  const size = 2 ** (32 - prefix);
  return {
    start: Math.floor(address / size) * size,
    end: Math.floor(address / size) * size + size - 1,
    prefix,
    address,
  };
}
export function computerSubnets(cidr, network = 'isolated') {
  if (cidr === undefined) return {};
  const range = ipv4Range(cidr);
  const privateRange =
    (range.start >= 0x0a000000 && range.end <= 0x0affffff) ||
    (range.start >= 0xac100000 && range.end <= 0xac1fffff) ||
    (range.start >= 0xc0a80000 && range.end <= 0xc0a8ffff);
  if (!privateRange || range.prefix !== 24 || range.address !== range.start)
    throw new Error(
      'Choose an aligned private IPv4 /24 block, for example 10.234.80.0/24, unused by Docker, LAN and VPN routes.',
    );
  const base = cidr.slice(0, -3);
  return network === 'isolated'
    ? {
        owned: `${base}/25`,
        console: `${base.slice(0, base.lastIndexOf('.') + 1)}128/25`,
      }
    : { owned: cidr };
}
export function assertSubnetAvailability(cidr, occupied) {
  const candidate = ipv4Range(cidr);
  for (const existing of occupied) {
    if (typeof existing !== 'string' || existing.includes(':')) continue;
    const range = ipv4Range(existing);
    if (candidate.start <= range.end && range.start <= candidate.end)
      throw new Error(
        'The requested subnet overlaps an existing Docker network or local interface. Choose another unused block; no networks were changed.',
      );
  }
}
