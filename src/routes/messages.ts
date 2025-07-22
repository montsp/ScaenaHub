import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { MessageModel } from '../models/Message';
import { ChannelModel } from '../models/Channel';
import { UserModel } from '../models/User';
import { authenticateToken, requireChannelAccess } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { Message, ApiResponse } from '../types';
import { io } from '../server';

const router = Router();

// Validation middleware
const validateMessageCreation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters'),
  body('channelId')
    .isUUID()
    .withMessage('Valid channel ID is required'),
  body('type')
    .optional()
    .isIn(['text', 'file', 'system'])
    .withMessage('Message type must be text, file, or system'),
  body('threadId')
    .optional()
    .isUUID()
    .withMessage('Thread ID must be a valid UUID'),
  body('parentMessageId')
    .optional()
    .isUUID()
    .withMessage('Parent message ID must be a valid UUID'),
  body('mentions')
    .optional()
    .isArray()
    .withMessage('Mentions must be an array'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array')
];

const validateMessageUpdate = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters')
];

const validateMessageId = [
  param('id')
    .isUUID()
    .withMessage('Invalid message ID format')
];

const validateReaction = [
  body('emoji')
    .isString()
    .isLength({ min: 1, max: 10 })
    .withMessage('Emoji must be between 1 and 10 characters')
];

// Helper function to handle validation errors
const handleValidationErrors = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
    return true;
  }
  return false;
};

// Helper function to extract mentions from message content
const extractMentions = (content: string): string[] => {
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
};

// POST /api/messages - Create new message
router.post('/',
  authenticateToken,
  validateMessageCreation,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const user = req.user!;
      const { content, channelId, type, threadId, parentMessageId, attachments } = req.body;

      // Check if user has access to the channel
      const hasAccess = await ChannelModel.canUserAccess(
        channelId,
        user.roles,
        'write'
      );

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to post in this channel'
        });
        return;
      }

      // If this is a thread reply, check if parent message exists
      if (parentMessageId) {
        const parentMessage = await MessageModel.findById(parentMessageId);
        if (!parentMessage) {
          res.status(404).json({
            success: false,
            error: 'Parent message not found'
          });
          return;
        }
      }

      // Extract mentions from content
      const extractedMentions = extractMentions(content);
      
      // Validate mentioned users exist
      const mentions = req.body.mentions || extractedMentions;
      if (mentions && mentions.length > 0) {
        const validatedMentions = await Promise.all(
          mentions.map(async (username: string) => {
            const user = await UserModel.findByUsername(username);
            return user ? username : null;
          })
        );
        
        // Filter out non-existent users
        const validMentions = validatedMentions.filter(Boolean) as string[];
        
        // Create message with validated mentions
        const result = await MessageModel.create({
          channelId,
          userId: user.id,
          content,
          type: type || 'text',
          threadId,
          parentMessageId,
          mentions: validMentions,
          attachments
        });

        if (!result.success) {
          res.status(500).json({
            success: false,
            error: result.error
          });
          return;
        }

        // Get user details for the message
        const messageUser = await UserModel.findById(user.id);
        const messageWithUser = {
          ...result.data,
          user: messageUser ? {
            id: messageUser.id,
            username: messageUser.username,
            displayName: messageUser.displayName,
            avatar: messageUser.avatar,
            roles: messageUser.roles
          } : null
        };

        // Broadcast new message to channel (including sender)
        console.log('🔥 Broadcasting message to channel:', channelId, 'Message ID:', result.data?.id);
        if (threadId) {
          // For thread messages, broadcast to thread-specific room
          console.log('🧵 Broadcasting thread message:', threadId);
          io.in(channelId).emit('thread:message', messageWithUser);
        } else {
          // For regular messages, broadcast to channel
          io.in(channelId).emit('message:new', messageWithUser);
        }

        res.status(201).json({
          success: true,
          data: result.data,
          message: 'Message created successfully'
        });
        return;
      } else {
        // Create message without mentions
        const result = await MessageModel.create({
          channelId,
          userId: user.id,
          content,
          type: type || 'text',
          threadId,
          parentMessageId,
          attachments
        });

        if (!result.success) {
          res.status(500).json({
            success: false,
            error: result.error
          });
          return;
        }

        // Get user details for the message
        const messageUser = await UserModel.findById(user.id);
        const messageWithUser = {
          ...result.data,
          user: messageUser ? {
            id: messageUser.id,
            username: messageUser.username,
            displayName: messageUser.displayName,
            avatar: messageUser.avatar,
            roles: messageUser.roles
          } : null
        };

        // Broadcast new message to channel (including sender)
        console.log('🔥 Broadcasting message to channel (no mentions):', channelId, 'Message ID:', result.data?.id);
        if (threadId) {
          // For thread messages, broadcast to thread-specific room
          console.log('🧵 Broadcasting thread message:', threadId);
          io.in(channelId).emit('thread:message', messageWithUser);
        } else {
          // For regular messages, broadcast to channel
          io.in(channelId).emit('message:new', messageWithUser);
        }

        res.status(201).json({
          success: true,
          data: result.data,
          message: 'Message created successfully'
        });
      }
    } catch (error) {
      console.error('Create message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create message'
      });
    }
  }
);

