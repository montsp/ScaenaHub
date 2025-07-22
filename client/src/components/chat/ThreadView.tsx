import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import { apiService } from '../../services/api';
import { socketService } from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../LoadingSpinner';
import MessageInput from './MessageInput';
import ConfirmDialog from '../ConfirmDialog';
import ReactionPicker from './ReactionPicker';
import FilePreview from '../FilePreview';
import { formatTime, getUserColor, highlightMentions } from '../../utils';

interface ThreadViewProps {
    parentMessage: Message;
    isOpen: boolean;
    onClose: () => void;
    className?: string;
}

interface ThreadMessageProps {
    message: Message;
    currentUser: User;
    onEdit?: (messageId: string, content: string) => void;
    onDelete?: (messageId: string) => void;
    onReaction?: (messageId: string, emoji: string) => void;
}

const ThreadMessage: React.FC<ThreadMessageProps> = ({
    message,
    currentUser,
    onEdit,
    onDelete,
    onReaction,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const [showActions, setShowActions] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [reactionPickerPosition, setReactionPickerPosition] = useState({ top: 0, left: 0 });

    const isOwnMessage = message.userId === currentUser.id;
    const canEdit = isOwnMessage || (currentUser.roles || []).includes('admin') || (currentUser.roles || []).includes('moderator');
    const canDelete = isOwnMessage || (currentUser.roles || []).includes('admin') || (currentUser.roles || []).includes('moderator');

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
        console.log('🎭 Thread reaction picker toggle clicked');
        e.stopPropagation();
        e.preventDefault();
        
        const rect = e.currentTarget.getBoundingClientRect();
        const pickerHeight = 400;
        
        let top = rect.top - pickerHeight - 10;
        if (top < 10) {
            top = rect.bottom + 10;
        }
        
        let left = rect.left;
        if (left + 320 > window.innerWidth) {
            left = window.innerWidth - 320 - 10;
        }
        
        setReactionPickerPosition({ top, left });
        setShowReactionPicker(prev => !prev);
    };

    const handleReactionSelect = (emoji: string) => {
        console.log('🎭 Thread reaction selected:', emoji, 'for message:', message.id);
        onReaction?.(message.id, emoji);
        setShowReactionPicker(false);
    };

    // Get current user's reactions for this message
    const currentUserReactions = message.reactions
        ?.filter(r => r.users.includes(currentUser.id))
        .map(r => r.emoji) || [];

    const userDisplayName = message.user?.displayName || message.user?.username || 'Unknown User';
    const userColor = getUserColor(message.userId);

    return (
        <div
            className={`group p-3 hover:bg-secondary-50 transition-colors duration-200 ${(message.mentions || []).includes(currentUser.username) ? 'bg-yellow-50 border-l-2 border-yellow-400' : ''
                }`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            onTouchStart={() => setShowActions(true)}
        >
            <div className="flex space-x-2">
                {/* User Avatar */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${userColor}`}>
                    {userDisplayName.charAt(0).toUpperCase()}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                    {/* Message Header */}
                    <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-secondary-900">{userDisplayName}</span>
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
                                className="w-full p-2 text-sm border border-secondary-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                                rows={2}
                                autoFocus
                            />
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleEdit}
                                    className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors duration-200"
                                >
                                    保存
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditContent(message.content);
                                    }}
                                    className="px-2 py-1 text-xs text-secondary-600 border border-secondary-300 rounded hover:bg-secondary-100 transition-colors duration-200"
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
                                    className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded-full border transition-colors duration-200 ${(reaction.users || []).includes(currentUser.id)
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
                                <FilePreview
                                    key={attachment.id}
                                    file={{
                                        id: attachment.id,
                                        filename: attachment.filename,
                                        mimeType: attachment.mimeType,
                                        size: attachment.size,
                                        url: attachment.url,
                                    }}
                                    canDelete={isOwnMessage || (currentUser.roles || []).includes('admin') || (currentUser.roles || []).includes('moderator')}
                                    onDelete={(fileId) => {
                                        console.log('Thread file deleted:', fileId);
                                    }}
                                />
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
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        {canEdit && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                                title="編集"
                            >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowDeleteConfirm(true);
                                }}
                                className="p-1 text-secondary-400 hover:text-red-600 transition-colors duration-200"
                                title="削除"
                                type="button"
                            >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    onDelete?.(message.id);
                    setShowDeleteConfirm(false);
                }}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    );
};

const ThreadView: React.FC<ThreadViewProps> = ({
    parentMessage,
    isOpen,
    onClose,
    className = '',
}) => {
    const { user } = useAuth();
    const [threadMessages, setThreadMessages] = useState<Message[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const {
        data: messagesData,
        loading: messagesLoading,
        error: messagesError,
        execute: fetchThreadMessages,
    } = useApi(apiService.getThreadMessages);

    // Load thread messages when opened
    useEffect(() => {
        if (isOpen && parentMessage.id) {
            setThreadMessages([]);
            setPage(1);
            setHasMore(true);
            fetchThreadMessages(parentMessage.id, 1, 50);
        }
    }, [isOpen, parentMessage.id, fetchThreadMessages]);

    // Update messages when data changes
    useEffect(() => {
        if (messagesData) {
            const newMessages = Array.isArray(messagesData) ? messagesData : [];
            if (page === 1) {
                setThreadMessages(newMessages);
            } else {
                setThreadMessages(prev => [...newMessages, ...(prev || [])]);
            }
            setHasMore(newMessages.length === 50);
        }
    }, [messagesData, page]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (threadMessages.length > 0 && page === 1) {
            scrollToBottom();
        }
    }, [threadMessages, page]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const loadMoreMessages = useCallback(() => {
        if (!messagesLoading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchThreadMessages(parentMessage.id, nextPage, 50);
        }
    }, [parentMessage.id, page, messagesLoading, hasMore, fetchThreadMessages]);

    const handleScroll = useCallback(() => {
        const container = messagesContainerRef.current;
        if (container && container.scrollTop === 0 && hasMore && !messagesLoading) {
            loadMoreMessages();
        }
    }, [hasMore, messagesLoading, loadMoreMessages]);

    const handleEditMessage = useCallback(async (messageId: string, content: string) => {
        try {
            await apiService.updateMessage(messageId, content);
            setThreadMessages(prev =>
                (prev || []).map(msg =>
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
            console.log('🗑️ Deleting thread message:', messageId);
            await apiService.deleteMessage(messageId);
            setThreadMessages(prev => (prev || []).filter(msg => msg.id !== messageId));
            console.log('✅ Thread message deleted successfully');
        } catch (error) {
            console.error('❌ Failed to delete thread message:', error);
        }
    }, []);

    const handleReaction = useCallback(async (messageId: string, emoji: string) => {
        console.log('🎭 Thread handling reaction:', { messageId, emoji, userId: user?.id });
        try {
            const message = threadMessages.find(m => m.id === messageId);
            console.log('🎭 Thread found message:', message);
            console.log('🎭 Thread message reactions:', message?.reactions);
            
            const reaction = message?.reactions?.find(r => r.emoji === emoji);
            const hasReacted = reaction?.users?.includes(user?.id || '');
            
            // Check if user already has a reaction on this message (one reaction per user limit)
            const userCurrentReaction = message?.reactions?.find(r => (r.users || []).includes(user?.id || ''));
            
            console.log('🎭 Thread reaction state:', { reaction, hasReacted, userCurrentReaction });

            if (hasReacted) {
                // Remove existing reaction
                console.log('🎭 Thread removing reaction');
                await apiService.removeReaction(messageId, emoji);
            } else if (userCurrentReaction && userCurrentReaction.emoji !== emoji) {
                // User already has a different reaction, replace it
                console.log('🎭 Thread replacing existing reaction');
                await apiService.removeReaction(messageId, userCurrentReaction.emoji);
                await apiService.addReaction(messageId, emoji);
            } else if (!userCurrentReaction) {
                // Add new reaction (user has no existing reaction)
                console.log('🎭 Thread adding new reaction');
                await apiService.addReaction(messageId, emoji);
            }

            // Update local state optimistically
            setThreadMessages(prev =>
                (prev || []).map(msg => {
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
                        console.log('🎭 Thread updated reactions:', finalReactions);
                        return { ...msg, reactions: finalReactions };
                    }
                    return msg;
                })
            );
        } catch (error) {
            console.error('Failed to toggle thread reaction:', error);
        }
    }, [threadMessages, user?.id]);

    const handleThreadMessageSent = useCallback((message: Message) => {
        console.log('🧵 ThreadView received thread message:', message);
        console.log('🧵 Message user info:', message.user);
        console.log('🧵 Message threadId:', message.threadId, 'Expected:', parentMessage.id);
        if (message.threadId === parentMessage.id) {
            setThreadMessages(prev => {
                // Avoid duplicates
                const exists = prev.some(m => m.id === message.id);
                if (exists) {
                    console.log('⚠️ Duplicate thread message detected, skipping:', message.id);
                    return prev;
                }
                console.log('✅ Adding new thread message:', message.id);
                const newMessages = [...prev, message];
                return newMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            });
            scrollToBottom();
        }
    }, [parentMessage.id, scrollToBottom]);

    useEffect(() => {
        // Add event listener for thread messages
        socketService.getSocket()?.on('thread:message', handleThreadMessageSent);
        
        return () => {
            socketService.getSocket()?.off('thread:message', handleThreadMessageSent);
        };
    }, [handleThreadMessageSent]);

    if (!isOpen || !user) {
        return null;
    }

    const parentUserDisplayName = parentMessage.user?.displayName || parentMessage.user?.username || 'Unknown User';
    const parentUserColor = getUserColor(parentMessage.userId);

    return (
        <div className={`fixed inset-y-0 right-0 w-96 bg-white border-l border-secondary-200 shadow-lg z-40 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-secondary-200 bg-secondary-50">
                <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h2 className="text-lg font-semibold text-secondary-900">スレッド</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Parent Message */}
            <div className="p-4 border-b border-secondary-200 bg-secondary-25">
                <div className="flex space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${parentUserColor}`}>
                        {parentUserDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-secondary-900">{parentUserDisplayName}</span>
                            <span className="text-xs text-secondary-500">{formatTime(parentMessage.createdAt)}</span>
                        </div>
                        <div className="text-sm text-secondary-800">
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: highlightMentions(parentMessage.content, user.username),
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Thread Messages */}
            <div className="flex-1 flex flex-col h-full">
                <div
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto"
                    onScroll={handleScroll}
                    style={{ maxHeight: 'calc(100vh - 200px)' }}
                >
                    {/* Load More Button */}
                    {hasMore && threadMessages.length > 0 && (
                        <div className="p-3 text-center">
                            <button
                                onClick={loadMoreMessages}
                                disabled={messagesLoading}
                                className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50 transition-colors duration-200"
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
                        <div className="p-3">
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                                スレッドの読み込みに失敗しました
                            </div>
                        </div>
                    )}

                    {/* Thread Messages */}
                    {threadMessages.length > 0 ? (
                        <div className="divide-y divide-secondary-100">
                            {threadMessages.map((message) => (
                                <ThreadMessage
                                    key={message.id}
                                    message={message}
                                    currentUser={user}
                                    onEdit={handleEditMessage}
                                    onDelete={handleDeleteMessage}
                                    onReaction={handleReaction}
                                />
                            ))}
                        </div>
                    ) : !messagesLoading ? (
                        <div className="flex-1 flex items-center justify-center text-secondary-500 p-8">
                            <div className="text-center">
                                <svg className="h-8 w-8 mx-auto mb-2 text-secondary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="text-sm">まだ返信がありません</p>
                                <p className="text-xs mt-1">最初の返信を送信してみましょう！</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <LoadingSpinner />
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Thread Message Input */}
                <div className="border-t border-secondary-200">
                    <MessageInput
                        channelId={parentMessage.channelId}
                        threadId={parentMessage.id}
                        onMessageSent={() => {}} // Don't use callback, rely on Socket.io
                        placeholder={`${parentUserDisplayName}に返信...`}
                        className="border-0"
                    />
                </div>
            </div>
        </div>
    );
};

export default ThreadView;