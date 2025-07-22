import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../../types';
import { useApi } from '../../hooks/useApi';
import { apiService } from '../../services/api';

interface MentionAutocompleteProps {
  query: string;
  position: { top: number; left: number };
  onSelect: (user: User) => void;
  onClose: () => void;
  isVisible: boolean;
}

const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  query,
  position,
  onSelect,
  onClose,
  isVisible,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { execute: searchUsers } = useApi(apiService.searchUsers);

  // Search users when query changes
  useEffect(() => {
    if (query.length > 0) {
      searchUsers(query).then((results) => {
        if (results) {
          setUsers(results);
          setSelectedIndex(0);
        }
      }).catch(() => {
        setUsers([]);
      });
    } else {
      setUsers([]);
    }
  }, [query, searchUsers]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isVisible || users.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % users.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + users.length) % users.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (users[selectedIndex]) {
          onSelect(users[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [isVisible, users, selectedIndex, onSelect, onClose]);

  // Add keyboard event listener
  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, handleKeyDown]);

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

  if (!isVisible || users.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white border border-secondary-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
      style={{
        top: position.top,
        left: position.left,
        minWidth: '200px',
      }}
    >
      <div className="py-1">
        {users.map((user, index) => (
          <button
            key={user.id}
            onClick={() => onSelect(user)}
            className={`w-full px-3 py-2 text-left hover:bg-secondary-100 flex items-center space-x-2 transition-colors duration-150 ${
              index === selectedIndex ? 'bg-primary-100' : ''
            }`}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {/* User Avatar */}
            <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-medium">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-secondary-900 truncate">
                {user.displayName}
              </div>
              <div className="text-xs text-secondary-500 truncate">
                @{user.username}
              </div>
            </div>
            
            {/* Role badges */}
            {(user.roles || []).includes('admin') && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                管理者
              </span>
            )}
            {(user.roles || []).includes('moderator') && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                モデレーター
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MentionAutocomplete;