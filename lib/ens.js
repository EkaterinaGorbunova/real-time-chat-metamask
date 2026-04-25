// ENS reverse-resolution helper.
//
// Looks up `address -> primary ENS name` once per address, with a layered
// cache so the chat UI never blocks on a network call:
//   1. In-memory map for the lifetime of the tab (avoids re-renders racing).
//   2. localStorage for cross-tab and cross-session reuse (24h TTL, also
//      negatively caches "no ENS" answers so we don't re-query every reload).
//   3. A pending-promise map deduplicates concurrent lookups for the same
//      address (e.g. when an address appears both in the member list and in
//      messages on the same render).
//
// The mainnet provider is created lazily on the first lookup so SSR and
// guest-only sessions don't pay the cost.

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

const TTL_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = 'ens:';

const memCache = new Map(); // address(lowercased) -> name|null
const pending = new Map(); // address(lowercased) -> Promise<name|null>

let providerPromise = null;
const getProvider = () => {
  if (!providerPromise) {
    providerPromise = Promise.resolve().then(() => {
      // getDefaultProvider rotates through several public mainnet endpoints
      // (Etherscan/Infura/Alchemy fallback chain) using shared keys; fine for
      // light, read-only ENS reverse lookups.
      return ethers.getDefaultProvider('mainnet');
    });
  }
  return providerPromise;
};

const isAddress = (value) => typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);

const readStorage = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > TTL_MS) return null;
    return parsed;
  } catch (e) {
    return null;
  }
};

const writeStorage = (key, name) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ name, ts: Date.now() }));
  } catch (e) {
    // quota exceeded / private mode; cache silently degrades to memory only
  }
};

// Returns a primary ENS name for `address` or null if there is none / lookup
// failed. Resolves from cache when possible; otherwise performs a network
// lookup and caches the result.
export const resolveEns = (address) => {
  if (!isAddress(address)) return Promise.resolve(null);
  const key = address.toLowerCase();

  if (memCache.has(key)) return Promise.resolve(memCache.get(key));

  const stored = readStorage(STORAGE_PREFIX + key);
  if (stored) {
    memCache.set(key, stored.name);
    return Promise.resolve(stored.name);
  }

  if (pending.has(key)) return pending.get(key);

  const promise = (async () => {
    try {
      const provider = await getProvider();
      const name = await provider.lookupAddress(address);
      memCache.set(key, name || null);
      writeStorage(STORAGE_PREFIX + key, name || null);
      return name || null;
    } catch (e) {
      // Network/provider error: don't cache so we can retry later, but resolve
      // to null so the UI falls back to the short address form.
      memCache.delete(key);
      return null;
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, promise);
  return promise;
};

// React hook: returns the ENS name for `address`, or null while it is
// unresolved (cache miss + lookup pending) or if the address has no ENS.
// Synchronous cache hits return the cached value on the very first render so
// there is no flash of the short address form for already-known addresses.
export const useEnsName = (address) => {
  const initial = (() => {
    if (!isAddress(address)) return null;
    const key = address.toLowerCase();
    if (memCache.has(key)) return memCache.get(key);
    const stored = readStorage(STORAGE_PREFIX + key);
    if (stored) {
      memCache.set(key, stored.name);
      return stored.name;
    }
    return null;
  })();

  const [name, setName] = useState(initial);

  useEffect(() => {
    if (!isAddress(address)) {
      setName(null);
      return undefined;
    }
    let cancelled = false;
    resolveEns(address).then((resolved) => {
      if (!cancelled) setName(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return name;
};
