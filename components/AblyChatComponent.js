import React, { useEffect, useState } from 'react';
import { configureAbly, useChannel } from '@ably-labs/react-hooks';
import { usePresence, assertConfiguration } from "@ably-labs/react-hooks";
import EmojiPicker from './EmojiPicker';
import { useEnsName } from '../lib/ens';

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

const shortAddress = (addr) =>
  addr && addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr || '';

const parseClientId = (clientId) => {
  if (!clientId) return { type: 'unknown', display: '', icon: '❓', address: null };
  if (clientId.startsWith('guest:')) {
    return { type: 'guest', display: clientId.slice(6), icon: '👤', address: null };
  }
  if (clientId.startsWith('wallet:')) {
    const addr = clientId.slice(7);
    return { type: 'wallet', display: shortAddress(addr), icon: '💎', address: addr };
  }
  // Backward compatibility: raw wallet address without prefix
  return { type: 'wallet', display: shortAddress(clientId), icon: '💎', address: clientId };
};

// Renders an ENS name when one is cached/resolved for the address, otherwise
// falls back to the short 0x… form. Used in both the member sidebar and the
// message author label so the visual treatment stays consistent.
const WalletName = ({ address, fallback, className }) => {
  const ens = useEnsName(address);
  return <span className={className} title={ens ? address : undefined}>{ens || fallback}</span>;
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

// 12-hour HH:MM AM/PM (e.g. "11:04 PM"). Ably messages carry a server-set
// `timestamp` (ms epoch); we fall back to `Date.now()` for safety in case a
// locally-injected message ever lacks one. `en-US` is pinned so the AM/PM
// suffix renders consistently regardless of the user's browser locale.
const formatShortTime = (ts) => {
  const d = new Date(ts || Date.now());
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};
const formatFullDate = (ts) => {
  const d = new Date(ts || Date.now());
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

// Linkify a plain-text message: splits the text on http(s) URLs and returns
// an array of React nodes (strings + <a> elements). Never uses
// dangerouslySetInnerHTML, so the message body cannot inject markup. The href
// is double-checked with `new URL` and only http/https are accepted as a
// defense-in-depth against javascript:/data: URIs sneaking in.
const URL_REGEX = /(https?:\/\/[^\s<>"'`]+)/g;
const TRAILING_PUNCT = /[.,!?;:)\]}'"]+$/;
const linkifyText = (text) => {
  if (typeof text !== 'string' || text.length === 0) return text;
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (i % 2 === 0) return part;
    const trailingMatch = part.match(TRAILING_PUNCT);
    const trailing = trailingMatch ? trailingMatch[0] : '';
    const url = trailing ? part.slice(0, -trailing.length) : part;
    let safeHref = null;
    try {
      const u = new URL(url);
      if (u.protocol === 'http:' || u.protocol === 'https:') safeHref = u.href;
    } catch (e) {
      // malformed URL, render as plain text
    }
    if (!safeHref) return part;
    return (
      <React.Fragment key={i}>
        <a
          href={safeHref}
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-2 hover:opacity-80 break-all"
        >
          {url}
        </a>
        {trailing}
      </React.Fragment>
    );
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

  // Typing indicator on a transient sibling channel: lightweight events
  // (start/stop) keyed by clientId. State is a Map of clientId -> expiry ms;
  // an expiry sweep clears stragglers if a "stop" event was lost.
  const [typingUsers, setTypingUsers] = useState(() => new Map());
  const TYPING_TTL_MS = 4000;
  const TYPING_THROTTLE_MS = 2000;
  const lastTypingSentRef = React.useRef(0);
  const [typingChannel] = useChannel('typing', (msg) => {
    if (!ably || !ably.auth || msg.clientId === ably.auth.clientId) return;
    setTypingUsers((prev) => {
      const next = new Map(prev);
      if (msg.name === 'stop') {
        next.delete(msg.clientId);
      } else {
        next.set(msg.clientId, Date.now() + TYPING_TTL_MS);
      }
      return next;
    });
  });

  // Sweep expired typers every second so the indicator clears even if the
  // sender disconnected before publishing a 'stop'.
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        let changed = false;
        const next = new Map(prev);
        next.forEach((expiry, id) => {
          if (expiry <= now) { next.delete(id); changed = true; }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const publishTyping = React.useCallback((kind) => {
    if (!typingChannel) return;
    if (kind === 'start') {
      const now = Date.now();
      if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return;
      lastTypingSentRef.current = now;
    } else {
      lastTypingSentRef.current = 0;
    }
    try { typingChannel.publish(kind, ''); } catch (e) { /* best-effort */ }
  }, [typingChannel]);

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
      const { display, icon, type, address } = parseClientId(member.clientId);

      return (
        <div key={member.clientId || index} className="py-2 px-3 rounded-lg hover:bg-[color:var(--surface-muted)] transition-colors group">
          <div className="text-[color:var(--text)] text-sm flex items-center justify-between">
            <span className="truncate flex items-center gap-1.5">
              <span aria-hidden="true">{icon}</span>
              {type === 'wallet' ? (
                <WalletName address={address} fallback={display} className="truncate" />
              ) : (
                <span className="truncate">{display}</span>
              )}
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
    publishTyping('stop');
    setMessageText('');
    if (inputBoxRef.current) inputBoxRef.current.focus();
  };

  // Human-readable typing label: "Alice is typing", "Alice and Bob are typing",
  // "3 people are typing". Derived from the typingUsers Map; recomputed only
  // when the set of active typers changes.
  const typingLabel = React.useMemo(() => {
    const ids = Array.from(typingUsers.keys());
    if (ids.length === 0) return '';
    const names = ids.map((id) => parseClientId(id).display);
    if (names.length === 1) return `${names[0]} is typing`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
    return `${names.length} people are typing`;
  }, [typingUsers]);

  // Throttled "I am typing" notifier. Called on every input change; the
  // throttle inside `publishTyping` keeps actual publishes to ~1 per 2s.
  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessageText(value);
    requestAnimationFrame(resizeTextarea);
    if (value.trim().length > 0) {
      publishTyping('start');
    } else {
      publishTyping('stop');
    }
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
        resizeTextarea();
      }
    });
  };

  // Reset the textarea height to its single-row baseline. Called after send
  // and on input changes that shrink the content.
  const resizeTextarea = React.useCallback(() => {
    const el = inputBoxRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // Cap at ~6 lines (text-base * 1.5 line-height ≈ 24px per line + padding).
    const max = 24 * 6 + 20;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, []);

  const handleFormSubmission = (event) => {
    event.preventDefault();
    if (messageTextIsEmpty) return;
    sendChatMessage(messageText);
    requestAnimationFrame(resizeTextarea);
  };

  // Enter sends, Shift+Enter inserts a newline (default textarea behavior).
  // We use keyDown rather than the deprecated keyPress, and respect IME
  // composition (e.g. CJK input) so pressing Enter to commit a candidate
  // does not also send the message. Empty Enter is swallowed so the textarea
  // does not start collecting blank newlines.
  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    if (event.nativeEvent && event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (messageTextIsEmpty) return;
    sendChatMessage(messageText);
    requestAnimationFrame(resizeTextarea);
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
      {/* On lg the chat card has a fixed height (viewport - top padding) and the
          inner column uses flex with min-h-0, so messages shrink when the
          textarea auto-grows. On mobile the sidebar stacks below, so the card
          stays auto-height and the messages container falls back to a calc-based
          height that already reserves room for a worst-case multi-line input. */}
      <div className="min-w-full border border-[color:var(--border)] rounded-2xl overflow-hidden lg:grid lg:grid-cols-4 bg-[color:var(--surface)]/80 backdrop-blur-xl lg:h-[calc(100dvh-100px)]">
        {/* Main Chat Area */}
        <div className="lg:col-span-3 lg:h-full lg:min-h-0">
          <div className="flex flex-col lg:h-full lg:min-h-0">
            <div
              ref={messagesContainerRef}
              className="flex flex-col gap-4 p-6 h-[calc(100dvh-330px)] lg:h-auto lg:flex-1 lg:min-h-0 overflow-y-auto overscroll-contain bg-[color:var(--bg)]/40"
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
                  const { display, icon, type, address } = parseClientId(message.clientId);
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
                              {type === 'wallet' ? (
                                <WalletName address={address} fallback={display} />
                              ) : (
                                <span>{display}</span>
                              )}
                              {type === 'guest' && <span className="opacity-75">(guest)</span>}
                            </>
                          )}
                          <span className="relative group/ts ml-1">
                            <span className="opacity-70 tabular-nums">
                              {formatShortTime(message.timestamp)}
                            </span>
                            <span
                              role="tooltip"
                              // Anchor tooltip to the message side so it never
                              // overflows the chat container (which clips with
                              // overflow-y-auto): own messages are right-aligned,
                              // so we anchor by the right edge; others by the left.
                              className={`pointer-events-none absolute bottom-full mb-1 px-2 py-1 rounded-md whitespace-nowrap text-xs bg-[color:var(--surface)] border border-[color:var(--border)] text-[color:var(--text)] shadow-md opacity-0 group-hover/ts:opacity-100 transition-opacity z-10 ${
                                isMe ? 'right-0' : 'left-0'
                              }`}
                            >
                              {formatFullDate(message.timestamp)}
                            </span>
                          </span>
                        </div>
                        <div className="text-sm whitespace-pre-wrap break-words overflow-hidden">
                          {linkifyText(message.data)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {props.currentUserWalletAddress !== 'Connect your wallet' && (
              <form onSubmit={handleFormSubmission} className="flex-shrink-0 p-4 bg-[color:var(--surface)] border-t border-[color:var(--border)]">
                {/* Typing indicator: rendered with reserved height so the
                    input row never jumps when someone starts/stops typing. */}
                <div className="h-5 mb-1 px-2 text-xs text-[color:var(--text-muted)] flex items-center gap-1.5" aria-live="polite">
                  {typingLabel && (
                    <>
                      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                        <span className="w-1 h-1 rounded-full bg-[color:var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 rounded-full bg-[color:var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 rounded-full bg-[color:var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      <span className="truncate">{typingLabel}</span>
                    </>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputBoxRef}
                    rows={1}
                    value={messageText}
                    placeholder="Type your message..."
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    // text-base == 16px: prevents iOS Safari from auto-zooming
                    // into the input on focus (which triggers a layout shift).
                    // resize-none + JS auto-grow: textarea expands up to ~6 rows
                    // then scrolls. leading-6 keeps the line-height consistent
                    // with the JS height calculation in resizeTextarea.
                    className="flex-1 min-w-0 px-4 py-2.5 text-base leading-6 bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-subtle)] rounded-2xl resize-none overflow-y-auto focus:outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/30 transition-colors"
                  />
                  <EmojiPicker onSelect={insertEmoji} />
                  <button
                    type="submit"
                    disabled={messageTextIsEmpty}
                    title="Send (Enter) — Shift+Enter for newline"
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
