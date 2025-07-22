import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadFileToDrive, getFileFromDrive } from '../services/googleDrive';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const upload = multer();

// ファイルアップロード
router.post('/upload', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'ファイルがありません' });
    }
    const file = await uploadFileToDrive(req.file);
    return res.json({ success: true, file });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ファイルダウンロード
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stream = await getFileFromDrive(req.params.id);
    return stream.pipe(res);
  } catch (error: any) {
    return res.status(404).json({ success: false, error: 'ファイルが見つかりません' });
  }
});

export default router; 