// Lightweight Sign-In with Ethereum (EIP-4361) helpers used to mint a
// "verified" badge in the chat without any backend. Each client signs a
// message at login, broadcasts the signature via Ably presence, and every
// peer locally verifies the signature with ethers' verifyMessage.
//
// This is intentionally not a full SIWE implementation: there is no nonce
// store, no replay protection beyond a per-session random nonce, and no
// expiration check. It is enough to make casual spoofing ("I am 0xVitalik")
// fail, which is the bar the original task sets.

import { ethers } from 'ethers';

const STORAGE_PREFIX = 'siwe:';

const lowercase = (s) => (typeof s === 'string' ? s.toLowerCase() : s);

// Generate a non-cryptographically-strong nonce. Sufficient for this use case
// because the message is also bound to the address and per-tab session.
const randomNonce = () => {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
};

// Build a SIWE-style human-readable message. Kept simple enough that users
// can read it in the MetaMask popup and trust what they are signing.
export const buildSiweMessage = ({ address, domain, chainId, nonce, issuedAt }) => {
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    'Sign in to the chat to prove ownership of this address.',
    '',
    `URI: https://${domain}`,
    `Version: 1`,
    `Chain ID: ${chainId || 'unknown'}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
};

const storageKeyFor = (address) => `${STORAGE_PREFIX}${lowercase(address)}`;

// Pull a previously cached signature for this address+session. Returns null
// when nothing is stored or the entry cannot be parsed.
export const loadStoredSiwe = (address) => {
  if (typeof window === 'undefined' || !address) return null;
  try {
    const raw = window.sessionStorage.getItem(storageKeyFor(address));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.message || !parsed.signature) return null;
    return parsed;
  } catch (e) {
    return null;
  }
};

// Custom event name dispatched on the window after a signature is cached.
// Components that show the verified badge listen for this so they re-read
// sessionStorage without a page reload when the user signs after mount.
export const SIWE_EVENT = 'siwe:updated';

const saveStoredSiwe = (address, payload) => {
  if (typeof window === 'undefined' || !address) return;
  try {
    window.sessionStorage.setItem(storageKeyFor(address), JSON.stringify(payload));
    try {
      window.dispatchEvent(new CustomEvent(SIWE_EVENT, { detail: { address: lowercase(address) } }));
    } catch (e) { /* CustomEvent unavailable in some test envs */ }
  } catch (e) { /* quota or privacy mode — silently ignore */ }
};

// Pop up MetaMask asking the user to sign a SIWE message. Returns the cached
// payload if one already exists for this session+address (so users do not get
// re-prompted on every reload). Resolves null if the user rejects or no
// provider is available — the caller should treat that as "no badge".
export const requestSiweSignature = async ({ address, chainId } = {}) => {
  if (typeof window === 'undefined' || !address) return null;
  const cached = loadStoredSiwe(address);
  if (cached) return cached;
  if (!window.ethereum || typeof window.ethereum.request !== 'function') return null;
  const domain = window.location.host || 'web3-chat.local';
  const nonce = randomNonce();
  const issuedAt = new Date().toISOString();
  const message = buildSiweMessage({ address, domain, chainId, nonce, issuedAt });
  try {
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, address],
    });
    if (!signature || typeof signature !== 'string') return null;
    const payload = { message, signature, address: lowercase(address) };
    saveStoredSiwe(address, payload);
    return payload;
  } catch (e) {
    // User rejected the signature or wallet errored out.
    return null;
  }
};

// Drop the cached signature for a given address (used by logout).
export const clearStoredSiwe = (address) => {
  if (typeof window === 'undefined' || !address) return;
  try { window.sessionStorage.removeItem(storageKeyFor(address)); } catch (e) {}
};

// Locally verify a peer's SIWE payload. Returns true only when the recovered
// signer matches the expected address (case-insensitive). Wrapped in try/catch
// because malformed signatures throw inside ethers.
export const verifySiwe = (payload, expectedAddress) => {
  if (!payload || !payload.message || !payload.signature || !expectedAddress) return false;
  try {
    const recovered = ethers.verifyMessage(payload.message, payload.signature);
    return lowercase(recovered) === lowercase(expectedAddress);
  } catch (e) {
    return false;
  }
};
