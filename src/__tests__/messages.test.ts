import request from 'supertest';
import { app, server } from '../server';
import { MessageModel } from '../models/Message';
import { ChannelModel } from '../models/Channel';
import { UserModel } from '../models/User';
import { AuthService } from '../services/auth';
import { supabaseAdmin } from '../config/database';

// モデルとサービスをモック
jest.mock('../models/Message');
jest.mock('../models/Channel');
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

describe('メッセージAPI', () => {
  let server: any;

  beforeAll((done) => {
    server = app.listen(3004, done); // テスト用ポート
  });

  afterAll((done) => {
    server.close(done);
  });

  // テスト用ダミーデータ
  const testUser = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
    username: 'testuser',
    displayName: 'テストユーザー',
    roles: ['member'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    passwordHash: 'hashed-password'
  };
  const adminUser = { ...testUser, id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', roles: ['admin'] };
  const testChannel = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
    name: 'テストチャンネル',
    allowedRoles: ['admin', 'member'],
    createdBy: testUser.id,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const testMessage = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17',
    channelId: testChannel.id,
    userId: testUser.id,
    content: 'こんにちは @adminuser',
    type: 'text',
    mentions: ['adminuser'],
    reactions: [],
    attachments: [],
    isEdited: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // 認証・権限モック
    (AuthService.getCurrentUser as jest.Mock).mockResolvedValue({ success: true, data: testUser });
    (ChannelModel.canUserAccess as jest.Mock).mockResolvedValue(true);
    (UserModel.findByUsername as jest.Mock).mockResolvedValue(adminUser);
    (UserModel.findById as jest.Mock).mockResolvedValue(testUser);
  });

  describe('POST /api/messages', () => {
    it('メッセージを正常に投稿できる', async () => {
      (MessageModel.create as jest.Mock).mockResolvedValue({ success: true, data: testMessage });
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: 'こんにちは @adminuser',
          channelId: testChannel.id
        });
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('こんにちは @adminuser');
      expect(MessageModel.create).toHaveBeenCalled();
    });
    it('メンションが正しく処理される', async () => {
      (MessageModel.create as jest.Mock).mockResolvedValue({ success: true, data: testMessage });
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: 'こんにちは @adminuser',
          channelId: testChannel.id
        });
      expect(response.body.data.mentions).toContain('adminuser');
    });
    it('権限がない場合は投稿できない', async () => {
      (ChannelModel.canUserAccess as jest.Mock).mockResolvedValue(false);
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: '権限なし',
          channelId: testChannel.id
        });
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/messages/channel/:channelId', () => {
    it('メッセージ履歴を取得できる', async () => {
      (MessageModel.getByChannel as jest.Mock).mockResolvedValue({ success: true, data: [testMessage] });
      const response = await request(app)
        .get(`/api/messages/channel/${testChannel.id}`)
        .set('Authorization', 'Bearer valid-token');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data[0].id).toBe(testMessage.id);
    });
  });

  describe('PUT /api/messages/:id', () => {
    it('自分のメッセージを編集できる', async () => {
      (MessageModel.update as jest.Mock).mockResolvedValue({ success: true, data: { ...testMessage, content: '編集後' } });
      (MessageModel.findById as jest.Mock).mockResolvedValue(testMessage);
      const response = await request(app)
        .put(`/api/messages/${testMessage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ content: '編集後' });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('編集後');
    });
    it('他人のメッセージは編集できない', async () => {
      (MessageModel.findById as jest.Mock).mockResolvedValue({ ...testMessage, userId: 'other-user' });
      (MessageModel.update as jest.Mock).mockResolvedValue({ success: false, error: 'Unauthorized to edit this message' });
      const response = await request(app)
        .put(`/api/messages/${testMessage.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ content: '編集不可' });
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/messages/:id', () => {
    it('自分のメッセージを削除できる', async () => {
      (MessageModel.findById as jest.Mock).mockResolvedValue(testMessage);
      (MessageModel.delete as jest.Mock).mockResolvedValue({ success: true, data: true });
      const response = await request(app)
        .delete(`/api/messages/${testMessage.id}`)
        .set('Authorization', 'Bearer valid-token');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    it('他人のメッセージは削除できない', async () => {
      (MessageModel.findById as jest.Mock).mockResolvedValue({ ...testMessage, userId: 'other-user' });
      (MessageModel.delete as jest.Mock).mockResolvedValue({ success: false, error: 'Unauthorized to delete this message' });
      const response = await request(app)
        .delete(`/api/messages/${testMessage.id}`)
        .set('Authorization', 'Bearer valid-token');
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  // --- タスク7: リアクション・スレッド機能のテスト ---
  describe('POST /api/messages/:id/reactions', () => {
    it('メッセージにリアクションを追加できる', async () => {
      (MessageModel.findById as jest.Mock).mockResolvedValue(testMessage);
      (MessageModel.addReaction as jest.Mock).mockResolvedValue({ success: true, data: { ...testMessage, reactions: [{ emoji: '👍', users: [testUser.id], count: 1 }] } });
      const response = await request(app)
        .post(`/api/messages/${testMessage.id}/reactions`)
        .set('Authorization', 'Bearer valid-token')
        .send({ emoji: '👍' });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reactions[0].emoji).toBe('👍');
    });
    it('存在しないメッセージにはリアクションできない', async () => {
      (MessageModel.findById as jest.Mock).mockResolvedValue(null);
      const response = await request(app)
        .post(`/api/messages/${testMessage.id}/reactions`)
        .set('Authorization', 'Bearer valid-token')
        .send({ emoji: '👍' });
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/messages/:id/reactions/:emoji', () => {
    it('メッセージのリアクションを削除できる', async () => {
      (MessageModel.findById as jest.Mock).mockResolvedValue(testMessage);
      (MessageModel.removeReaction as jest.Mock).mockResolvedValue({ success: true, data: { ...testMessage, reactions: [] } });
      const emoji = encodeURIComponent('👍');
      const response = await request(app)
        .delete(`/api/messages/${testMessage.id}/reactions/${emoji}`)
        .set('Authorization', 'Bearer valid-token');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    it('存在しないメッセージのリアクションは削除できない', async () => {
      (MessageModel.findById as jest.Mock).mockResolvedValue(null);
      const emoji = encodeURIComponent('👍');
      const response = await request(app)
        .delete(`/api/messages/${testMessage.id}/reactions/${emoji}`)
        .set('Authorization', 'Bearer valid-token');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/messages/thread/:parentId', () => {
    it('スレッド（返信）一覧を取得できる', async () => {
      const reply = { ...testMessage, id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', parentMessageId: testMessage.id };
      (MessageModel.findById as jest.Mock).mockResolvedValue(testMessage);
      (MessageModel.getThreadMessages as jest.Mock).mockResolvedValue({ success: true, data: [reply] });
      (UserModel.findById as jest.Mock).mockResolvedValue(testUser);
      const response = await request(app)
        .get(`/api/messages/thread/${testMessage.id}`)
        .set('Authorization', 'Bearer valid-token');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.replies[0].id).toBe(reply.id);
    });
    it('存在しない親メッセージのスレッドは取得できない', async () => {
      (MessageModel.findById as jest.Mock).mockResolvedValue(null);
      const response = await request(app)
        .get(`/api/messages/thread/${testMessage.id}`)
        .set('Authorization', 'Bearer valid-token');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
}); 