// GET /api/messages/channel/:channelId - Get messages for a channel
router.get('/channel/:channelId',
  authenticateToken,
  requireChannelAccess('read'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a positive integer'),
  query('threadId').optional().isUUID().withMessage('Thread ID must be a valid UUID'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { channelId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const threadId = req.query.threadId as string | undefined;

      const result = await MessageModel.getByChannel(channelId, limit, offset, threadId);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      // Fetch user details for each message
      const messages = result.data ?? [];
      const messagesWithUsers = await Promise.all(
        messages.map(async (message) => {
          const user = await UserModel.findById(message.userId);
          return {
            ...message,
            user: user ? {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatar: user.avatar,
              roles: user.roles
            } : null
          };
        })
      );

      res.json({
        success: true,
        data: messagesWithUsers,
        pagination: {
          limit,
          offset,
          hasMore: messages.length === limit
        }
      });
    } catch (error) {
      console.error('Get channel messages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve messages'
      });
    }
  }
);

// GET /api/messages/:id - Get specific message
router.get('/:id',
  authenticateToken,
  validateMessageId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { id } = req.params;
      const message = await MessageModel.findById(id);

      if (!message) {
        res.status(404).json({
          success: false,
          error: 'Message not found'
        });
        return;
      }

      // Check if user has access to the channel where the message is
      const hasAccess = await ChannelModel.canUserAccess(
        message.channelId,
        req.user!.roles,
        'read'
      );

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to view this message'
        });
        return;
      }

      // Get user details
      const user = await UserModel.findById(message.userId);

      res.json({
        success: true,
        data: {
          ...message,
          user: user ? {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            roles: user.roles
          } : null
        }
      });
    } catch (error) {
      console.error('Get message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve message'
      });
    }
  }
);

// PUT /api/messages/:id - Update message
router.put('/:id',
  authenticateToken,
  validateMessageId,
  validateMessageUpdate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { id } = req.params;
      const { content } = req.body;
      const user = req.user!;

      // Check if message exists
      const message = await MessageModel.findById(id);
      if (!message) {
        res.status(404).json({
          success: false,
          error: 'Message not found'
        });
        return;
      }

      // Check if user is the author or has admin permissions
      const isAdmin = user.roles.includes('admin');
      const isModerator = user.roles.includes('moderator');
      const isAuthor = message.userId === user.id;

      if (!isAuthor && !isAdmin && !isModerator) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to edit this message'
        });
        return;
      }

      // Extract new mentions from updated content
      const extractedMentions = extractMentions(content);
      
      // Update message
      const result = await MessageModel.update(id, content, user.id);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
        message: 'Message updated successfully'
      });
    } catch (error) {
      console.error('Update message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update message'
      });
    }
  }
);

// DELETE /api/messages/:id - Delete message
router.delete('/:id',
  authenticateToken,
  validateMessageId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { id } = req.params;
      const user = req.user!;

      // Check if message exists
      const message = await MessageModel.findById(id);
      if (!message) {
        res.status(404).json({
          success: false,
          error: 'Message not found'
        });
        return;
      }

      // Check if user is the author or has admin permissions
      const isAdmin = user.roles.includes('admin');
      const isModerator = user.roles.includes('moderator');
      
      // Delete message
      const result = await MessageModel.delete(id, user.id, isAdmin || isModerator);

      if (!result.success) {
        res.status(403).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete message'
      });
    }
  }
);

