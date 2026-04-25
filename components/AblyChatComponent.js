import React, { useEffect, useState } from 'react';
import { configureAbly, useChannel } from '@ably-labs/react-hooks';
import { usePresence, assertConfiguration } from "@ably-labs/react-hooks";
import EmojiPicker from './EmojiPicker';

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

// Discord-style system messages for join/leave. Each client renders these
// locally in response to presence events on the chat's presence channel, so
// no server-side broadcast or message publish is required.
const JOIN_EMOJIS = ['👋', '🎉', '✨', '🚀', '🌟', '💫', '🪩', '🥳', '🤝', '🌈'];
const LEAVE_EMOJIS = ['👋', '🚪', '💨', '🌙', '✌️', '🫡', '😢', '🌅'];
const JOIN_TEMPLATES = [
  '%s joined the chat',
  '%s just dropped in',
  'Look who showed up – %s',
  '%s is here!',
  'Say hi to %s',
  'A wild %s appeared',
];
const LEAVE_TEMPLATES = [
  '%s left the chat',
  '%s waved goodbye',
  '%s logged off',
  '%s slipped away',
  '%s has left the building',
];
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// HH:MM in the user's locale (24h). Ably messages carry a server-set
// `timestamp` (ms epoch); we fall back to `Date.now()` for safety in case a
// locally-injected message ever lacks one.
const formatShortTime = (ts) => {
  const d = new Date(ts || Date.now());
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
};
const formatFullDate = (ts) => {
  const d = new Date(ts || Date.now());
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const AblyChatComponent = (props) => {
  const inputBoxRef = React.useRef(null);
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

  // Derive Discord-style join/leave system messages by diffing successive
  // `presenceData` snapshots. A subscribe-based approach would miss the
  // local user's own enter event (usePresence calls enter() before our
  // subscription is set up) and would not see members that were already
  // present when we joined. The snapshot diff is reliable in both cases.
  const previousPresenceRef = React.useRef(null);
  React.useEffect(() => {
    if (!presenceData || !ably || !ably.auth) return;
    const myClientId = ably.auth.clientId;
    const currentIds = new Set();
    (presenceData || []).forEach((m) => {
      if (m && m.clientId) currentIds.add(m.clientId);
    });
    const previous = previousPresenceRef.current;
    const emit = (kind, clientId) => {
      const { display } = parseClientId(clientId);
      const isJoin = kind === 'join';
      const text = (isJoin ? pickRandom(JOIN_TEMPLATES) : pickRandom(LEAVE_TEMPLATES)).replace('%s', display);
      setMessages((history) => [
        ...history.slice(-199),
        {
          id: `sys-${kind}-${clientId}-${Date.now()}-${Math.random()}`,
          system: true,
          kind,
          emoji: isJoin ? pickRandom(JOIN_EMOJIS) : pickRandom(LEAVE_EMOJIS),
          text,
        },
      ]);
    };
    // Treat the first transition into a populated snapshot as the initial
    // sync: announce only the local user (others were already there long
    // before we arrived). Subsequent diffs announce every change.
    const isInitialSync =
      previous === null || (previous.size === 0 && currentIds.has(myClientId));
    if (isInitialSync) {
      if (myClientId && currentIds.has(myClientId)) {
        emit('join', myClientId);
      }
    } else {
      currentIds.forEach((id) => {
        if (!previous.has(id)) emit('join', id);
      });
      previous.forEach((id) => {
        if (!currentIds.has(id)) emit('leave', id);
      });
    }
    previousPresenceRef.current = currentIds;
  }, [presenceData, ably]);

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
        <div key={member.clientId || index} className="py-2 px-3 rounded-lg hover:bg-[color:var(--surface-muted)] transition-colors group">
          <div className="text-[color:var(--text)] text-sm flex items-center justify-between">
            <span className="truncate flex items-center gap-1.5">
              <span aria-hidden="true">{icon}</span>
              <span className="truncate">{display}</span>
              {type === 'guest' && (
                <span className="text-[color:var(--text-subtle)] text-xs">(guest)</span>
              )}
              {isItMe && <span className="text-[color:var(--accent)] text-xs ml-1">(me)</span>}
            </span>
          </div>
        </div>
      );
    });
  
  const sendChatMessage = (messageText) => {
    channel.publish({ name: 'chat-message', data: messageText });
    setMessageText('');
    if (inputBoxRef.current) inputBoxRef.current.focus();
  };

  // Insert the picked emoji at the current caret position (or append if the
  // input is not focused). Restores selection so the caret stays right after
  // the inserted character, which feels more natural when picking several.
  const insertEmoji = (emoji) => {
    const input = inputBoxRef.current;
    if (!input) {
      setMessageText((value) => value + emoji);
      return;
    }
    const start = typeof input.selectionStart === 'number' ? input.selectionStart : messageText.length;
    const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : messageText.length;
    const next = messageText.slice(0, start) + emoji + messageText.slice(end);
    setMessageText(next);
    const caret = start + emoji.length;
    requestAnimationFrame(() => {
      if (inputBoxRef.current) {
        inputBoxRef.current.focus();
        try {
          inputBoxRef.current.setSelectionRange(caret, caret);
        } catch (e) {
          // some input types do not support setSelectionRange; ignore
        }
      }
    });
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
    <div className="container mx-auto pt-32 md:pt-20">
      <div className="min-w-full border border-[color:var(--border)] rounded-2xl overflow-hidden lg:grid lg:grid-cols-4 bg-[color:var(--surface)]/80 backdrop-blur-xl">
        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <div className="grid grid-rows-[1fr_auto]">
            <div
              ref={messagesContainerRef}
              className="flex flex-col gap-4 p-6 h-[calc(100dvh-220px)] lg:h-[calc(100dvh-160px)] overflow-y-auto overscroll-contain bg-[color:var(--bg)]/40"
            >
              {props.currentUserWalletAddress !== 'Connect your wallet' &&
                receivedMessages.map((message, index) => {
                  if (message.system) {
                    return (
                      <div key={message.id || index} className="flex justify-center w-full">
                        <div className="px-3 py-1.5 text-xs text-[color:var(--text-muted)] rounded-full bg-[color:var(--surface-muted)]/60 border border-[color:var(--border)] flex items-center gap-1.5 max-w-[90%]">
                          <span aria-hidden="true">{message.emoji}</span>
                          <span className="truncate">{message.text}</span>
                        </div>
                      </div>
                    );
                  }
                  const isMe = message.clientId === ably.auth.clientId;
                  const { display, icon, type } = parseClientId(message.clientId);
                  return (
                    <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
                      <div className={`max-w-[70%] break-words p-4 transition-colors ${
                        isMe
                          ? 'bg-[color:var(--accent)] text-white rounded-t-2xl rounded-l-2xl shadow-glow-sm'
                          : 'bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] rounded-t-2xl rounded-r-2xl'
                      }`}>
                        <div className={`text-xs mb-1 flex items-center gap-1 ${isMe ? 'opacity-80' : 'text-[color:var(--text-muted)]'}`}>
                          {isMe ? (
                            <span>You</span>
                          ) : (
                            <>
                              <span aria-hidden="true">{icon}</span>
                              <span>{display}</span>
                              {type === 'guest' && <span className="opacity-75">(guest)</span>}
                            </>
                          )}
                          <span className="relative group/ts ml-1">
                            <span className="opacity-70 tabular-nums">
                              {formatShortTime(message.timestamp)}
                            </span>
                            <span
                              role="tooltip"
                              className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-md whitespace-nowrap text-xs bg-[color:var(--surface)] border border-[color:var(--border)] text-[color:var(--text)] shadow-md opacity-0 group-hover/ts:opacity-100 transition-opacity z-10"
                            >
                              {formatFullDate(message.timestamp)}
                            </span>
                          </span>
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
              <form onSubmit={handleFormSubmission} className="p-4 bg-[color:var(--surface)] border-t border-[color:var(--border)]">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputBoxRef}
                    type="text"
                    value={messageText}
                    placeholder="Type your message..."
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    // text-base == 16px: prevents iOS Safari from auto-zooming
                    // into the input on focus (which triggers a layout shift).
                    className="flex-1 min-w-0 px-4 py-2.5 text-base bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-subtle)] rounded-full focus:outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/30 transition-colors"
                  />
                  <EmojiPicker onSelect={insertEmoji} />
                  <button
                    type="submit"
                    disabled={messageTextIsEmpty}
                    className="flex-shrink-0 p-2.5 rounded-full bg-[color:var(--accent)] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[color:var(--accent-hover)] transition-all shadow-glow-sm hover:shadow-glow disabled:shadow-none"
                    aria-label="Send message"
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

        {/* Sidebar */}
        <div className="border-t lg:border-t-0 lg:border-l border-[color:var(--border)] bg-[color:var(--surface)]">
          <div className="p-6">
            <h3 className="text-sm font-medium text-[color:var(--text)] flex items-center gap-2 uppercase tracking-wide">
              {props.currentUserWalletAddress === 'Connect your wallet' ? (
                "Connect Wallet to Chat"
              ) : (
                <>
                  <span className="relative flex w-2.5 h-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[color:var(--online)] opacity-60 animate-ping" />
                    <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[color:var(--online)]" />
                  </span>
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
