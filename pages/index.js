import React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import ButtonConnectWallet from '../components/ButtonConnectWallet';
import WalletIsNotConnected from '../components/WalletIsNotConnected';
import { ethers } from 'ethers';

const AblyChatComponent = dynamic(
  () => import('../components/AblyChatComponent'),
  { ssr: false }
);

export default function Home() {
  // const [currentUserWalletAddress, setCurrentUserWalletAddress] =
  //   React.useState('Connect your wallet');

  let [userAccount, setUserAccount] = React.useState({
    isConnect: false,
    username: '',
    connectButtonName: 'Connect Wallet',
  });

  const isBrowserWithMetamask =
    typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

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
    if (!isBrowserWithMetamask) return;

    const walletAddressLocalStorage = window.localStorage.getItem('walletAddress')
    const isUserConnectedLocalStorage = window.localStorage.getItem('isUserConnected')

    if (walletAddressLocalStorage && isUserConnectedLocalStorage) {
      connectWallet(); // reconnect metamask
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
      console.log('accountsChanged event');
      localStorage.clear(); // clear all item stored in localStorage
      setUserAccount((prev) => {
        return {
          ...prev,
          isConnect: false,
          username: '',
          connectButtonName: 'Connect Wallet',
        };
      });
    });
  }, []);

  async function connectWallet() {
    if (isBrowserWithMetamask) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        const [currentWalletAddress] = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });

        let connection = await isUserConnect();

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
            connectButtonName: connection.connectButtonName,
          };
        });
      } catch (e) {
        console.log('Problem with loading account', e);
      }
    } else {
      alert(
        'MetaMask is not installed. Please consider installing it: https://metamask.io/download.html'
      );
    }
  }

  return (
    <>
      <Head>
        <title>Chat</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <ButtonConnectWallet
        getConnect={connectWallet}
        connect={userAccount.connectButtonName}
      />
      {/* if wallet is connected, display the chat */}
      {userAccount.username ? (
        <AblyChatComponent currentUserWalletAddress={userAccount.username} />
      ) : (
        // if not, display the message 'connect wallet'
        <WalletIsNotConnected />
      )}
    </>
  );
}
