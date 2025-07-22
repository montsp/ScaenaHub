
import request from 'supertest';
import { app } from '../server';
import { fetchScriptFromGoogleDocs } from '../services/googleDocs';

jest.mock('../services/googleDocs');

describe('GET /script', () => {
  it('should return script data from Google Docs', async () => {
    const mockScript = 'This is the script content.';
    (fetchScriptFromGoogleDocs as jest.Mock).mockResolvedValue(mockScript);

    const res = await request(app)
      .get('/script')
      .set('Authorization', 'Bearer test_token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.script).toBe(mockScript);
  });
});
