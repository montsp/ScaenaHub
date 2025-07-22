import { getDriveClient, googleConfig } from '../config/google';
import { Readable } from 'stream';

export const uploadFileToDrive = async (file: Express.Multer.File) => {
  const drive = await getDriveClient();
  if (file.size > googleConfig.maxFileSize) {
    throw new Error('ファイルサイズが大きすぎます');
  }
  if (!googleConfig.allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('許可されていないファイル形式です');
  }
  const res = await drive.files.create({
    requestBody: {
      name: file.originalname,
      parents: [googleConfig.driveFolder]
    },
    media: {
      mimeType: file.mimetype,
      body: Readable.from(file.buffer)
    }
  });
  return res.data;
};

export const getFileFromDrive = async (fileId: string) => {
  const drive = await getDriveClient();
  const res = await drive.files.get({
    fileId,
    alt: 'media'
  }, { responseType: 'stream' });
  return res.data;
}; 