// GET /api/messages/thread/:parentId - Get thread messages
router.get('/thread/:parentId',
  authenticateToken,
  param('parentId').isUUID().withMessage('Invalid parent message ID format'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { parentId } = req.params;
      
      // Check if parent message exists
      const parentMessage = await MessageModel.findById(parentId);
      if (!parentMessage) {
        res.status(404).json({
          success: false,
          error: 'Parent message not found'
        });
        return;
      }

      // Check if user has access to the channel
      const hasAccess = await ChannelModel.canUserAccess(
        parentMessage.channelId,
        req.user!.roles,
        'read'
      );

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to view this thread'
        });
        return;
      }

      // Get thread messages
      const result = await MessageModel.getThreadMessages(parentId);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      // Fetch user details for each message
      const threadMessages = result.data ?? [];
      const messagesWithUsers = await Promise.all(
        threadMessages.map(async (message) => {
          const user = await UserModel.findById(message.userId);
          return {
            ...message,
            user: user ? {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatar: user.avatar,
              roles: user.roles
            } : null
          };
        })
      );

      res.json({
        success: true,
        data: messagesWithUsers
      });
    } catch (error) {
      console.error('Get thread messages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve thread messages'
      });
    }
  }
);

// POST /api/messages/:id/reactions - Add reaction to message
router.post('/:id/reactions',
  authenticateToken,
  validateMessageId,
  validateReaction,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { id } = req.params;
      const { emoji } = req.body;
      const user = req.user!;

      // Check if message exists
      const message = await MessageModel.findById(id);
      if (!message) {
        res.status(404).json({
          success: false,
          error: 'Message not found'
        });
        return;
      }

      // Check if user has access to the channel
      const hasAccess = await ChannelModel.canUserAccess(
        message.channelId,
        user.roles,
        'read'
      );

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to react to this message'
        });
        return;
      }

      // Add reaction
      const result = await MessageModel.addReaction(id, user.id, emoji);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
        message: 'Reaction added successfully'
      });
    } catch (error) {
      console.error('Add reaction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add reaction'
      });
    }
  }
);

// DELETE /api/messages/:id/reactions/:emoji - Remove reaction from message
router.delete('/:id/reactions/:emoji',
  authenticateToken,
  validateMessageId,
  param('emoji').isString().withMessage('Emoji parameter is required'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { id, emoji } = req.params;
      const user = req.user!;

      // Check if message exists
      const message = await MessageModel.findById(id);
      if (!message) {
        res.status(404).json({
          success: false,
          error: 'Message not found'
        });
        return;
      }

      // Remove reaction
      const result = await MessageModel.removeReaction(id, user.id, emoji);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
        message: 'Reaction removed successfully'
      });
    } catch (error) {
      console.error('Remove reaction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove reaction'
      });
    }
  }
);

// GET /api/messages/search - Search messages
router.get('/search',
  authenticateToken,
  query('q').isString().isLength({ min: 1 }).withMessage('Search query is required'),
  query('channelId').optional().isUUID().withMessage('Channel ID must be a valid UUID'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (handleValidationErrors(req, res)) return;

      const query = req.query.q as string;
      const channelId = req.query.channelId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      // If channelId is provided, check if user has access to the channel
      if (channelId) {
        const hasAccess = await ChannelModel.canUserAccess(
          channelId,
          req.user!.roles,
          'read'
        );

        if (!hasAccess) {
          res.status(403).json({
            success: false,
            error: 'You do not have permission to search in this channel'
          });
          return;
        }
      }

      // Search messages
      const result = await MessageModel.search(query, channelId, limit);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      // Filter messages by channel access
      const searchMessages = result.data ?? [];
      const accessibleMessages = await Promise.all(
        searchMessages.map(async (message) => {
          const hasAccess = await ChannelModel.canUserAccess(
            message.channelId,
            req.user!.roles,
            'read'
          );
          return hasAccess ? message : null;
        })
      );

      // Fetch user details for each message
      const messagesWithUsers = await Promise.all(
        accessibleMessages
          .filter(Boolean)
          .map(async (message) => {
            if (!message) return null;
            const user = await UserModel.findById(message.userId);
            return {
              ...message,
              user: user ? {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar,
                roles: user.roles
              } : null
            };
          })
      );

      res.json({
        success: true,
        data: messagesWithUsers.filter(Boolean),
        query: {
          text: query,
          channelId,
          limit
        }
      });
    } catch (error) {
      console.error('Search messages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search messages'
      });
    }
  }
);

export default router;