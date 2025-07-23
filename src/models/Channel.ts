import { supabase, supabaseAdmin } from '../config/database';
import { Channel, ApiResponse } from '../types';
import { RoleModel } from './Role';

export class ChannelModel {
  // Create a new channel
  static async create(channelData: {
    name: string;
    description?: string;
    type: 'public' | 'private';
    allowedRoles: string[];
    createdBy: string;
  }): Promise<ApiResponse<Channel>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('channels')
        .insert({
          name: channelData.name,
          description: channelData.description || '',
          type: channelData.type,
          allowed_roles: channelData.allowedRoles,
          created_by: channelData.createdBy
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
          name: data.name,
          description: data.description,
          type: data.type,
          allowedRoles: data.allowed_roles,
          createdBy: data.created_by,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get all channels accessible to user roles
  static async getAccessibleChannels(userRoles: string[]): Promise<ApiResponse<Channel[]>> {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .or(
          `type.eq.public,allowed_roles.ov.{${userRoles.join(',')}}`
        )
        .order('name');

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      const channels = data.map(channel => ({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        type: channel.type,
        allowedRoles: channel.allowed_roles,
        createdBy: channel.created_by,
        createdAt: new Date(channel.created_at),
        updatedAt: new Date(channel.updated_at)
      }));

      return {
        success: true,
        data: channels
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get all channels (admin only)
  static async getAll(): Promise<ApiResponse<Channel[]>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('channels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      const channels = data.map(channel => ({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        type: channel.type,
        allowedRoles: channel.allowed_roles,
        createdBy: channel.created_by,
        createdAt: new Date(channel.created_at),
        updatedAt: new Date(channel.updated_at)
      }));

      return {
        success: true,
        data: channels
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Find channel by ID
  static async findById(id: string): Promise<Channel | null> {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        type: data.type,
        allowedRoles: data.allowed_roles,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error finding channel by ID:', error);
      return null;
    }
  }

  // Check if user can access channel
  static async canUserAccess(
    channelId: string, 
    userRoles: string[], 
    accessType: 'read' | 'write' | 'manage' = 'read'
  ): Promise<boolean> {
    try {
      const channel = await this.findById(channelId);
      if (!channel) {
        console.log(`Channel ${channelId} not found`);
        return false;
      }

      console.log(`Checking access for channel ${channelId}, type: ${accessType}, userRoles:`, userRoles);
      console.log(`Channel allowedRoles:`, channel.allowedRoles);

      // Public channels are accessible by all authenticated users for read/write
      if (channel.type === 'public') {
        console.log(`Public channel - allowing ${accessType} access`);
        return true;
      }

      // Check if user has any of the allowed roles
      const hasAllowedRole = userRoles.some(role => 
        channel.allowedRoles.includes(role)
      );

      console.log(`Has allowed role: ${hasAllowedRole}`);

      if (!hasAllowedRole) return false;

      // For private channels, if user has allowed role, grant access
      // Simplified logic - remove complex role-specific channel permissions for now
      return true;
    } catch (error) {
      console.error('Error checking channel access:', error);
      return false;
    }
  }

  // Update channel permissions
  static async updatePermissions(
    channelId: string,
    allowedRoles: string[]
  ): Promise<ApiResponse<Channel>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('channels')
        .update({ allowed_roles: allowedRoles })
        .eq('id', channelId)
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
          name: data.name,
          description: data.description,
          type: data.type,
          allowedRoles: data.allowed_roles,
          createdBy: data.created_by,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Update channel details
  static async update(
    channelId: string,
    updates: {
      name?: string;
      description?: string;
      type?: 'public' | 'private';
      allowedRoles?: string[];
    }
  ): Promise<ApiResponse<Channel>> {
    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.type) updateData.type = updates.type;
      if (updates.allowedRoles) updateData.allowed_roles = updates.allowedRoles;

      const { data, error } = await supabaseAdmin
        .from('channels')
        .update(updateData)
        .eq('id', channelId)
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
          name: data.name,
          description: data.description,
          type: data.type,
          allowedRoles: data.allowed_roles,
          createdBy: data.created_by,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Delete channel
  static async delete(channelId: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabaseAdmin
        .from('channels')
        .delete()
        .eq('id', channelId);

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

  // Get channel statistics
  static async getStats(channelId: string): Promise<ApiResponse<{
    messageCount: number;
    memberCount: number;
    lastActivity: Date | null;
  }>> {
    try {
      // Get message count
      const { count: messageCount, error: messageError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channelId);

      if (messageError) {
        return {
          success: false,
          error: messageError.message
        };
      }

      // Get last activity
      const { data: lastMessage, error: lastMessageError } = await supabase
        .from('messages')
        .select('created_at')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const lastActivity = lastMessage ? new Date(lastMessage.created_at) : null;

      // Get channel info for member count calculation
      const channel = await this.findById(channelId);
      if (!channel) {
        return {
          success: false,
          error: 'Channel not found'
        };
      }

      // Count users with allowed roles
      const { count: memberCount, error: memberError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .overlaps('roles', channel.allowedRoles)
        .eq('is_active', true);

      if (memberError) {
        return {
          success: false,
          error: memberError.message
        };
      }

      return {
        success: true,
        data: {
          messageCount: messageCount || 0,
          memberCount: memberCount || 0,
          lastActivity
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}