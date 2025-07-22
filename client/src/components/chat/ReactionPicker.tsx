import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isVisible: boolean;
  position: { top: number; left: number };
  currentUserReactions?: string[]; // 現在のユーザーが既にリアクションした絵文字のリスト
}

const EMOJI_CATEGORIES = {
  frequent: ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '👏'],
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
  gestures: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  objects: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⭐', '🌟', '💫', '✨', '🔥', '💯', '💢', '💥'],
};

const ReactionPicker: React.FC<ReactionPickerProps> = ({
  onSelect,
  onClose,
  isVisible,
  position,
  currentUserReactions = [],
}) => {
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('frequent');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, onClose]);

  const handleEmojiSelect = (emoji: string) => {
    console.log('🎭 ReactionPicker: Emoji selected:', emoji);
    onSelect(emoji);
    onClose();
  };

  if (!isVisible) {
    return null;
  }

  // Check if we're on mobile
  const isMobile = window.innerWidth < 768;

  const pickerContent = (
    <div
      ref={containerRef}
      className={`fixed z-50 bg-white border border-secondary-200 rounded-lg shadow-lg ${
        isMobile 
          ? 'inset-x-4 bottom-4 top-auto' 
          : ''
      }`}
      style={isMobile ? {} : {
        top: position.top,
        left: position.left,
        width: '320px',
        maxHeight: '400px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-secondary-200">
        <h3 className="text-sm font-medium text-secondary-900">リアクションを選択</h3>
        <button
          onClick={onClose}
          className="text-secondary-400 hover:text-secondary-600 transition-colors duration-150"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-secondary-200 overflow-x-auto">
        {Object.keys(EMOJI_CATEGORIES).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
            className={`flex-shrink-0 px-2 py-2 text-xs font-medium transition-colors duration-150 ${
              activeCategory === category
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
            } ${isMobile ? 'min-w-[60px]' : 'flex-1'}`}
          >
            {category === 'frequent' && (isMobile ? '頻繁' : 'よく使う')}
            {category === 'smileys' && (isMobile ? '顔' : '顔文字')}
            {category === 'gestures' && (isMobile ? '手' : 'ジェスチャー')}
            {category === 'hearts' && (isMobile ? '❤️' : 'ハート')}
            {category === 'objects' && (isMobile ? '物' : 'オブジェクト')}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="p-3 max-h-64 overflow-y-auto">
        <div className={`grid gap-1 ${isMobile ? 'grid-cols-6' : 'grid-cols-8'}`}>
          {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => {
            const hasReacted = (currentUserReactions || []).includes(emoji);
            return (
              <button
                key={`${emoji}-${index}`}
                onClick={() => handleEmojiSelect(emoji)}
                className={`${isMobile ? 'w-10 h-10' : 'w-8 h-8'} flex items-center justify-center text-lg rounded transition-colors duration-150 ${
                  hasReacted 
                    ? 'bg-primary-100 border-2 border-primary-300 text-primary-800' 
                    : 'hover:bg-secondary-100'
                }`}
                title={hasReacted ? `${emoji} (選択済み)` : emoji}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-secondary-200 text-xs text-secondary-500">
        絵文字をクリックしてリアクションを追加
      </div>
    </div>
  );

  // Use portal to render outside of parent container
  return createPortal(pickerContent, document.body);
};

export default ReactionPicker;