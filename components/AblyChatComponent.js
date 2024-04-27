import React, { useEffect, useState } from 'react';
import { configureAbly, useChannel } from '@ably-labs/react-hooks';
import { usePresence, assertConfiguration } from "@ably-labs/react-hooks";

// get wallet address from local storage
const walletAddressFromLocalStorage =
  window.localStorage.getItem('walletAddress');

configureAbly({
  key: process.env.ABLY_API_KEY,
  clientId: walletAddressFromLocalStorage.replaceAll('"', ''),
});
console.log('configureAbly', configureAbly());

const AblyChatComponent = (props) => {
  let inputBox = null;
  const messagesEndRef = React.useRef(null);

  const [messageText, setMessageText] = useState('');
  const [receivedMessages, setMessages] = useState([]);
  const [numberOfMembers, setNumberOfMembers] = useState(0);
  const messageTextIsEmpty = messageText.trim().length === 0; 

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
      const isItMe = member.clientId === ably.auth.clientId ? " (me)" : "";
      return (
        <li key={index}>
          <span>{member.clientId}</span>
          <span>{isItMe}</span>
        </li>
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
    // console.log('message.data', message.data);
    // console.log('message.connectionId', message.connectionId);
    // console.log('ably.connection.id', ably.connection.id);
    // console.log('message.clientId', message.clientId);

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
    <>
      <div className='container mx-auto'>
        <div className='min-w-full border border-gray-300 rounded lg:grid lg:grid-cols-3'>
          {/* left section */}
          <div className='lg:col-span-2 lg:block'>
            <div className='w-full'>
              <div className='grid grid-rows-[1fr_100px]'>
                <div className='flex flex-col items-start gap-4 p-4 h-[calc(100vh-20px-50px-50px-50px)] overflow-y-auto'>
                  {props.currentUserWalletAddress !== 'Connect your wallet' &&
                    messages}
                  <div ref={messagesEndRef}></div>
                  {/* empty element to control scroll to bottom */}
                </div>
                {props.currentUserWalletAddress !== 'Connect your wallet' && (
                  <form
                    onSubmit={handleFormSubmission}
                    className='flex items-center justify-between w-full p-3 border-b md:border-b-0 border-t border-gray-300'
                  >
                    <input
                      ref={(element) => {
                        inputBox = element;
                      }}
                      type='text'
                      value={messageText}
                      placeholder='Type your message...'
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className='block w-full py-2 pl-4 mx-3 bg-gray-100 rounded-full outline-none focus:text-gray-700 focus:ring-1 focus:ring-indigo-300'
                    ></input>
                    <button
                      type='submit'
                      className='disabled:text-gray-400'
                      disabled={messageTextIsEmpty}
                    >
                      <svg
                        className={`${
                          !messageTextIsEmpty && 'text-indigo-500'
                        } w-5 h-5 origin-center transform rotate-90 `}
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 20 20'
                        fill='currentColor'
                      >
                        <path d='M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z' />
                      </svg>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
          {/* right section */}
          <div className='border-l-0 md:border-l border-gray-300 lg:col-span-1'>
            <div className='mx-3 my-3'>
              <div className='relative flex text-lg text-gray-600'>
                {props.currentUserWalletAddress == 'Connect your wallet' ? (
                  <div>
                    Connect your wallet to join the chat. <br /> Username will
                    be assigned as a random number.
                  </div>
                ) : (
                  <>
                    <div className='w-2.5 h-2.5 bg-green-600 rounded-full my-auto mr-1.5'></div>
                    <div className=''>People Online ({numberOfMembers})</div>
                  </>
                )}
              </div>
            </div>
            <div className='overflow-auto h-[calc(100vh-40px-100px-100px-100px)]'>
              {/* get a list of users online */}
              <ul>{presenceList}</ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AblyChatComponent;
