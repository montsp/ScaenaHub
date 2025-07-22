import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useSocket } from '../../hooks/useSocket';
import { apiService } from '../../services/api';
import { parseMentions, debounce, isTouchDevice } from '../../utils';
import { MAX_MESSAGE_LENGTH } from '../../constants';
import { User } from '../../types';
import MentionAutocomplete from './MentionAutocomplete';


interface MessageInputProps {
  channelId: string;
  threadId?: string;
  onMessageSent?: (message: any) => void;
  placeholder?: string;
  className?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  channelId,
  threadId,
  onMessageSent,
  placeholder = 'メッセージを入力... (Shift+Enterで改行)',
  className = '',
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    loading: sendLoading,
    execute: sendMessage,
  } = useApi(apiService.sendMessage);

  const {
    loading: uploadLoading,
    execute: uploadFile,
  } = useApi(apiService.uploadFile);

  const { startTyping, stopTyping } = useSocket();

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  // Debounced typing indicator
  const debouncedStopTyping = useCallback(
    debounce(() => {
      setIsTyping(false);
      stopTyping(channelId);
    }, 1000),
    [channelId, stopTyping]
  );

  // Check for mention trigger (@username)
  const checkForMention = useCallback((text: string, cursorPos: number) => {
    const beforeCursor = text.substring(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setShowMentionAutocomplete(true);
      
      // Calculate position for autocomplete dropdown
      const textarea = textareaRef.current;
      if (textarea) {
        const rect = textarea.getBoundingClientRect();
        const lineHeight = 20; // Approximate line height
        const lines = beforeCursor.split('\n').length - 1;
        
        setMentionPosition({
          top: rect.top - 200 + (lines * lineHeight),
          left: rect.left + 16,
        });
      }
    } else {
      setShowMentionAutocomplete(false);
      setMentionQuery('');
    }
  }, []);

  // Handle mention selection
  const handleMentionSelect = useCallback((user: User) => {
    const beforeCursor = message.substring(0, cursorPosition);
    const afterCursor = message.substring(cursorPosition);
    
    // Replace the @query with @username
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = beforeCursor.substring(0, beforeCursor.length - mentionMatch[0].length);
      const newMessage = `${beforeMention}@${user.username} ${afterCursor}`;
      setMessage(newMessage);
      
      // Set cursor position after the mention
      const newCursorPos = beforeMention.length + user.username.length + 2;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
    
    setShowMentionAutocomplete(false);
    setMentionQuery('');
  }, [message, cursorPosition]);

  // Close mention autocomplete
  const handleCloseMentionAutocomplete = useCallback(() => {
    setShowMentionAutocomplete(false);
    setMentionQuery('');
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // Limit message length
    if (value.length <= MAX_MESSAGE_LENGTH) {
      setMessage(value);
      setCursorPosition(cursorPos);
      adjustTextareaHeight();

      // Check for mention trigger
      checkForMention(value, cursorPos);

      // Handle typing indicator
      if (value.trim() && !isTyping) {
        setIsTyping(true);
        startTyping(channelId);
      }
      
      if (value.trim()) {
        debouncedStopTyping();
      } else {
        setIsTyping(false);
        stopTyping(channelId);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || sendLoading) return;

    const messageContent = message.trim();
    const { mentions } = parseMentions(messageContent);

    try {
      const response = await sendMessage(
        channelId,
        messageContent,
        mentions,
        threadId, // parentMessageId (for thread replies)
        threadId  // threadId (to identify which thread this belongs to)
      );
      
      if (response) {
        console.log('✅ Message sent successfully:', response);
        setMessage('');
        setIsTyping(false);
        adjustTextareaHeight();
        onMessageSent?.(response);
        stopTyping(channelId);
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('ファイルサイズは10MB以下にしてください');
      return;
    }

    try {
      const result = await uploadFile(file, channelId);
      if (result) {
        // Send file message
        const fileMessage = `📎 ${file.name}`;
        await sendMessage(channelId, fileMessage, []);
        onMessageSent?.(result);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('ファイルのアップロードに失敗しました');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          // Create a fake file input event
          const fakeEvent = {
            target: { files: [file] }
          } as any;
          handleFileSelect(fakeEvent);
        }
      }
    }
  };

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [channelId]);

  // Adjust height on mount
  useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  const remainingChars = MAX_MESSAGE_LENGTH - message.length;
  const isNearLimit = remainingChars < 100;

  return (
    <div className={`bg-white border-t border-secondary-200 ${className}`}>
      <div className="p-4">
        {/* Character count warning */}
        {isNearLimit && (
          <div className="mb-2 text-right">
            <span className={`text-xs ${remainingChars < 50 ? 'text-red-500' : 'text-yellow-600'}`}>
              残り {remainingChars} 文字
            </span>
          </div>
        )}

        <div className="flex items-end space-x-3">
          {/* File upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadLoading || sendLoading}
            className="p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
            title="ファイルを添付"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Message input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              className={`w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 resize-none ${
                isTouchDevice() ? 'text-base' : 'text-sm'
              }`}
              rows={1}
              disabled={sendLoading || uploadLoading}
              style={{ minHeight: '44px' }}
            />
            
            {/* Loading overlay */}
            {(sendLoading || uploadLoading) && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                <div className="flex items-center text-sm text-secondary-600">
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {uploadLoading ? 'アップロード中...' : '送信中...'}
                </div>
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendLoading || uploadLoading}
            className={`p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ${
              isTouchDevice() ? 'min-w-[48px] min-h-[48px]' : 'min-w-[44px] min-h-[44px]'
            }`}
            title="送信 (Enter)"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {/* Helper text */}
        <div className="mt-2 flex items-center justify-between text-xs text-secondary-500">
          <span>
            @ユーザー名 でメンション • Shift+Enter で改行
          </span>
          {isTyping && (
            <span className="text-primary-600">入力中...</span>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
      />

      {/* Mention Autocomplete */}
      <MentionAutocomplete
        query={mentionQuery}
        position={mentionPosition}
        onSelect={handleMentionSelect}
        onClose={handleCloseMentionAutocomplete}
        isVisible={showMentionAutocomplete}
      />
    </div>
  );
};

export default MessageInput;