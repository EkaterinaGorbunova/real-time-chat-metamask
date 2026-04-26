// Deterministic identicon avatar used in the chat UI.
//
// - Wallet users: react-jazzicon seeded from the address. Same address always
//   produces the same colorful blob, on every device, with no network call.
// - Guest users: a small colored circle with the first letter of the nickname,
//   colored deterministically by hashing the nickname. Keeps a visual
//   distinction from wallet users (no jazzicon for guests).
//
// We keep this component pure-presentational so it can be reused inside the
// member sidebar, message bubbles, and the connected-wallet header.

import React from 'react';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';

const GUEST_PALETTE = [
  '#a78bfa', '#38bdf8', '#34d399', '#fbbf24',
  '#f472b6', '#fb7185', '#60a5fa', '#c084fc',
];

const hashString = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const GuestBubble = ({ nickname, size }) => {
  const safe = (nickname || '?').trim() || '?';
  const initial = safe.charAt(0).toUpperCase();
  const color = GUEST_PALETTE[hashString(safe) % GUEST_PALETTE.length];
  // Inline styles only for size/color (per-instance); typography from Tailwind
  // for consistency with the rest of the UI.
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.max(10, Math.floor(size * 0.55)),
        lineHeight: `${size}px`,
      }}
      className="inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0 select-none"
    >
      {initial}
    </span>
  );
};

const Avatar = ({ type, address, nickname, size = 20 }) => {
  if (type === 'wallet' && address) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center rounded-full overflow-hidden shrink-0"
        style={{ width: size, height: size }}
      >
        <Jazzicon diameter={size} seed={jsNumberForAddress(address)} />
      </span>
    );
  }
  return <GuestBubble nickname={nickname} size={size} />;
};

export default Avatar;
