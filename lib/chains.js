// Static map of EVM chains we recognize, keyed by canonical lowercased
// chainId hex (e.g. '0x1' for Ethereum mainnet). Brand colors are taken
// from each project's public guidelines so the badge stays recognizable
// without pulling per-chain icon assets.

export const KNOWN_CHAINS = {
  '0x1':       { name: 'Ethereum',     short: 'ETH',   color: '#627eea' },
  '0x89':      { name: 'Polygon',      short: 'POL',   color: '#8247e5' },
  '0x2105':    { name: 'Base',         short: 'BASE',  color: '#0052ff' },
  '0xa4b1':    { name: 'Arbitrum',     short: 'ARB',   color: '#28a0f0' },
  '0xa':       { name: 'Optimism',     short: 'OP',    color: '#ff0420' },
  '0x38':      { name: 'BNB Chain',    short: 'BNB',   color: '#f3ba2f' },
  '0xa86a':    { name: 'Avalanche',    short: 'AVAX',  color: '#e84142' },
  '0xfa':      { name: 'Fantom',       short: 'FTM',   color: '#1969ff' },
  '0xaa36a7':  { name: 'Sepolia',      short: 'SEP',   color: '#cfb5f0' },
  '0x14a34':   { name: 'Base Sepolia', short: 'BASE-S',color: '#0052ff' },
};

// Normalize whatever the wallet hands us (some return decimal numbers,
// some return hex strings with mixed case) into the lowercase hex form
// our map is keyed by.
export const normalizeChainId = (raw) => {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return `0x${raw.toString(16)}`;
  const str = String(raw).toLowerCase();
  return str.startsWith('0x') ? str : `0x${str}`;
};

// Returns { name, short, color } for a chainId, or a generic fallback for
// chains we do not have in the table yet (still useful: shows the user
// they are on *something*, just unnamed).
export const getChainInfo = (chainId) => {
  const norm = normalizeChainId(chainId);
  if (!norm) return null;
  if (KNOWN_CHAINS[norm]) return KNOWN_CHAINS[norm];
  return { name: `Chain ${norm}`, short: norm.slice(0, 6).toUpperCase(), color: '#71717a' };
};
