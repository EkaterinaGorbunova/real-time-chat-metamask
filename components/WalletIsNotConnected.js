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
    <div className="container mx-auto pt-20">
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex flex-col md:flex-row md:items-stretch gap-6">
          <div className="flex-1 bg-white rounded-xl shadow-lg p-8 border border-gray-200 text-center flex flex-col">
            <div className="text-5xl mb-3" aria-hidden="true">💎</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-6">
              Connect any Web3 wallet to start chatting. <br/> Your wallet address will be used as your username in the chat.
            </p>
            <div className="mt-auto">
              <button
                type="button"
                onClick={handleConnectWallet}
                className="w-full px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
              >
                Connect Wallet
              </button>
              <p className="text-xs text-gray-400 mt-3">
                Wallet users are marked with a 💎 badge and identified by address.
              </p>
            </div>
          </div>

          <div className="flex md:hidden items-center gap-3 text-gray-400 text-sm">
            <div className="flex-1 h-px bg-gray-200" />
            <span>or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="flex-1 bg-white rounded-xl shadow-lg p-8 border border-gray-200 text-center flex flex-col">
            <div className="text-5xl mb-3" aria-hidden="true">👤</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Continue as Guest</h2>
            <p className="text-gray-600 mb-6">
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
                  className="flex-1 px-4 py-2 text-base bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!isValid}
                  className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Join as Guest
                </button>
              </form>
              <p className="text-xs text-gray-400 mt-3">
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
