import { getGoogleAuth, googleConfig } from '../config/google';
import { google } from 'googleapis';

// Google Docs APIクライアント取得
const getDocsClient = async () => {
  const auth = getGoogleAuth();
  return google.docs({ version: 'v1', auth });
};

// 台本ドキュメントの本文テキストを取得
export const fetchScriptFromGoogleDocs = async () => {
  const docs = await getDocsClient();
  const documentId = googleConfig.documentsId;
  if (!documentId) throw new Error('GoogleドキュメントIDが設定されていません');
  const res = await docs.documents.get({ documentId });
  // 本文テキスト抽出
  const content = res.data.body?.content || [];
  let scriptText = '';
  for (const elem of content) {
    if (elem.paragraph && elem.paragraph.elements) {
      for (const e of elem.paragraph.elements) {
        if (e.textRun && e.textRun.content) {
          scriptText += e.textRun.content;
        }
      }
    }
  }
  return scriptText;
};

// 必要に応じて台本データのパース・整形関数も追加可能 