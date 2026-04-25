'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import ButtonConnectWallet from '../components/ButtonConnectWallet';
import WalletIsNotConnected from '../components/WalletIsNotConnected';
import AblyConfigError from '../components/AblyConfigError';
import { ethers } from 'ethers';
import { requestSiweSignature } from '../lib/siwe';

const AblyChatComponent = dynamic(
  () => import('../components/AblyChatComponent'),
  { ssr: false }
);

const isAblyConfigured = Boolean(process.env.ABLY_API_KEY);

export default function Home() {

  let [userAccount, setUserAccount] = React.useState({
    isConnect: false,
    username: '',
    userType: null,
    connectButtonName: 'Connect Wallet',
  });

  // Holds an async cleanup registered by AblyChatComponent. Used on logout to
  // leave presence and close the Ably connection before reloading.
  const ablyCleanupRef = React.useRef(null);

  // Check if user is connected
  let isUserConnect = async () => {
    const [currentWalletAddress] = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    if (currentWalletAddress !== 0) {
      return {
        status: true,
        walletAddress: currentWalletAddress,
        connectButtonName: currentWalletAddress,
      };
    } else {
      return {
        status: false,
        walletAddress: '',
        connectButtonName: 'Connect Wallet',
      };
    }
  };

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const wasLoggedOut = window.localStorage.getItem('wasLoggedOut') === 'true'

    // Skip auto-connect if the user explicitly logged out
    if (wasLoggedOut) {
      return;
    }

    // Restore guest session if present
    const guestId = window.localStorage.getItem('guestId');
    if (guestId) {
      setUserAccount({
        isConnect: true,
        username: guestId,
        userType: 'guest',
        connectButtonName: guestId,
      });
      return;
    }

    const isBrowserWithMetamask = typeof window.ethereum !== 'undefined';
    if (!isBrowserWithMetamask) return;

    const walletAddressLocalStorage = window.localStorage.getItem('walletAddress')
    const isUserConnectedLocalStorage = window.localStorage.getItem('isUserConnected')

    if (walletAddressLocalStorage && isUserConnectedLocalStorage) {
      connectWallet();
    } else {
      // if user do not connected
      if (window.ethereum.selectedAddress === null) {
        console.log('Welcome User!');
      } else {
        connectWallet();
      }
    }

    // Reset data when MetaMask disconnects
    window.ethereum.on('accountsChanged', async () => {
      localStorage.clear();
      setUserAccount((prev) => {
        return {
          ...prev,
          isConnect: false,
          username: '',
          userType: null,
          connectButtonName: 'Connect Wallet',
        };
      });
    });
  }, []);

  async function connectWallet() {
    const isBrowserWithMetamask =
      typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
    if (isBrowserWithMetamask) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        const [currentWalletAddress] = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });

        let connection = await isUserConnect();

        // Clear the explicit-logout flag on successful manual connect
        window.localStorage.removeItem('wasLoggedOut');

        window.localStorage.setItem(
          'isUserConnected',
          connection.status
        );

        window.localStorage.setItem(
          'walletAddress',
          connection.walletAddress
        );

        setUserAccount((prev) => {
          return {
            ...prev,
            isConnect: connection.status,
            username: connection.walletAddress,
            userType: 'wallet',
            connectButtonName: connection.connectButtonName,
          };
        });

        // Fire SIWE-light signature request best-effort. We do not block the
        // chat UI on it: if the user rejects, the chat still opens, they just
        // do not get a verified \u2713 next to their nick. The chainId is fetched
        // from the wallet (not from the network object above) so users on
        // L2s see the right chain in their signed message.
        try {
          const chainHex = await window.ethereum.request({ method: 'eth_chainId' });
          requestSiweSignature({ address: connection.walletAddress, chainId: chainHex });
        } catch (sigErr) { /* best-effort */ }
      } catch (e) {
        console.log('Problem with loading account', e);
      }
    } else {
      alert(
        'No Web3 wallet detected. Please install MetaMask, Coinbase Wallet, Rabby, or any other Web3 wallet to continue.'
      );
    }
  }

  const joinAsGuest = (nickname) => {
    const trimmed = (nickname || '').trim();
    if (!trimmed) return;
    window.localStorage.removeItem('wasLoggedOut');
    window.localStorage.setItem('guestId', trimmed);
    window.localStorage.setItem('isUserConnected', 'true');
    setUserAccount({
      isConnect: true,
      username: trimmed,
      userType: 'guest',
      connectButtonName: trimmed,
    });
  };

  const handleLogout = async () => {
    // Drop any cached SIWE payload so a different wallet on the same tab
    // does not inherit the previous user's verified badge.
    try { sessionStorage.clear(); } catch (e) {}
    localStorage.clear();
    // Remember explicit logout so the app does not auto-reconnect on reload
    localStorage.setItem('wasLoggedOut', 'true');
    // Explicitly leave presence and close the Ably connection so the next
    // user does not see a stale presence entry for the previous session.
    if (ablyCleanupRef.current) {
      try {
        await ablyCleanupRef.current();
      } catch (e) {
        // ignore best-effort cleanup errors
      }
    }
    // Reload the page so the Ably client (singleton with cached clientId) is
    // fully reset. Without a reload, a subsequent login would keep the previous
    // user's presence entry and publish messages under the old clientId.
    if (typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    setUserAccount({
      isConnect: false,
      username: '',
      userType: null,
      connectButtonName: 'Connect Wallet',
    });
  };

  return (
    <>
      <ButtonConnectWallet
        connect={userAccount.connectButtonName}
        userType={userAccount.userType}
        onLogout={handleLogout}
      />
      {userAccount.username ? (
        isAblyConfigured ? (
          <AblyChatComponent
            currentUserWalletAddress={userAccount.username}
            userType={userAccount.userType}
            cleanupRef={ablyCleanupRef}
          />
        ) : (
          <AblyConfigError />
        )
      ) : (
        <WalletIsNotConnected
          onJoinAsGuest={joinAsGuest}
          onConnectWallet={connectWallet}
        />
      )}
    </>
  );
}
