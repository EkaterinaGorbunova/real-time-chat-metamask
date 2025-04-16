import React, { useEffect, useState } from 'react';
import { configureAbly, useChannel } from '@ably-labs/react-hooks';
import { usePresence, assertConfiguration } from "@ably-labs/react-hooks";

configureAbly({
  key: process.env.ABLY_API_KEY,
  clientId: window.ethereum.selectedAddress,
});

const AblyChatComponent = (props) => {
  let inputBox = null;
  const messagesEndRef = React.useRef(null);

  const [messageText, setMessageText] = useState('');
  const [receivedMessages, setMessages] = useState([]);
  const [numberOfMembers, setNumberOfMembers] = useState(0);
  const messageTextIsEmpty = messageText.trim().length === 0;

  // Переместили функцию внутрь компонента
  const shortenAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const [channel, ably] = useChannel('chatroom', (message) => {
    try {
      setMessages((history) => [...history.slice(-199), message]);
    } catch (error) {
      if (error.statusCode === 410) {
        console.error('Error: Channel "chatroom" does not exist (410 Gone)');
      } else {
        console.error('Error publishing message:', error);
      }
    }
  });

  const [presenceData] = usePresence("headlines");

    React.useEffect(() => {
      const updateMemberCount = async () => {
        setNumberOfMembers(presenceData?.length || 0);
      };
  
      updateMemberCount();
  
      // Update member count on presence changes
      if (presenceData && presenceData.channel) {
        const presenceChannel = presenceData.channel;
        presenceChannel.once('enter', updateMemberCount);
        presenceChannel.once('leave', updateMemberCount);
      }
  
      return () => {
        // Cleanup function: remove event listeners
        if (presenceChannel) {
          presenceChannel.off('enter', updateMemberCount);
          presenceChannel.off('leave', updateMemberCount);
        }
      };
    }, [presenceData]); // Dependency array: update on presenceData change
  
    const presenceList = presenceData.map((member, index) => {
      const isItMe = member.clientId === ably.auth.clientId;
      const shortenAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
      };

      return (
        <div key={index} className="py-2 px-3 rounded-lg hover:bg-gray-50 group">
          <div className="text-gray-700 text-sm flex items-center justify-between">
            <span className="truncate">
              {shortenAddress(member.clientId)}
              {isItMe && <span className="text-gray-400 text-xs ml-1">(me)</span>}
            </span>
          </div>
        </div>
      );
    });
  
  const sendChatMessage = (messageText) => {
    channel.publish({ name: 'chat-message', data: messageText });
    setMessageText('');
    inputBox.focus();
  };

  const handleFormSubmission = (event) => {
    event.preventDefault();
    sendChatMessage(messageText);
  };

  const handleKeyPress = (event) => {
    if (event.charCode !== 13 || messageTextIsEmpty) {
      return;
    }
    sendChatMessage(messageText);
    event.preventDefault();
  };

  const messages = receivedMessages.map((message, index) => {
    const author =
      message.connectionId === ably.connection.id
        ? 'me ' + message.clientId + ':'
        : message.clientId + ':';

    return (
      <span
        key={index}
        className={`${
          author.includes('me')
            ? 'bg-gray-100 place-self-start rounded-bl-none'
            : 'bg-blue-100 place-self-end rounded-br-none'
        } text-sm md:text-md p-4 rounded-lg grow-0 shadow`}
        data-author={author}
      >
        <div className='w-full'>
          <span className='block ml-2 font-semibold text-gray-600'>
            {author}
          </span>
          <span className='block ml-2 text-sm text-gray-600'>
            {message.data}
          </span>
        </div>
      </span>
    );
  });

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest',
    });
  }, [messages]);

  return (
    <div className="container mx-auto pt-32 md:pt-20"> {/* Увеличили отступ на мобильных до 128px */}
      <div className="min-w-full border border-gray-200 rounded-xl shadow-lg overflow-hidden lg:grid lg:grid-cols-4">
        {/* Main Chat Area */}
        <div className="lg:col-span-3 bg-white">
          <div className="grid grid-rows-[1fr_auto]">
            <div className="flex flex-col gap-4 p-6 h-[calc(100vh-220px)] lg:h-[calc(100vh-160px)] overflow-y-auto bg-gray-50">
              {props.currentUserWalletAddress !== 'Connect your wallet' &&
                receivedMessages.map((message, index) => {
                  const isMe = message.connectionId === ably.connection.id;
                  return (
                    <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
                      <div className={`max-w-[70%] break-words ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-t-xl rounded-l-xl' 
                          : 'bg-white border border-gray-200 rounded-t-xl rounded-r-xl'
                      } p-4 shadow-sm`}>
                        <div className="text-xs mb-1 opacity-80">
                          {isMe ? 'You' : shortenAddress(message.clientId)}
                        </div>
                        <div className="text-sm whitespace-pre-wrap break-words overflow-hidden">
                          {message.data}
                        </div>
                      </div>
                    </div>
                  );
                })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {props.currentUserWalletAddress !== 'Connect your wallet' && (
              <form onSubmit={handleFormSubmission} className="p-4 bg-white border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <input
                    ref={(element) => { inputBox = element; }}
                    type="text"
                    value={messageText}
                    placeholder="Type your message..."
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={messageTextIsEmpty}
                    className="flex-shrink-0 p-2 rounded-full bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                  >
                    <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Sidebar*/}
        <div className="border-t lg:border-t-0 lg:border-l border-gray-200 bg-white">
          <div className="p-6">
            <h3 className="text-md font-medium text-gray-900 flex items-center gap-2">
              {props.currentUserWalletAddress === 'Connect your wallet' ? (
                "Connect Wallet to Chat"
              ) : (
                <>
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full"/>
                  <span>Online Users ({numberOfMembers})</span>
                </>
              )}
            </h3>
            <div className="space-y-1 mt-4">
              {presenceList}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AblyChatComponent;
