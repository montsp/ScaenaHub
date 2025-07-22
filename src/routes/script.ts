import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { fetchScriptFromGoogleDocs } from '../services/googleDocs';

const router = Router();

// 台本データ取得API
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const script = await fetchScriptFromGoogleDocs();
    res.json({ success: true, script });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router; 