import React from 'react';

const ButtonConnectWallet = (props) => {
  const shortenAddress = (address) => {
    if (address === 'Connect Wallet') return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  async function connectWallet(ev) {
    ev.preventDefault();
    props.getConnect();
  }

  async function handleLogout(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    props.onLogout();
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between p-4 gap-3">
          <div className="flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
            <span className="text-xl font-bold text-gray-800">Web3 Chat</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={(ev) => connectWallet(ev)}
              title={props.connect !== 'Connect Wallet' ? props.connect : ''}
              className={`group relative flex items-center px-4 py-2 rounded-lg w-full md:w-auto justify-center ${
                props.connect === 'Connect Wallet'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {props.connect === 'Connect Wallet' ? (
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                ) : (
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                )}
                {props.connect === 'Connect Wallet' ? (
                  <span className="font-medium">Connect Wallet</span>
                ) : (
                  <>
                    <span className="hidden sm:block font-medium">{props.connect}</span>
                    <span className="sm:hidden font-medium">{shortenAddress(props.connect)}</span>
                    <div className="absolute invisible group-hover:visible bg-gray-900 text-white text-xs rounded-md py-1 px-2 -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                      {props.connect}
                    </div>
                  </>
                )}
              </div>
            </button>
            
            {props.connect !== 'Connect Wallet' && (
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                title="Logout"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ButtonConnectWallet;
