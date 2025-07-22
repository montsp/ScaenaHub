import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import { useSocket } from '../../hooks/useSocket';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../LoadingSpinner';
import ReactionPicker from './ReactionPicker';
import ThreadView from './ThreadView';
import ConfirmDialog from '../ConfirmDialog';
import { formatTime, getUserColor, highlightMentions } from '../../utils';

interface MessageListProps {
  channelId: string;
  messages?: Message[];
  onMessagesChange?: React.Dispatch<React.SetStateAction<Message[]>>;
  className?: string;
}

interface MessageItemProps {
  message: Message;
  currentUser: User;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onStartThread?: (message: Message) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  onEdit,
  onDelete,
  onReaction,
  onStartThread,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ top: 0, left: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwnMessage = message.userId === currentUser.id;
  const canEdit = isOwnMessage || currentUser.roles.includes('admin') || currentUser.roles.includes('moderator');
  const canDelete = isOwnMessage || currentUser.roles.includes('admin') || currentUser.roles.includes('moderator');

  const handleEdit = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  const handleReactionPickerToggle = (e: React.MouseEvent) => {
    console.log('🎭 Reaction picker toggle clicked');
    e.stopPropagation();
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const pickerHeight = 400; // ReactionPicker max height
    
    // Calculate position to ensure picker stays in viewport
    let top = rect.top - pickerHeight - 10;
    if (top < 10) {
      top = rect.bottom + 10;
    }
    
    let left = rect.left;
    if (left + 320 > window.innerWidth) { // ReactionPicker width is 320px
      left = window.innerWidth - 320 - 10;
    }
    
    console.log('🎭 Setting reaction picker position:', { top, left });
    setReactionPickerPosition({ top, left });
    setShowReactionPicker(prev => {
      console.log('🎭 Toggling reaction picker visibility:', !prev);
      return !prev;
    });
  };

  const handleReactionSelect = (emoji: string) => {
    console.log('🎭 MessageItem: Reaction selected:', emoji, 'for message:', message.id);
    onReaction?.(message.id, emoji);
    setShowReactionPicker(false);
  };

  // Get current user's reactions for this message
  const currentUserReactions = message.reactions
    ?.filter(r => r.users.includes(currentUser.id))
    .map(r => r.emoji) || [];

  const handleStartThread = () => {
    onStartThread?.(message);
  };

  const userDisplayName = message.user?.displayName || message.user?.username || 'Unknown User';
  const userColor = getUserColor(message.userId);

