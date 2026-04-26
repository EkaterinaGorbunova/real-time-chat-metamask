import React from 'react';
import { ethers } from 'ethers';
import { getChainInfo, getExplorerTxUrl } from '../lib/chains';

// Modal that lets the local wallet user send a native-coin tip to another
// participant. Talks to MetaMask directly via window.ethereum — no backend
// involved. The recipient's display name (ENS / shortened address) is
// resolved by the caller and passed in as `recipientLabel`.
const TipModal = ({ open, onClose, recipientAddress, recipientLabel, fromAddress, chainId }) => {
  const [amount, setAmount] = React.useState('0.001');
  const [status, setStatus] = React.useState('idle'); // idle | pending | success | error
  const [txHash, setTxHash] = React.useState(null);
  const [error, setError] = React.useState(null);
  const inputRef = React.useRef(null);

  // Reset state every time the modal opens. Without this a previously-failed
  // tip would still show its error after re-opening for a new recipient.
  React.useEffect(() => {
    if (open) {
      setAmount('0.001');
      setStatus('idle');
      setTxHash(null);
      setError(null);
      // Defer focus so the element is mounted before we focus it.
      setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 0);
    }
  }, [open]);

  // Close on Escape so the modal does not trap focus when the user changes
  // their mind. Click on the backdrop also closes.
  React.useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const chainInfo = getChainInfo(chainId);
  const ticker = (chainInfo && chainInfo.short) || 'ETH';

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    let valueWei;
    try {
      valueWei = ethers.parseEther(String(amount).trim());
    } catch (parseErr) {
      setError('Enter a valid amount (e.g. 0.001).');
      return;
    }
    if (valueWei <= 0n) { setError('Amount must be greater than zero.'); return; }
    if (!window.ethereum || typeof window.ethereum.request !== 'function') {
      setError('No Web3 wallet detected.');
      return;
    }
    setStatus('pending');
    try {
      const hash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: fromAddress, to: recipientAddress, value: ethers.toBeHex(valueWei) }],
      });
      setTxHash(hash);
      setStatus('success');
    } catch (sendErr) {
      // 4001 is the EIP-1193 user-rejected code. Surface a friendly message
      // so the modal does not look broken when the user dismissed MetaMask.
      const msg = (sendErr && sendErr.code === 4001)
        ? 'Transaction rejected in wallet.'
        : (sendErr && sendErr.message) || 'Transaction failed.';
      setError(msg);
      setStatus('error');
    }
  };

  const explorerUrl = getExplorerTxUrl(chainId, txHash);

  return (
    <div
      data-testid="tip-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-(--border) bg-(--surface) p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-(--text)">Send a tip</h3>
            <p className="text-xs text-(--text-muted) mt-0.5 break-all">
              To <span className="text-(--text)">{recipientLabel}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-(--text-muted) hover:text-(--text) -mt-1 -mr-1 px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>

        <label className="block text-xs text-(--text-muted) mb-1" htmlFor="tip-amount">
          Amount ({ticker})
        </label>
        <div className="relative">
          <input
            id="tip-amount"
            ref={inputRef}
            data-testid="tip-amount-input"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={status === 'pending' || status === 'success'}
            className="w-full text-base px-3 py-2 rounded-lg bg-(--surface-muted) border border-(--border) text-(--text) focus:outline-none focus:border-(--accent)"
            placeholder="0.001"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-(--text-subtle)">{ticker}</span>
        </div>

        {error && <p data-testid="tip-error" className="mt-3 text-sm text-red-400">{error}</p>}
        {status === 'success' && (
          <p data-testid="tip-success" className="mt-3 text-sm text-emerald-400">
            Sent! {explorerUrl ? (
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-300">
                View on explorer
              </a>
            ) : (
              <span className="break-all opacity-80">{txHash}</span>
            )}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-3 py-2 text-sm rounded-lg text-(--text-muted) hover:text-(--text)">
            {status === 'success' ? 'Close' : 'Cancel'}
          </button>
          {status !== 'success' && (
            <button type="submit" disabled={status === 'pending'} data-testid="tip-submit"
              className="px-4 py-2 text-sm rounded-lg bg-(--accent) hover:bg-(--accent-hover) text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed">
              {status === 'pending' ? 'Sending…' : `Send ${ticker}`}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default TipModal;
