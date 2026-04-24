import React, { useEffect, useState } from 'react';
import { configureAbly, useChannel } from '@ably-labs/react-hooks';
import { usePresence, assertConfiguration } from "@ably-labs/react-hooks";

// Resolve the Ably clientId from either a connected wallet or a stored guest session.
// Prefixes let the chat UI distinguish wallet users from guests.
const resolveClientId = () => {
  if (typeof window === 'undefined') return null;
  const guestId = window.localStorage.getItem('guestId');
  if (guestId) return `guest:${guestId}`;
  const walletAddress = window.ethereum && window.ethereum.selectedAddress;
  if (walletAddress) return `wallet:${walletAddress}`;
  return null;
};

configureAbly({
  key: process.env.ABLY_API_KEY,
  clientId: resolveClientId(),
});

const parseClientId = (clientId) => {
  if (!clientId) return { type: 'unknown', display: '', icon: '❓' };
  if (clientId.startsWith('guest:')) {
    return { type: 'guest', display: clientId.slice(6), icon: '👤' };
  }
  if (clientId.startsWith('wallet:')) {
    const addr = clientId.slice(7);
    const display = addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
    return { type: 'wallet', display, icon: '💎' };
  }
  // Backward compatibility: raw wallet address without prefix
  const display = clientId.length > 10 ? `${clientId.slice(0, 6)}...${clientId.slice(-4)}` : clientId;
  return { type: 'wallet', display, icon: '💎' };
};

const AblyChatComponent = (props) => {
  let inputBox = null;
  const messagesEndRef = React.useRef(null);
  const messagesContainerRef = React.useRef(null);

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

  // Expose an imperative cleanup so the parent can explicitly leave presence
  // and close the Ably connection before reloading on logout. Without this,
  // the Ably server keeps the previous clientId in the presence set for up to
  // ~2 minutes, so the next user sees a stale member.
  React.useEffect(() => {
    const ref = props.cleanupRef;
    if (!ref) return;
    ref.current = async () => {
      try {
        if (channel && channel.presence) {
          await channel.presence.leave();
        }
      } catch (e) {
        // best-effort leave
      }
      try {
        if (ably && typeof ably.close === 'function') {
          ably.close();
        }
      } catch (e) {
        // best-effort close
      }
    };
    return () => {
      ref.current = null;
    };
  }, [channel, ably, props.cleanupRef]);

    // Deduplicate presence by clientId so a user opening the chat in multiple
    // tabs or devices appears as a single member (same identity = same entry).
    const uniquePresence = React.useMemo(() => {
      const seen = new Map();
      (presenceData || []).forEach((member) => {
        if (member && member.clientId && !seen.has(member.clientId)) {
          seen.set(member.clientId, member);
        }
      });
      return Array.from(seen.values());
    }, [presenceData]);

    React.useEffect(() => {
      const updateMemberCount = async () => {
        setNumberOfMembers(uniquePresence.length);
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
    }, [presenceData, uniquePresence]); // Dependency array: update on presenceData change

    const presenceList = uniquePresence.map((member, index) => {
      const isItMe = member.clientId === ably.auth.clientId;
      const { display, icon, type } = parseClientId(member.clientId);

      return (
        <div key={member.clientId || index} className="py-2 px-3 rounded-lg hover:bg-gray-50 group">
          <div className="text-gray-700 text-sm flex items-center justify-between">
            <span className="truncate flex items-center gap-1.5">
              <span aria-hidden="true">{icon}</span>
              <span className="truncate">{display}</span>
              {type === 'guest' && (
                <span className="text-gray-400 text-xs">(guest)</span>
              )}
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
    // Compare by clientId so messages from any of the user's own tabs/devices
    // are rendered as "me" in all of them.
    const author =
      message.clientId === ably.auth.clientId
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

  // Auto-scroll only when the number of messages actually changes. Depending on
  // the `messages` array (recreated on every render) caused the effect to fire
  // on every keystroke, which on iOS produced a visible UI jump while typing.
  // Scrolling the container directly (instead of scrollIntoView) keeps the
  // scroll local and prevents the page/window from scrolling.
  React.useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [receivedMessages.length]);

  return (
    <div className="container mx-auto pt-32 md:pt-20"> {/* Увеличили отступ на мобильных до 128px */}
      <div className="min-w-full border border-gray-200 rounded-xl shadow-lg overflow-hidden lg:grid lg:grid-cols-4">
        {/* Main Chat Area */}
        <div className="lg:col-span-3 bg-white">
          <div className="grid grid-rows-[1fr_auto]">
            <div
              ref={messagesContainerRef}
              className="flex flex-col gap-4 p-6 h-[calc(100dvh-220px)] lg:h-[calc(100dvh-160px)] overflow-y-auto overscroll-contain bg-gray-50"
            >
              {props.currentUserWalletAddress !== 'Connect your wallet' &&
                receivedMessages.map((message, index) => {
                  const isMe = message.clientId === ably.auth.clientId;
                  const { display, icon, type } = parseClientId(message.clientId);
                  return (
                    <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
                      <div className={`max-w-[70%] break-words ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-t-xl rounded-l-xl'
                          : 'bg-white border border-gray-200 rounded-t-xl rounded-r-xl'
                      } p-4 shadow-sm`}>
                        <div className="text-xs mb-1 opacity-80 flex items-center gap-1">
                          {isMe ? (
                            <span>You</span>
                          ) : (
                            <>
                              <span aria-hidden="true">{icon}</span>
                              <span>{display}</span>
                              {type === 'guest' && <span className="opacity-75">(guest)</span>}
                            </>
                          )}
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
                    // text-base == 16px: prevents iOS Safari from auto-zooming
                    // into the input on focus (which triggers a layout shift).
                    className="flex-1 px-4 py-2 text-base bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
