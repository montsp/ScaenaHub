import { supabase, supabaseAdmin } from '../config/database';
import { Message, Reaction, Attachment, ApiResponse } from '../types';

export class MessageModel {
  // Create a new message
  static async create(messageData: {
    channelId: string;
    userId: string;
    content: string;
    type?: 'text' | 'file' | 'system';
    threadId?: string;
    parentMessageId?: string;
    mentions?: string[];
    attachments?: Attachment[];
  }): Promise<ApiResponse<Message>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('messages')
        .insert({
          channel_id: messageData.channelId,
          user_id: messageData.userId,
          content: messageData.content,
          type: messageData.type || 'text',
          thread_id: messageData.threadId,
          parent_message_id: messageData.parentMessageId,
          mentions: messageData.mentions || [],
          attachments: messageData.attachments || []
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: {
          id: data.id,
          channelId: data.channel_id,
          userId: data.user_id,
          content: data.content,
          type: data.type,
          threadId: data.thread_id,
          parentMessageId: data.parent_message_id,
          mentions: data.mentions,
          reactions: data.reactions,
          attachments: data.attachments,
          isEdited: data.is_edited,
          editedAt: data.edited_at ? new Date(data.edited_at) : undefined,
          createdAt: new Date(data.created_at)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get messages for a channel with pagination
  static async getByChannel(
    channelId: string,
    limit: number = 50,
    offset: number = 0,
    threadId?: string
  ): Promise<ApiResponse<Message[]>> {
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Filter by thread if specified
      if (threadId) {
        query = query.eq('thread_id', threadId);
      } else {
        // Only get top-level messages (not in threads)
        query = query.is('parent_message_id', null);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      const messages = data.map(msg => ({
        id: msg.id,
        channelId: msg.channel_id,
        userId: msg.user_id,
        content: msg.content,
        type: msg.type,
        threadId: msg.thread_id,
        parentMessageId: msg.parent_message_id,
        mentions: msg.mentions,
        reactions: msg.reactions,
        attachments: msg.attachments,
        isEdited: msg.is_edited,
        editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
        createdAt: new Date(msg.created_at)
      }));

      return {
        success: true,
        data: messages.reverse() // Return in chronological order
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Find message by ID
  static async findById(id: string): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        channelId: data.channel_id,
        userId: data.user_id,
        content: data.content,
        type: data.type,
        threadId: data.thread_id,
        parentMessageId: data.parent_message_id,
        mentions: data.mentions,
        reactions: data.reactions,
        attachments: data.attachments,
        isEdited: data.is_edited,
        editedAt: data.edited_at ? new Date(data.edited_at) : undefined,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Error finding message by ID:', error);
      return null;
    }
  }

  // Update message content
  static async update(
    messageId: string,
    content: string,
    userId: string
  ): Promise<ApiResponse<Message>> {
    try {
      // First check if user owns the message
      const message = await this.findById(messageId);
      if (!message || message.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized to edit this message'
        };
      }

      const { data, error } = await supabaseAdmin
        .from('messages')
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: {
          id: data.id,
          channelId: data.channel_id,
          userId: data.user_id,
          content: data.content,
          type: data.type,
          threadId: data.thread_id,
          parentMessageId: data.parent_message_id,
          mentions: data.mentions,
          reactions: data.reactions,
          attachments: data.attachments,
          isEdited: data.is_edited,
          editedAt: data.edited_at ? new Date(data.edited_at) : undefined,
          createdAt: new Date(data.created_at)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Delete message
  static async delete(messageId: string, userId: string, isAdmin: boolean = false): Promise<ApiResponse<boolean>> {
    try {
      // Check if user owns the message or is admin
      if (!isAdmin) {
        const message = await this.findById(messageId);
        if (!message || message.userId !== userId) {
          return {
            success: false,
            error: 'Unauthorized to delete this message'
          };
        }
      }

      const { error } = await supabaseAdmin
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Add reaction to message
  static async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<ApiResponse<Message>> {
    try {
      const message = await this.findById(messageId);
      if (!message) {
        return {
          success: false,
          error: 'Message not found'
        };
      }

      const reactions = [...message.reactions];
      const existingReaction = reactions.find(r => r.emoji === emoji);

      if (existingReaction) {
        // Add user to existing reaction if not already there
        if (!existingReaction.users.includes(userId)) {
          existingReaction.users.push(userId);
          existingReaction.count = existingReaction.users.length;
        }
      } else {
        // Create new reaction
        reactions.push({
          emoji,
          users: [userId],
          count: 1
        });
      }

      const { data, error } = await supabaseAdmin
        .from('messages')
        .update({ reactions })
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: {
          id: data.id,
          channelId: data.channel_id,
          userId: data.user_id,
          content: data.content,
          type: data.type,
          threadId: data.thread_id,
          parentMessageId: data.parent_message_id,
          mentions: data.mentions,
          reactions: data.reactions,
          attachments: data.attachments,
          isEdited: data.is_edited,
          editedAt: data.edited_at ? new Date(data.edited_at) : undefined,
          createdAt: new Date(data.created_at)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Remove reaction from message
  static async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<ApiResponse<Message>> {
    try {
      const message = await this.findById(messageId);
      if (!message) {
        return {
          success: false,
          error: 'Message not found'
        };
      }

      const reactions = message.reactions
        .map(reaction => {
          if (reaction.emoji === emoji) {
            const users = reaction.users.filter(id => id !== userId);
            return users.length > 0 ? {
              ...reaction,
              users,
              count: users.length
            } : null;
          }
          return reaction;
        })
        .filter(Boolean) as Reaction[];

      const { data, error } = await supabaseAdmin
        .from('messages')
        .update({ reactions })
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: {
          id: data.id,
          channelId: data.channel_id,
          userId: data.user_id,
          content: data.content,
          type: data.type,
          threadId: data.thread_id,
          parentMessageId: data.parent_message_id,
          mentions: data.mentions,
          reactions: data.reactions,
          attachments: data.attachments,
          isEdited: data.is_edited,
          editedAt: data.edited_at ? new Date(data.edited_at) : undefined,
          createdAt: new Date(data.created_at)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get thread messages
  static async getThreadMessages(parentMessageId: string): Promise<ApiResponse<Message[]>> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('parent_message_id', parentMessageId)
        .order('created_at', { ascending: true });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      const messages = data.map(msg => ({
        id: msg.id,
        channelId: msg.channel_id,
        userId: msg.user_id,
        content: msg.content,
        type: msg.type,
        threadId: msg.thread_id,
        parentMessageId: msg.parent_message_id,
        mentions: msg.mentions,
        reactions: msg.reactions,
        attachments: msg.attachments,
        isEdited: msg.is_edited,
        editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
        createdAt: new Date(msg.created_at)
      }));

      return {
        success: true,
        data: messages
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Search messages
  static async search(
    query: string,
    channelId?: string,
    limit: number = 20
  ): Promise<ApiResponse<Message[]>> {
    try {
      let dbQuery = supabase
        .from('messages')
        .select('*')
        .textSearch('content', query)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (channelId) {
        dbQuery = dbQuery.eq('channel_id', channelId);
      }

      const { data, error } = await dbQuery;

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      const messages = data.map(msg => ({
        id: msg.id,
        channelId: msg.channel_id,
        userId: msg.user_id,
        content: msg.content,
        type: msg.type,
        threadId: msg.thread_id,
        parentMessageId: msg.parent_message_id,
        mentions: msg.mentions,
        reactions: msg.reactions,
        attachments: msg.attachments,
        isEdited: msg.is_edited,
        editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
        createdAt: new Date(msg.created_at)
      }));

      return {
        success: true,
        data: messages
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}