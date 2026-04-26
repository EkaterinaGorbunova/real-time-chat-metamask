import React from 'react';
import ThemeToggle from './ThemeToggle';
import Avatar from './Avatar';
import { useEnsName } from '../lib/ens';

const ButtonConnectWallet = (props) => {
  const isGuest = props.userType === 'guest';
  // For wallet users, prefer ENS name over the raw address. Hook returns null
  // for guests (non-address inputs) so the original label is shown unchanged.
  const ensName = useEnsName(isGuest ? null : props.connect);

  const shortenAddress = (address) => {
    if (address === 'Connect Wallet') return address;
    if (isGuest) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const fullLabel = ensName || props.connect;
  const shortLabel = ensName || shortenAddress(props.connect);

  async function handleLogout(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    props.onLogout();
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-(--bg)/70 backdrop-blur-xl border-b border-(--border)">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between p-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-(--accent-soft) border border-(--accent)/30 text-(--accent)">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-tight text-(--text)">Web3 Chat</span>
          </div>

          <div className="flex items-center gap-2">
            {props.connect !== 'Connect Wallet' && (
              <>
                <div
                  title={props.connect}
                  className="group relative flex items-center px-3 py-2 rounded-lg justify-center bg-(--surface-muted) border border-(--border) text-(--text)"
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-(--online) opacity-60 animate-ping" />
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-(--online)" />
                    </span>
                    <Avatar
                      type={isGuest ? 'guest' : 'wallet'}
                      address={isGuest ? null : props.connect}
                      nickname={isGuest ? props.connect : null}
                      size={20}
                    />
                    <span className="hidden sm:block text-sm font-medium">{fullLabel}</span>
                    <span className="sm:hidden text-sm font-medium">{shortLabel}</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-(--border) bg-(--surface-muted) text-(--text-muted) hover:text-(--accent) hover:border-(--accent) transition-colors"
                  title="Logout"
                  aria-label="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ButtonConnectWallet;
