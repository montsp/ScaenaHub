import request from 'supertest';
import { app, server } from '../server';
import { ChannelModel } from '../models/Channel';
import { RoleModel } from '../models/Role';
import { UserModel } from '../models/User';
import { AuthService } from '../services/auth';
import { supabaseAdmin } from '../config/database';

// Mock the models and services
jest.mock('../models/Channel');
jest.mock('../models/Role');
jest.mock('../models/User');
jest.mock('../services/auth');
jest.mock('../config/database', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
  },
  supabaseAdmin: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
  }
}));

describe('Channel Management API', () => {
  let server: any;

  beforeAll((done) => {
    server = app.listen(3003, done); // Use a different port for testing
  });

  afterAll((done) => {
    server.close(done);
  });
  // Test data
  const testUser = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
    username: 'testuser',
    displayName: 'Test User',
    roles: ['admin'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    passwordHash: 'hashed-password'
  };

  const testChannel = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    name: 'Test Channel',
    description: 'Test channel description',
    type: 'public' as const,
    allowedRoles: ['admin', 'member'],
    createdBy: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const testChannelWithStats = {
    ...testChannel,
    stats: {
      messageCount: 10,
      memberCount: 5,
      lastActivity: new Date()
    }
  };

  const testRole = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    name: 'admin',
    description: 'Administrator role',
    permissions: {
      'channels.create': true,
      'channels.manage': true
    },
    channelPermissions: {
      default: { read: true, write: true, manage: true }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Setup mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock role checks for middleware
    (AuthService.isAdmin as jest.Mock).mockImplementation((user: any) => user.roles.includes('admin'));
    (RoleModel.hasPermission as jest.Mock).mockReturnValue(true); // Assume hasPermission is checked

    // Mock AuthService.getCurrentUser
    (AuthService.getCurrentUser as jest.Mock).mockResolvedValue({
      success: true,
      data: testUser
    });

    // Mock RoleModel.findByName
    (RoleModel.findByName as jest.Mock).mockResolvedValue(testRole);

    // Mock RoleModel.hasPermission
    (RoleModel.hasPermission as jest.Mock).mockReturnValue(true);

    // Mock RoleModel.hasChannelAccess
    (RoleModel.hasChannelAccess as jest.Mock).mockResolvedValue(true);

    // Mock ChannelModel.canUserAccess
    (ChannelModel.canUserAccess as jest.Mock).mockResolvedValue(true);
  });

  describe('GET /api/channels', () => {
    it('should return accessible channels for user', async () => {
      // Mock ChannelModel.getAccessibleChannels
      (ChannelModel.getAccessibleChannels as jest.Mock).mockResolvedValue({
        success: true,
        data: [testChannel]
      });

      // Mock ChannelModel.getStats
      (ChannelModel.getStats as jest.Mock).mockResolvedValue({
        success: true,
        data: testChannelWithStats.stats
      });

      const response = await request(app)
        .get('/api/channels')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(testChannel.id);
      expect(response.body.data[0].stats).toBeDefined();
      expect(ChannelModel.getAccessibleChannels).toHaveBeenCalledWith(testUser.roles);
    });

    it('should filter channels by type', async () => {
      // Mock ChannelModel.getAccessibleChannels
      (ChannelModel.getAccessibleChannels as jest.Mock).mockResolvedValue({
        success: true,
        data: [testChannel]
      });

      // Mock ChannelModel.getStats
      (ChannelModel.getStats as jest.Mock).mockResolvedValue({
        success: true,
        data: testChannelWithStats.stats
      });

      const response = await request(app)
        .get('/api/channels?type=public')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should filter channels by search term', async () => {
      // Mock ChannelModel.getAccessibleChannels
      (ChannelModel.getAccessibleChannels as jest.Mock).mockResolvedValue({
        success: true,
        data: [testChannel]
      });

      // Mock ChannelModel.getStats
      (ChannelModel.getStats as jest.Mock).mockResolvedValue({
        success: true,
        data: testChannelWithStats.stats
      });

      const response = await request(app)
        .get('/api/channels?search=Test')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should handle errors when fetching channels', async () => {
      // Mock ChannelModel.getAccessibleChannels with error
      (ChannelModel.getAccessibleChannels as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const response = await request(app)
        .get('/api/channels')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/channels/all', () => {
    it('should return all channels for admin', async () => {
      // Mock ChannelModel.getAll
      (ChannelModel.getAll as jest.Mock).mockResolvedValue({
        success: true,
        data: [testChannel]
      });

      // Mock ChannelModel.getStats
      (ChannelModel.getStats as jest.Mock).mockResolvedValue({
        success: true,
        data: testChannelWithStats.stats
      });

      const response = await request(app)
        .get('/api/channels/all')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(testChannel.id);
      expect(response.body.data[0].stats).toBeDefined();
    });

    it('should handle errors when fetching all channels', async () => {
      // Mock ChannelModel.getAll with error
      (ChannelModel.getAll as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const response = await request(app)
        .get('/api/channels/all')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/channels/:id', () => {
    it('should return a specific channel', async () => {
      // Mock ChannelModel.findById
      (ChannelModel.findById as jest.Mock).mockResolvedValue(testChannel);

      // Mock ChannelModel.getStats
      (ChannelModel.getStats as jest.Mock).mockResolvedValue({
        success: true,
        data: testChannelWithStats.stats
      });

      const response = await request(app)
        .get(`/api/channels/${testChannel.id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testChannel.id);
      expect(response.body.data.stats).toBeDefined();
    });

    it('should return 404 for non-existent channel', async () => {
      // Mock ChannelModel.findById with null
      (ChannelModel.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/channels/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/channels', () => {
    it('should create a new channel', async () => {
      // Mock ChannelModel.getAll
      (ChannelModel.getAll as jest.Mock).mockResolvedValue({
        success: true,
        data: []
      });

      // Mock ChannelModel.create
      (ChannelModel.create as jest.Mock).mockResolvedValue({
        success: true,
        data: testChannel
      });

      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test Channel',
          description: 'Test channel description',
          type: 'public',
          allowedRoles: ['admin', 'member']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testChannel.id);
      expect(ChannelModel.create).toHaveBeenCalledWith({
        name: 'Test Channel',
        description: 'Test channel description',
        type: 'public',
        allowedRoles: ['admin', 'member'],
        createdBy: testUser.id
      });
    });

    it('should reject channel creation with duplicate name', async () => {
      // Mock ChannelModel.getAll with existing channel
      (ChannelModel.getAll as jest.Mock).mockResolvedValue({
        success: true,
        data: [testChannel]
      });

      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test Channel', // Same name as existing channel
          description: 'Another channel',
          type: 'public',
          allowedRoles: ['admin', 'member']
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should validate channel creation input', async () => {
      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: '', // Empty name should fail validation
          type: 'invalid-type',
          allowedRoles: []
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeDefined();
    });
  });

  describe('PUT /api/channels/:id', () => {
    it('should update a channel', async () => {
      // Mock ChannelModel.getAll
      (ChannelModel.getAll as jest.Mock).mockResolvedValue({
        success: true,
        data: [testChannel]
      });

      // Mock ChannelModel.update
      (ChannelModel.update as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          ...testChannel,
          name: 'Updated Channel',
          description: 'Updated description'
        }
      });

      const response = await request(app)
        .put(`/api/channels/${testChannel.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Channel',
          description: 'Updated description'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Channel');
      expect(ChannelModel.update).toHaveBeenCalledWith(testChannel.id, {
        name: 'Updated Channel',
        description: 'Updated description'
      });
    });

    it('should reject update with duplicate name', async () => {
      // Mock ChannelModel.getAll with another channel
      (ChannelModel.getAll as jest.Mock).mockResolvedValue({
        success: true,
        data: [
          testChannel,
          {
            ...testChannel,
            id: 'channel-456',
            name: 'Another Channel'
          }
        ]
      });

      const response = await request(app)
        .put(`/api/channels/${testChannel.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Another Channel', // Name of another existing channel
          description: 'Updated description', // Add other required fields
          type: 'public', // Add other required fields
          allowedRoles: ['admin', 'member'] // Add other required fields
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should validate channel update input', async () => {
      const response = await request(app)
        .put('/api/channels/channel-123')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: '', // Empty name should fail validation
          type: 'invalid-type'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeDefined();
    });
  });

  describe('PUT /api/channels/:id/permissions', () => {
    it('should update channel permissions', async () => {
      // Mock ChannelModel.updatePermissions
      (ChannelModel.updatePermissions as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          ...testChannel,
          allowedRoles: ['admin', 'member', 'viewer']
        }
      });

      const response = await request(app)
        .put(`/api/channels/${testChannel.id}/permissions`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          allowedRoles: ['admin', 'member', 'viewer']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.allowedRoles).toContain('viewer');
      expect(ChannelModel.updatePermissions).toHaveBeenCalledWith(
        testChannel.id,
        ['admin', 'member', 'viewer']
      );
    });

    it('should validate permissions update input', async () => {
      const response = await request(app)
        .put('/api/channels/channel-123/permissions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          allowedRoles: [] // Empty roles array should fail validation
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeDefined();
    });
  });

  describe('DELETE /api/channels/:id', () => {
    it('should delete a channel', async () => {
      // Mock ChannelModel.findById
      (ChannelModel.findById as jest.Mock).mockResolvedValue(testChannel);

      // Mock ChannelModel.delete
      (ChannelModel.delete as jest.Mock).mockResolvedValue({
        success: true,
        data: true
      });

      const response = await request(app)
        .delete(`/api/channels/${testChannel.id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
      expect(ChannelModel.delete).toHaveBeenCalledWith(testChannel.id);
    });

    it('should return 404 for non-existent channel', async () => {
      // Mock ChannelModel.findById with null
      (ChannelModel.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/channels/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/channels/:id/stats', () => {
    it('should return channel statistics', async () => {
      // Mock ChannelModel.getStats
      (ChannelModel.getStats as jest.Mock).mockResolvedValue({
        success: true,
        data: testChannelWithStats.stats
      });

      const response = await request(app)
        .get(`/api/channels/${testChannel.id}/stats`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.messageCount).toBe(testChannelWithStats.stats.messageCount);
      expect(response.body.data.memberCount).toBe(testChannelWithStats.stats.memberCount);
      expect(ChannelModel.getStats).toHaveBeenCalledWith(testChannel.id);
    });

    it('should handle errors when fetching channel stats', async () => {
      // Mock ChannelModel.getStats with error
      (ChannelModel.getStats as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const response = await request(app)
        .get(`/api/channels/${testChannel.id}/stats`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});