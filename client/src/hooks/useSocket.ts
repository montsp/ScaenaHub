import { useEffect, useCallback } from 'react';
import { socketService } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import { Message, Channel, Notification } from '../types';

interface UseSocketProps {
  onMessage?: (message: Message) => void;
  onMessageUpdated?: (message: Message) => void;
  onMessageDeleted?: (messageId: string) => void;
  onChannelUpdated?: (channel: Channel) => void;
  onChannelDeleted?: (channelId: string) => void;
  onNotification?: (notification: Notification) => void;
  onUserTyping?: (channelId: string, userId: string, isTyping: boolean) => void;
}

export const useSocket = (props: UseSocketProps = {}) => {
  const { token, isAuthenticated } = useAuth();
  const {
    onMessage,
    onMessageUpdated,
    onMessageDeleted,
    onChannelUpdated,
    onChannelDeleted,
    onNotification,
    onUserTyping,
  } = props;

  // Connect to socket when authenticated
  useEffect(() => {
    if (isAuthenticated && token && !socketService.isConnected()) {
      console.log('🔌 useSocket: Connecting to socket');
      socketService.connect(token);
    } else if (!isAuthenticated) {
      console.log('🔌 useSocket: Disconnecting socket (not authenticated)');
      socketService.disconnect();
    }

    // Don't disconnect on unmount to maintain connection across components
  }, [isAuthenticated, token]);

  // Set up event listeners
  useEffect(() => {
    console.log('🔧 useSocket: Setting up event listeners');
    
    // Only add listeners if they are provided and socket is connected
    if (socketService.isConnected()) {
      if (onMessage) {
        console.log('🔧 useSocket: Adding message listener');
        socketService.onMessage(onMessage);
      }
      if (onMessageUpdated) {
        socketService.onMessageUpdated(onMessageUpdated);
      }
      if (onMessageDeleted) {
        socketService.onMessageDeleted(onMessageDeleted);
      }
      if (onChannelUpdated) {
        socketService.onChannelUpdated(onChannelUpdated);
      }
      if (onChannelDeleted) {
        socketService.onChannelDeleted(onChannelDeleted);
      }
      if (onNotification) {
        socketService.onNotification(onNotification);
      }
      if (onUserTyping) {
        socketService.onUserTyping(onUserTyping);
      }
    }

    // Cleanup function - only remove the specific listeners we added
    return () => {
      console.log('🔧 useSocket: Cleaning up event listeners');
      if (onMessage) {
        socketService.offMessage(onMessage);
      }
      if (onMessageUpdated) {
        socketService.offMessageUpdated(onMessageUpdated);
      }
      if (onMessageDeleted) {
        socketService.offMessageDeleted(onMessageDeleted);
      }
      if (onChannelUpdated) {
        socketService.offChannelUpdated(onChannelUpdated);
      }
      if (onChannelDeleted) {
        socketService.offChannelDeleted(onChannelDeleted);
      }
      if (onNotification) {
        socketService.offNotification(onNotification);
      }
      if (onUserTyping) {
        socketService.offUserTyping(onUserTyping);
      }
    };
  }, [
    onMessage,
    onMessageUpdated,
    onMessageDeleted,
    onChannelUpdated,
    onChannelDeleted,
    onNotification,
    onUserTyping,
  ]);

  // Socket utility functions
  const joinChannel = useCallback((channelId: string) => {
    socketService.joinChannel(channelId);
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    socketService.leaveChannel(channelId);
  }, []);

  const sendMessage = useCallback((channelId: string, content: string, mentions: string[] = []) => {
    socketService.sendMessage(channelId, content, mentions);
  }, []);

  const editMessage = useCallback((messageId: string, content: string) => {
    socketService.editMessage(messageId, content);
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    socketService.deleteMessage(messageId);
  }, []);

  const addReaction = useCallback((messageId: string, emoji: string) => {
    socketService.addReaction(messageId, emoji);
  }, []);

  const removeReaction = useCallback((messageId: string, emoji: string) => {
    socketService.removeReaction(messageId, emoji);
  }, []);

  const startTyping = useCallback((channelId: string) => {
    socketService.startTyping(channelId);
  }, []);

  const stopTyping = useCallback((channelId: string) => {
    socketService.stopTyping(channelId);
  }, []);

  return {
    isConnected: socketService.isConnected(),
    socketId: socketService.getSocketId(),
    joinChannel,
    leaveChannel,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    startTyping,
    stopTyping,
  };
};

export default useSocket;