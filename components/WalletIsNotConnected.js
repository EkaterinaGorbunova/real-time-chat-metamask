import React, { useState, useEffect } from 'react';

const generateGuestName = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `Guest-${id}`;
};

const MAX_NICKNAME_LENGTH = 24;

const WalletIsNotConnected = ({ onJoinAsGuest, onConnectWallet }) => {
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    setNickname(generateGuestName());
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!onJoinAsGuest) return;
    const trimmed = nickname.trim();
    if (!trimmed) return;
    onJoinAsGuest(trimmed);
  };

  const handleConnectWallet = (e) => {
    e.preventDefault();
    if (onConnectWallet) onConnectWallet();
  };

  const isValid = nickname.trim().length > 0;

  return (
    <div className="container mx-auto pt-24 md:pt-28">
      <div className="max-w-5xl mx-auto px-6 pb-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[color:var(--text)]">
            Chat for the <span className="text-[color:var(--accent)]">decentralized</span> web
          </h1>
          <p className="mt-3 text-[color:var(--text-muted)] text-sm md:text-base">
            Bring your wallet or just a nickname &mdash; pick how you want to join the conversation.
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-stretch gap-6">
          <div className="flex-1 relative rounded-2xl p-8 border border-[color:var(--border)] bg-[color:var(--surface)]/80 backdrop-blur-xl text-center flex flex-col transition-colors hover:border-[color:var(--accent)]/40">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[color:var(--accent)]/40 to-transparent" />
            <div className="text-5xl mb-3" aria-hidden="true">💎</div>
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)] mb-2">Connect Your Wallet</h2>
            <p className="text-[color:var(--text-muted)] mb-6 text-sm">
              Connect any Web3 wallet to start chatting. <br/> Your wallet address will be used as your username in the chat.
            </p>
            <div className="mt-auto">
              <button
                type="button"
                onClick={handleConnectWallet}
                className="w-full px-6 py-2.5 rounded-lg bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white font-medium transition-all shadow-glow-sm hover:shadow-glow"
              >
                Connect Wallet
              </button>
              <p className="text-xs text-[color:var(--text-subtle)] mt-3">
                Wallet users are marked with a 💎 badge and identified by address.
              </p>
            </div>
          </div>

          <div className="flex md:hidden items-center gap-3 text-[color:var(--text-subtle)] text-sm">
            <div className="flex-1 h-px bg-[color:var(--border)]" />
            <span>or</span>
            <div className="flex-1 h-px bg-[color:var(--border)]" />
          </div>

          <div className="flex-1 relative rounded-2xl p-8 border border-[color:var(--border)] bg-[color:var(--surface)]/80 backdrop-blur-xl text-center flex flex-col transition-colors hover:border-[color:var(--accent)]/40">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[color:var(--accent)]/40 to-transparent" />
            <div className="text-5xl mb-3" aria-hidden="true">👤</div>
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)] mb-2">Continue as Guest</h2>
            <p className="text-[color:var(--text-muted)] mb-6 text-sm">
              No wallet? No problem. Pick a nickname and start chatting.
            </p>
            <div className="mt-auto">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={MAX_NICKNAME_LENGTH}
                  placeholder="Your nickname"
                  aria-label="Guest nickname"
                  className="flex-1 px-4 py-2.5 text-base bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-subtle)] rounded-lg focus:outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/30 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!isValid}
                  className="px-6 py-2.5 rounded-lg bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-glow-sm hover:shadow-glow disabled:shadow-none"
                >
                  Join as Guest
                </button>
              </form>
              <p className="text-xs text-[color:var(--text-subtle)] mt-3">
                Guests are marked with a 👤 badge and cannot be verified.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletIsNotConnected;
