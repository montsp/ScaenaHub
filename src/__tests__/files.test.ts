
import request from 'supertest';
import { app } from '../server';
import fs from 'fs';

const googleDrive = require('../services/googleDrive');

jest.mock('../services/googleDrive', () => ({
  uploadFileToDrive: jest.fn().mockResolvedValue({ id: 'file-id', name: 'testfile.txt', mimeType: 'text/plain', size: 12 }),
  getFileFromDrive: jest.fn().mockResolvedValue(fs.createReadStream('src/__tests__/fixtures/testfile.txt')),
}));

describe('File Routes', () => {
  describe('POST /files/upload', () => {
    it('should upload a file and return file metadata', async () => {
      const mockFile = { id: '123', name: 'test.txt' };
      (googleDrive.uploadFileToDrive as jest.Mock).mockResolvedValue(mockFile);

      const res = await request(app)
        .post('/files/upload')
        .set('Authorization', 'Bearer test_token')
        .attach('file', Buffer.from('test content'), 'test.txt');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.file).toEqual(mockFile);
    });
  });

  describe('GET /files/:id', () => {
    it('should download a file', async () => {
      const mockStream = 'file content';
      (googleDrive.getFileFromDrive as jest.Mock).mockResolvedValue(mockStream);

      const res = await request(app)
        .get('/files/123')
        .set('Authorization', 'Bearer test_token');

      expect(res.status).toBe(200);
      expect(res.text).toBe('file content');
    });
  });
});
