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
  const [currentUserWalletAddress, setCurrentUserWalletAddress] =
    React.useState('Connect your wallet');

  // Check for window and ethereum objects only once
  const isBrowserWithMetamask =
    typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

  React.useEffect(() => {
    if (!isBrowserWithMetamask) return; // Guard against non-browser or missing Metamask

    // Get all cookie as JS Obj
    let res = '';
    let allCookies = document.cookie;
    // Get cookies as an Object
    if (allCookies) {
      console.log('allCookies:', allCookies);
      const parseCookies = (str) =>
        str
          // separate key-value pairs from each other
          .split(';')
          // separate keys from values in each pair
          .map((v) => v.split('='))
          // create an object with all key-value pairs
          .reduce((acc, v) => {
            acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(
              v[1].trim()
            );
            return acc;
          }, {});
      res = parseCookies(allCookies);
      console.log('parseCookies res:', res);
      if (res.isConnected) {
        console.log('res.isConnected', res.isConnected);
        connectWallet();
      }
    } else {
      // if user do not connected
      if (window.ethereum.selectedAddress === null) {
        console.log('Welcome User!');
      } else {
        connectWallet();
      }
      console.log('No cookies');
    }

    // // Disconnect metamask wallet and reset data
    // window.ethereum.on('accountsChanged', async () => {
    //   console.log('accountsChanged event');
    //   localStorage.clear(); // clear all item stored in localStorage
    //   setCurrentUserWalletAddress('Connect your wallet');
    // });
  }, [currentUserWalletAddress]);

  // Disconnect metamask wallet and reset data
  if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
    // We are in the browser and metamask is running
    window.ethereum.on('accountsChanged', async () => {
      console.log('accountsChanged event');
      localStorage.clear(); // clear all item stored in localStorage
      setCurrentUserWalletAddress('Connect your wallet');
    });
  }

  async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        const [currentWalletAddress] = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        // set wallet address to localStorage
        window.localStorage.setItem(
          'walletAddress',
          JSON.stringify(currentWalletAddress)
        );
        // console.log('Network name is', network.name);
        // console.log('Current wallet address:', currentWalletAddress);
        setCurrentUserWalletAddress(currentWalletAddress);
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
        getCurrenUsertWalletAddress={connectWallet}
        currentUserWalletAddress={currentUserWalletAddress}
      />
      {/* if wallet is connected, display the chat */}
      {currentUserWalletAddress !== 'Connect your wallet' ? (
        <AblyChatComponent
          currentUserWalletAddress={currentUserWalletAddress}
        />
      ) : (
        // if not, display the message 'connect wallet'
        <WalletIsNotConnected />
      )}
    </>
  );
}
