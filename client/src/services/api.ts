import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  User, 
  LoginCredentials, 
  RegisterData, 
  Channel, 
  Message, 
  Role 
} from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = 
      await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async register(data: RegisterData): Promise<ApiResponse<{ user: User; token: string }>> {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = 
      await this.api.post('/auth/register', data);
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/auth/logout');
    return response.data;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.get('/auth/me');
    return response.data;
  }

  // Channel endpoints
  getChannels = async (): Promise<ApiResponse<Channel[]>> => {
    const response: AxiosResponse<ApiResponse<Channel[]>> = await this.api.get('/channels');
    return response.data;
  }

  createChannel = async (data: Partial<Channel>): Promise<ApiResponse<Channel>> => {
    const response: AxiosResponse<ApiResponse<Channel>> = await this.api.post('/channels', data);
    return response.data;
  }

  updateChannel = async (id: string, data: Partial<Channel>): Promise<ApiResponse<Channel>> => {
    const response: AxiosResponse<ApiResponse<Channel>> = await this.api.put(`/channels/${id}`, data);
    return response.data;
  }

  deleteChannel = async (id: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await this.api.delete(`/channels/${id}`);
    return response.data;
  }

  // Message endpoints
  getMessages = async (channelId: string, page = 1, limit = 50): Promise<ApiResponse<Message[]>> => {
    const response: AxiosResponse<ApiResponse<Message[]>> = 
      await this.api.get(`/messages/channel/${channelId}?limit=${limit}&offset=${(page - 1) * limit}`);
    return response.data;
  }

  sendMessage = async (channelId: string, content: string, mentions: string[] = [], attachments: any[] = [], parentMessageId?: string, threadId?: string): Promise<ApiResponse<Message>> => {
    const response: AxiosResponse<ApiResponse<Message>> = 
      await this.api.post(`/messages`, { channelId, content, mentions, attachments, parentMessageId, threadId });
    return response.data;
  }

  updateMessage = async (messageId: string, content: string): Promise<ApiResponse<Message>> => {
    const response: AxiosResponse<ApiResponse<Message>> = 
      await this.api.put(`/messages/${messageId}`, { content });
    return response.data;
  }

  deleteMessage = async (messageId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await this.api.delete(`/messages/${messageId}`);
    return response.data;
  }

  addReaction = async (messageId: string, emoji: string): Promise<ApiResponse> => {
    console.log('🎭 API: Adding reaction', { messageId, emoji });
    const response: AxiosResponse<ApiResponse> = 
      await this.api.post(`/messages/${messageId}/reactions`, { emoji });
    console.log('🎭 API: Add reaction response', response.data);
    return response.data;
  }

  removeReaction = async (messageId: string, emoji: string): Promise<ApiResponse> => {
    console.log('🎭 API: Removing reaction', { messageId, emoji });
    const response: AxiosResponse<ApiResponse> = 
      await this.api.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
    console.log('🎭 API: Remove reaction response', response.data);
    return response.data;
  }

  // Thread endpoints
  getThreadMessages = async (parentMessageId: string, page = 1, limit = 50): Promise<ApiResponse<Message[]>> => {
    const response: AxiosResponse<ApiResponse<Message[]>> = 
      await this.api.get(`/messages/thread/${parentMessageId}`);
    return response.data;
  }

  // File endpoints
  uploadFile = async (formData: FormData): Promise<ApiResponse<any>> => {
    console.log('📁 API: Uploading file');
    const response: AxiosResponse<ApiResponse<any>> = 
      await this.api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    console.log('📁 API: Upload response', response.data);
    return response.data;
  }

  downloadFile = async (fileId: string): Promise<Blob> => {
    console.log('📁 API: Downloading file', fileId);
    const response: AxiosResponse<Blob> = 
      await this.api.get(`/files/${fileId}/download`, {
        responseType: 'blob',
      });
    return response.data;
  }

  getFileInfo = async (fileId: string): Promise<ApiResponse<any>> => {
    const response: AxiosResponse<ApiResponse<any>> = 
      await this.api.get(`/files/${fileId}`);
    return response.data;
  }

  deleteFile = async (fileId: string): Promise<ApiResponse<any>> => {
    console.log('📁 API: Deleting file', fileId);
    const response: AxiosResponse<ApiResponse<any>> = 
      await this.api.delete(`/files/${fileId}`);
    return response.data;
  }

  

  // User endpoints
  getUsers = async (): Promise<ApiResponse<User[]>> => {
    const response: AxiosResponse<ApiResponse<User[]>> = await this.api.get('/users');
    return response.data;
  }

  updateUser = async (id: string, data: Partial<User>): Promise<ApiResponse<User>> => {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.put(`/users/${id}`, data);
    return response.data;
  }

  searchUsers = async (query: string): Promise<ApiResponse<User[]>> => {
    const response: AxiosResponse<ApiResponse<User[]>> = 
      await this.api.get(`/users/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  // Role endpoints
  async getRoles(): Promise<ApiResponse<Role[]>> {
    const response: AxiosResponse<ApiResponse<Role[]>> = await this.api.get('/roles');
    return response.data;
  }

  async createRole(data: Partial<Role>): Promise<ApiResponse<Role>> {
    const response: AxiosResponse<ApiResponse<Role>> = await this.api.post('/roles', data);
    return response.data;
  }

  async updateRole(id: string, data: Partial<Role>): Promise<ApiResponse<Role>> {
    const response: AxiosResponse<ApiResponse<Role>> = await this.api.put(`/roles/${id}`, data);
    return response.data;
  }

  async deleteRole(id: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.delete(`/roles/${id}`);
    return response.data;
  }



  // Backup endpoints (admin only)
  async triggerBackup(method: 'google_drive' | 'github' | 'both' = 'both'): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/backup', { method });
    return response.data;
  }

  async getBackupStatus(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.get('/backup/status');
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;