  return (
    <div
      className={`group p-4 hover:bg-secondary-50 transition-colors duration-200 ${
        message.mentions.includes(currentUser.username) ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onTouchStart={() => setShowActions(true)} // モバイル対応
    >
      <div className="flex space-x-3">
        {/* User Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${userColor}`}>
          {userDisplayName.charAt(0).toUpperCase()}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Message Header */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-secondary-900">{userDisplayName}</span>
            <span className="text-xs text-secondary-500">{formatTime(message.createdAt)}</span>
            {message.isEdited && (
              <span className="text-xs text-secondary-400">(編集済み)</span>
            )}
          </div>

          {/* Message Body */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-2 text-sm border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                  className="px-3 py-1 text-xs text-secondary-600 border border-secondary-300 rounded-lg hover:bg-secondary-100 transition-colors duration-200"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-secondary-800">
              <div
                dangerouslySetInnerHTML={{
                  __html: highlightMentions(message.content, currentUser.username),
                }}
              />
            </div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction, index) => (
                <button
                  key={index}
                  onClick={() => onReaction?.(message.id, reaction.emoji)}
                  className={`inline-flex items-center px-2 py-1 text-xs rounded-full border transition-colors duration-200 ${
                    reaction.users.includes(currentUser.id)
                      ? 'bg-primary-100 border-primary-300 text-primary-800'
                      : 'bg-secondary-100 border-secondary-300 text-secondary-700 hover:bg-secondary-200'
                  }`}
                >
                  <span className="mr-1">{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center p-2 bg-secondary-100 rounded-lg"
                >
                  <svg className="h-4 w-4 mr-2 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-700 truncate"
                  >
                    {attachment.filename}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Actions */}
        {showActions && (
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {/* Reaction Button */}
            <button
              onClick={handleReactionPickerToggle}
              className="p-1 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
              title="リアクション"
              type="button"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Thread Button */}
            <button
              onClick={handleStartThread}
              className="p-1 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
              title="スレッドを開始"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>

            {canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                title="編集"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {canDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🗑️ Delete button clicked for message:', message.id);
                  setShowDeleteConfirm(true);
                }}
                className="p-1 text-secondary-400 hover:text-red-600 transition-colors duration-200"
                title="削除"
                type="button"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reaction Picker */}
      <ReactionPicker
        onSelect={handleReactionSelect}
        onClose={() => setShowReactionPicker(false)}
        isVisible={showReactionPicker}
        position={reactionPickerPosition}
        currentUserReactions={currentUserReactions}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="メッセージを削除"
        message="このメッセージを削除してもよろしいですか？この操作は取り消せません。"
        confirmText="削除"
        cancelText="キャンセル"
        type="danger"
        onConfirm={() => {
          console.log('🗑️ Delete confirmed for message:', message.id);
          onDelete?.(message.id);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => {
          console.log('🗑️ Delete cancelled for message:', message.id);
          setShowDeleteConfirm(false);
        }}
      />
    </div>
  );
};

const MessageList: React.FC<MessageListProps> = ({ 
  channelId, 
  messages: externalMessages = [], 
  onMessagesChange,
  className = '' 
}) => {
  const { user } = useAuth();
  const [internalMessages, setInternalMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Use external messages if provided, otherwise use internal state
  const messages = onMessagesChange ? externalMessages : internalMessages;
  
  // Create a wrapper function that works with both callback types
  const setMessages = useCallback((value: Message[] | ((prev: Message[]) => Message[])) => {
    if (onMessagesChange) {
      // For external state management
      if (typeof value === 'function') {
        const updateFn = value as (prev: Message[]) => Message[];
        onMessagesChange((prev) => updateFn(prev));
      } else {
        onMessagesChange(value);
      }
    } else {
      // For internal state management
      setInternalMessages(value);
    }
  }, [onMessagesChange]);

  const {
    data: messagesData,
    loading: messagesLoading,
    error: messagesError,
    execute: fetchMessages,
  } = useApi(apiService.getMessages);

  // Define scrollToBottom function first
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Socket for real-time updates
  const { joinChannel, leaveChannel } = useSocket({
    onMessage: useCallback((message: Message) => {
      console.log('📨 MessageList received new message:', message);
      console.log('📨 Message user info:', message.user);
      console.log('📨 Message threadId:', message.threadId);
      if (message.channelId === channelId && !message.threadId) {
        setMessages((prev: Message[]) => {
          // Avoid duplicates by checking if message already exists
          const exists = prev.some(m => m.id === message.id);
          if (exists) {
            console.log('⚠️ Duplicate message detected, skipping:', message.id);
            return prev;
          }
          console.log('✅ Adding new message to list:', message.id);
          console.log('📋 Current messages before adding:', prev.length);
          
          // Add message to the end (most recent)
          const newMessages = [...prev, message];
          console.log('📋 Total messages after adding:', newMessages.length);
          
          // Sort by creation time to ensure proper order
          const sortedMessages = newMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          console.log('📋 Final sorted messages:', sortedMessages.length);
          return sortedMessages;
        });
        // Scroll to bottom after a short delay to ensure DOM update
        setTimeout(() => {
          console.log('📜 Scrolling to bottom after new message');
          scrollToBottom();
        }, 100);
      }
    }, [channelId, setMessages, scrollToBottom]),
    onMessageUpdated: useCallback((message: Message) => {
      if (message.channelId === channelId) {
        setMessages((prev: Message[]) =>
          prev.map((msg: Message) => msg.id === message.id ? message : msg)
        );
      }
    }, [channelId, setMessages]),
    onMessageDeleted: useCallback((messageId: string) => {
      setMessages((prev: Message[]) => prev.filter((msg: Message) => msg.id !== messageId));
    }, [setMessages]),
  });

  // Load messages when channel changes
  useEffect(() => {
    if (channelId) {
      console.log('📋 MessageList: Loading messages for channel:', channelId);
      
      // Reset pagination state
      setPage(1);
      setHasMore(true);
      
      // Join the channel for real-time updates first
      console.log('🔗 MessageList: Joining channel:', channelId);
      joinChannel(channelId);
      
      // Clear messages and fetch new ones
      setMessages([]);
      fetchMessages(channelId, 1, 50);
      
      // Leave the channel when component unmounts or channel changes
      return () => {
        console.log('🚪 MessageList: Leaving channel:', channelId);
        leaveChannel(channelId);
      };
    }
  }, [channelId, fetchMessages, joinChannel, leaveChannel, setMessages]);

  // Update messages when data changes
  useEffect(() => {
    if (messagesData) {
      if (page === 1) {
        console.log('📋 Setting initial messages from API:', messagesData.length);
        setMessages((prev: Message[]) => {
          // For initial load, merge API messages with any existing Socket.io messages
          const existingIds = new Set(prev.map(m => m.id));
          const apiMessages = messagesData.filter(m => !existingIds.has(m.id));
          
          // Combine existing messages (from Socket.io) with API messages
          const allMessages = [...prev, ...apiMessages];
          console.log('📋 Combined messages (existing + API):', prev.length, '+', apiMessages.length, '=', allMessages.length);
          
          // Sort by creation time to ensure proper order
          return allMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
      } else {
        console.log('📋 Adding more messages from API:', messagesData.length);
        setMessages((prev: Message[]) => {
          // Merge with existing messages, avoiding duplicates
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = messagesData.filter(m => !existingIds.has(m.id));
          return [...newMessages, ...prev];
        });
      }
      setHasMore(messagesData.length === 50);
    }
  }, [messagesData, page, setMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && page === 1) {
      scrollToBottom();
    }
  }, [messages, page]);

  // Scroll to bottom when external messages change (for real-time updates)
  useEffect(() => {
    if (onMessagesChange && externalMessages.length > 0) {
      scrollToBottom();
    }
  }, [externalMessages, onMessagesChange, scrollToBottom]);

  const loadMoreMessages = useCallback(() => {
    if (!messagesLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMessages(channelId, nextPage, 50);
    }
  }, [channelId, page, messagesLoading, hasMore, fetchMessages]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container && container.scrollTop === 0 && hasMore && !messagesLoading) {
      loadMoreMessages();
    }
  }, [hasMore, messagesLoading, loadMoreMessages]);

  const handleEditMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await apiService.updateMessage(messageId, content);
      setMessages((prev: Message[]) =>
        prev.map((msg: Message) =>
          msg.id === messageId
            ? { ...msg, content, isEdited: true, editedAt: new Date().toISOString() }
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  }, []);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      console.log('🗑️ Deleting message:', messageId);
      await apiService.deleteMessage(messageId);
      setMessages((prev: Message[]) => prev.filter((msg: Message) => msg.id !== messageId));
      console.log('✅ Message deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete message:', error);
    }
  }, [setMessages]);

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    console.log('🎭 Handling reaction:', { messageId, emoji, userId: user?.id });
    try {
      const message = messages.find(m => m.id === messageId);
      console.log('🎭 Found message:', message);
      console.log('🎭 Message reactions:', message?.reactions);
      
      const reaction = message?.reactions?.find(r => r.emoji === emoji);
      const hasReacted = reaction?.users?.includes(user?.id || '');
      
      // Check if user already has a reaction on this message (one reaction per user limit)
      const userCurrentReaction = message?.reactions?.find(r => r.users.includes(user?.id || ''));
      
      console.log('🎭 Reaction state:', { reaction, hasReacted, userCurrentReaction });

      if (hasReacted) {
        // Remove existing reaction
        console.log('🎭 Removing reaction');
        await apiService.removeReaction(messageId, emoji);
      } else if (userCurrentReaction && userCurrentReaction.emoji !== emoji) {
        // User already has a different reaction, replace it
        console.log('🎭 Replacing existing reaction');
        await apiService.removeReaction(messageId, userCurrentReaction.emoji);
        await apiService.addReaction(messageId, emoji);
      } else if (!userCurrentReaction) {
        // Add new reaction (user has no existing reaction)
        console.log('🎭 Adding new reaction');
        await apiService.addReaction(messageId, emoji);
      }

      // Update local state optimistically
      setMessages((prev: Message[]) =>
        prev.map((msg: Message) => {
          if (msg.id === messageId) {
            const currentReactions = msg.reactions || [];
            let updatedReactions = [...currentReactions];

            if (hasReacted) {
              // Remove the reaction
              updatedReactions = updatedReactions.map((r: any) => {
                if (r.emoji === emoji) {
                  const newUsers = r.users.filter((id: string) => id !== user?.id);
                  return { ...r, users: newUsers, count: newUsers.length };
                }
                return r;
              });
            } else if (userCurrentReaction && userCurrentReaction.emoji !== emoji) {
              // Replace existing reaction
              updatedReactions = updatedReactions.map((r: any) => {
                if (r.emoji === userCurrentReaction.emoji) {
                  // Remove from old reaction
                  const newUsers = r.users.filter((id: string) => id !== user?.id);
                  return { ...r, users: newUsers, count: newUsers.length };
                } else if (r.emoji === emoji) {
                  // Add to new reaction
                  const newUsers = [...r.users, user?.id || ''];
                  return { ...r, users: newUsers, count: newUsers.length };
                }
                return r;
              });

              // Add new reaction if it doesn't exist
              if (!updatedReactions.find((r: any) => r.emoji === emoji)) {
                updatedReactions.push({
                  emoji,
                  users: [user?.id || ''],
                  count: 1,
                });
              }
            } else if (!userCurrentReaction) {
              // Add new reaction
              const existingReaction = updatedReactions.find((r: any) => r.emoji === emoji);
              if (existingReaction) {
                updatedReactions = updatedReactions.map((r: any) => {
                  if (r.emoji === emoji) {
                    const newUsers = [...r.users, user?.id || ''];
                    return { ...r, users: newUsers, count: newUsers.length };
                  }
                  return r;
                });
              } else {
                updatedReactions.push({
                  emoji,
                  users: [user?.id || ''],
                  count: 1,
                });
              }
            }

            const finalReactions = updatedReactions.filter((r: any) => r.count > 0);
            console.log('🎭 Updated reactions:', finalReactions);
            return { ...msg, reactions: finalReactions };
          }
          return msg;
        })
      );
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  }, [messages, user?.id, setMessages]);

  const handleStartThread = useCallback((message: Message) => {
    setThreadMessage(message);
    setIsThreadOpen(true);
  }, []);

  const handleCloseThread = useCallback(() => {
    setIsThreadOpen(false);
    setThreadMessage(null);
  }, []);

  if (!user) {
    return <div className={`flex items-center justify-center ${className}`}>認証が必要です</div>;
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {/* Load More Button */}
        {hasMore && messages.length > 0 && (
          <div className="p-4 text-center">
            <button
              onClick={loadMoreMessages}
              disabled={messagesLoading}
              className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50 transition-colors duration-200"
            >
              {messagesLoading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  読み込み中...
                </div>
              ) : (
                '過去のメッセージを読み込む'
              )}
            </button>
          </div>
        )}

        {/* Error Message */}
        {messagesError && (
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              メッセージの読み込みに失敗しました
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 ? (
          <div className="divide-y divide-secondary-100">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                currentUser={user}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                onReaction={handleReaction}
                onStartThread={handleStartThread}
              />
            ))}
          </div>
        ) : !messagesLoading ? (
          <div className="flex-1 flex items-center justify-center text-secondary-500">
            <div className="text-center">
              <svg className="h-12 w-12 mx-auto mb-4 text-secondary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>まだメッセージがありません</p>
              <p className="text-sm mt-1">最初のメッセージを送信してみましょう！</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Thread View */}
      {isThreadOpen && threadMessage && (
        <ThreadView
          parentMessage={threadMessage}
          isOpen={isThreadOpen}
          onClose={handleCloseThread}
        />
      )}
    </div>
  );
};

export default MessageList;