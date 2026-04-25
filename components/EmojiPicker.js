import React, { useEffect, useRef, useState } from 'react';

// Curated, dependency-free set of emojis grouped by category. Kept short
// to keep bundle weight negligible while still covering the common cases.
const CATEGORIES = [
  {
    id: 'smileys',
    label: 'Smileys',
    icon: '😀',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
      '😉','😊','😇','🥰','😍','🤩','😘','😋','😜','🤪',
      '🤔','🤨','😐','🙄','😏','😴','🥱','😪','😮','😯',
      '😢','😭','😤','😡','🤯','😱','🥶','🥵','🤗','🤭',
    ],
  },
  {
    id: 'gestures',
    label: 'Gestures',
    icon: '👍',
    emojis: [
      '👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉',
      '👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤝','🙏',
      '💪','🫶','👏','🙌','🤲','👐','🫰','🫵','✊','👊',
    ],
  },
  {
    id: 'hearts',
    label: 'Hearts',
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️',
    ],
  },
  {
    id: 'web3',
    label: 'Web3',
    icon: '💎',
    emojis: [
      '💎','🚀','🔥','⚡','✨','💫','⭐','🌟','💯','✅',
      '❌','⚠️','🎉','🎊','🏆','🪙','💰','💸','📈','📉',
      '🛡️','🔐','🔓','🗝️','🧠','🤖','👾','🛸','🌐','📡',
    ],
  },
  {
    id: 'objects',
    label: 'Misc',
    icon: '🎵',
    emojis: [
      '☕','🍺','🍻','🥂','🍕','🍔','🍟','🍿','🍩','🍫',
      '🌈','🌙','☀️','⛅','🌧️','❄️','🌊','🍀','🌸','🎵',
      '🐶','🐱','🦊','🐼','🐵','🦄','🐸','🐢','🦋','🐝',
    ],
  },
];

// Lightweight emoji picker rendered as a popover anchored above the trigger
// button. Closes on outside click or Escape. Calls onSelect with the picked
// emoji string so the parent can insert it into the message input.
const EmojiPicker = ({ onSelect }) => {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const current = CATEGORIES.find((category) => category.id === activeCategory) || CATEGORIES[0];

  const handleEmojiClick = (emoji) => {
    if (typeof onSelect === 'function') onSelect(emoji);
  };

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Insert emoji"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center justify-center w-10 h-10 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--text-muted)] hover:text-[color:var(--accent)] hover:border-[color:var(--accent)] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Emoji picker"
          className="absolute bottom-full right-0 mb-3 w-72 sm:w-80 z-30 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]/95 backdrop-blur-xl shadow-glow card-neon overflow-hidden"
        >
          <div className="flex items-center gap-1 px-2 py-2 border-b border-[color:var(--border)] bg-[color:var(--surface-muted)]/60">
            {CATEGORIES.map((category) => {
              const isActive = category.id === activeCategory;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  aria-label={category.label}
                  aria-pressed={isActive}
                  className={`flex-1 h-8 rounded-lg text-base transition-colors ${
                    isActive
                      ? 'bg-[color:var(--accent)]/20 text-[color:var(--accent)]'
                      : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface)]'
                  }`}
                >
                  <span aria-hidden="true">{category.icon}</span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-8 gap-1 p-2 max-h-56 overflow-y-auto">
            {current.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                aria-label={`Insert ${emoji}`}
                className="h-8 w-8 flex items-center justify-center rounded-md text-lg hover:bg-[color:var(--surface-muted)] transition-colors"
              >
                <span aria-hidden="true">{emoji}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
