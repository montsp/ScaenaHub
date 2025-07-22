import request from 'supertest';
import { app, server } from '../server';
import { AuthService } from '../services/auth';
import { UserModel } from '../models/User';
import { User } from '../types';

// Mock the database models
jest.mock('../models/User');
jest.mock('../config/database');

const mockUser: User = {
  id: 'test-user-id',
  username: 'testuser',
  passwordHash: '$2a$12$hashedpassword',
  roles: ['member'],
  displayName: 'Test User',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('Authentication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = AuthService.generateToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = AuthService.generateToken(mockUser);
      const result = AuthService.verifyToken(token);
      
      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload.id).toBe(mockUser.id);
      expect(result.payload.username).toBe(mockUser.username);
    });

    it('should reject an invalid token', () => {
      const result = AuthService.verifyToken('invalid.token.here');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.verifyPassword as jest.Mock).mockResolvedValue(true);

      const result = await AuthService.login({
        username: 'testuser',
        password: 'password123'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.user.username).toBe('testuser');
      expect(result.data?.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.verifyPassword as jest.Mock).mockResolvedValue(false);

      const result = await AuthService.login({
        username: 'testuser',
        password: 'wrongpassword'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid username or password');
    });

    it('should reject non-existent user', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(null);

      const result = await AuthService.login({
        username: 'nonexistent',
        password: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid username or password');
    });

    it('should reject inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(inactiveUser);
      (UserModel.verifyPassword as jest.Mock).mockResolvedValue(true);

      const result = await AuthService.login({
        username: 'testuser',
        password: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is deactivated');
    });
  });

  describe('register', () => {
    beforeEach(() => {
      // Mock getSystemAdminKey to return a specific key for testing
      jest.spyOn(AuthService, 'getSystemAdminKey').mockResolvedValue('valid_admin_key');
    });

    it('should register with valid data and admin key', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(null);
      (UserModel.create as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUser
      });

      // Mock environment variable
      process.env.ADMIN_KEY = 'valid_admin_key';

      const result = await AuthService.register({
        username: 'newuser',
        password: 'Password123',
        displayName: 'New User',
        adminKey: 'valid_admin_key'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.user.username).toBe('testuser');
      expect(result.data?.token).toBeDefined();
    });

    it('should reject invalid admin key', async () => {
      process.env.ADMIN_KEY = 'valid_admin_key';

      const result = await AuthService.register({
        username: 'newuser',
        password: 'Password123',
        displayName: 'New User',
        adminKey: 'invalid_key'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid admin key');
    });

    it('should reject existing username', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(mockUser);
      process.env.ADMIN_KEY = 'valid_admin_key';

      const result = await AuthService.register({
        username: 'testuser',
        password: 'Password123',
        displayName: 'New User',
        adminKey: 'valid_admin_key'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username already exists');
    });

    it('should reject weak password', async () => {
      process.env.ADMIN_KEY = 'valid_admin_key';

      const result = await AuthService.register({
        username: 'newuser',
        password: 'weak',
        displayName: 'New User',
        adminKey: 'valid_admin_key'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least 8 characters');
    });
  });

  describe('role checking', () => {
    beforeEach(() => {
      // Mock the UserModel role checking methods
      (UserModel.hasRole as jest.Mock).mockImplementation((user: User, roleName: string) => user.roles.includes(roleName));
      (UserModel.hasAnyRole as jest.Mock).mockImplementation((user: User, roleNames: string[]) => roleNames.some(role => user.roles.includes(role)));
    });

    it('should correctly identify admin users', () => {
      const adminUser = { ...mockUser, roles: ['admin'] };
      expect(AuthService.isAdmin(adminUser)).toBe(true);
      expect(AuthService.isAdmin(mockUser)).toBe(false);
    });

    it('should correctly identify moderators', () => {
      const moderatorUser = { ...mockUser, roles: ['moderator'] };
      const adminUser = { ...mockUser, roles: ['admin'] };
      
      expect(AuthService.isModerator(moderatorUser)).toBe(true);
      expect(AuthService.isModerator(adminUser)).toBe(true);
      expect(AuthService.isModerator(mockUser)).toBe(false);
    });

    it('should check specific roles', () => {
      const multiRoleUser = { ...mockUser, roles: ['member', 'moderator'] };
      
      expect(AuthService.hasRole(multiRoleUser, 'member')).toBe(true);
      expect(AuthService.hasRole(multiRoleUser, 'moderator')).toBe(true);
      expect(AuthService.hasRole(multiRoleUser, 'admin')).toBe(false);
    });

    it('should check multiple roles', () => {
      expect(AuthService.hasAnyRole(mockUser, ['admin', 'moderator'])).toBe(false);
      expect(AuthService.hasAnyRole(mockUser, ['member', 'admin'])).toBe(true);
    });
  });
});

describe('Authentication Routes', () => {
  let server: any;

  beforeAll((done) => {
    server = app.listen(3002, done); // Use a different port for testing
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.verifyPassword as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate input', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'ab', // Too short
          password: ''    // Empty
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register with valid data', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(null);
      (UserModel.create as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUser
      });

      process.env.ADMIN_KEY = 'valid_admin_key';

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          password: 'Password123',
          displayName: 'New User',
          adminKey: 'valid_admin_key'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid admin key', async () => {
      process.env.ADMIN_KEY = 'valid_admin_key';

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          password: 'Password123',
          displayName: 'New User',
          adminKey: 'invalid_key'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const token = AuthService.generateToken(mockUser);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('testuser');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});