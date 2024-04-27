import React from 'react';

const ButtonConnectWallet = (props) => {
  async function connectWallet(ev) {
    ev.preventDefault();
    props.getConnect();
  }
  return (
    <div className='container mx-auto'>
      <div className='relative flex min-w-full  items-center p-3'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-9 w-9 rounded-full hidden md:block'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
          strokeWidth={1}
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
        <button
          className='block text-left overflow-hidden whitespace-nowrap ml-2 font-bold text-gray-600 hover:text-gray-500 text-sm md:text-md'
          onClick={(ev) => connectWallet(ev)}
        >
          {props.connect}
        </button>
        {props.connect === 'Connect Wallet' ? (
          <span className='absolute w-2.5 h-2.5 md:w-2.5 md:h-2.5 bg-red-600 rounded-full left-1 md:left-9 top-4.5 md:top-4'></span>
        ) : (
          <span className='absolute w-2.5 h-2.5 bg-green-600 rounded-full left-1 md:left-9 top-4.5 md:top-4'></span>
        )}
      </div>
    </div>
  );
};
export default ButtonConnectWallet;
