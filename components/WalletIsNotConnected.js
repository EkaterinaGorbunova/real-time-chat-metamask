import React from 'react';

const WalletIsNotConnected = () => {
  return (
    <div className='container mx-auto'>
      <div className='relative flex min-w-full items-center border-t border-gray-300'>
        <div className='relative flex text-lg text-gray-600 p-3'>
          Connect your metamask wallet to chat. Your wallet address will be used
          as your username in the chat.
        </div>
      </div>
    </div>
  );
};
export default WalletIsNotConnected;
