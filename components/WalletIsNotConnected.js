import React from 'react';

const WalletIsNotConnected = () => {
  return (
    <div className="container mx-auto pt-20">
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600">
            Connect your MetaMask wallet to start chatting. <br/> Your wallet address will be used as your username in the chat.
          </p>
        </div>
      </div>
    </div>
  );
};
export default WalletIsNotConnected;
