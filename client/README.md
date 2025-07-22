# ScaenaHub Frontend

ScaenaHub（スカエナハブ）のフロントエンド - 中学部演劇プロジェクト用Webコミュニケーションアプリ

## 技術スタック

- **React.js 18** - UIライブラリ
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **React Router** - ルーティング
- **Socket.io Client** - リアルタイム通信
- **Axios** - HTTP クライアント

## プロジェクト構成

```
src/
├── components/          # 再利用可能なコンポーネント
│   ├── Layout.tsx      # メインレイアウト
│   └── LoadingSpinner.tsx
├── pages/              # ページコンポーネント
│   ├── LoginPage.tsx   # ログインページ
│   ├── RegisterPage.tsx # 登録ページ
│   └── ChatPage.tsx    # チャットページ
├── contexts/           # React Context
│   └── AuthContext.tsx # 認証状態管理
├── hooks/              # カスタムフック
│   ├── useSocket.ts    # Socket.io フック
│   ├── useApi.ts       # API呼び出しフック
│   └── useLocalStorage.ts
├── services/           # 外部サービス
│   ├── api.ts          # API クライアント
│   └── socket.ts       # Socket.io クライアント
├── types/              # TypeScript 型定義
│   └── index.ts
├── utils/              # ユーティリティ関数
│   └── index.ts
├── constants/          # 定数
│   └── index.ts
└── App.tsx             # メインアプリコンポーネント
```

## 環境設定

### 環境変数

`.env` ファイルを作成し、以下の変数を設定してください：

```env
# API Configuration
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_SOCKET_URL=http://localhost:3000

# App Configuration
REACT_APP_NAME=ScaenaHub
REACT_APP_VERSION=1.0.0
```

## 開発コマンド

```bash
# 開発サーバー起動
npm start

# プロダクションビルド
npm run build

# テスト実行
npm test

# ESLint実行
npm run lint
```

## 主要機能

### 認証システム
- JWT ベースの認証
- ログイン・登録機能
- 管理者キー検証
- 自動ログアウト

### リアルタイム通信
- Socket.io による双方向通信
- メッセージのリアルタイム配信
- タイピングインジケーター
- 自動再接続

### レスポンシブデザイン
- iPad 最適化
- タッチ操作対応
- モバイルファースト設計

## 開発ガイドライン

### コンポーネント設計
- 関数コンポーネント + Hooks を使用
- TypeScript で型安全性を確保
- Props インターフェースを明確に定義

### スタイリング
- Tailwind CSS のユーティリティクラスを使用
- カスタムコンポーネントクラスは `@layer components` で定義
- レスポンシブデザインを考慮

### 状態管理
- ローカル状態: `useState`
- グローバル状態: React Context
- サーバー状態: カスタムフック (`useApi`)

### エラーハンドリング
- API エラーの統一的な処理
- ユーザーフレンドリーなエラーメッセージ
- ローディング状態の適切な表示

## iPad 最適化

### タッチ操作
- 十分なタッチターゲットサイズ（44px以上）
- スワイプ・ピンチジェスチャー対応
- 仮想キーボード対応

### パフォーマンス
- 仮想スクロール（メッセージ一覧）
- 画像遅延読み込み
- メモリリーク対策

## セキュリティ

### 認証
- JWT トークンの安全な保存
- 自動トークン更新
- セッション管理

### 入力検証
- XSS 対策
- 入力サニタイゼーション
- ファイルアップロード制限

## 今後の実装予定

- [ ] メッセージ機能の完全実装
- [ ] ファイル共有機能
- [ ] 台本ビュー機能
- [ ] 管理者画面
- [ ] 通知システム
- [ ] オフライン対応

## トラブルシューティング

### よくある問題

1. **API接続エラー**
   - バックエンドサーバーが起動しているか確認
   - CORS設定を確認

2. **Socket.io接続エラー**
   - WebSocket接続がブロックされていないか確認
   - プロキシ設定を確認

3. **ビルドエラー**
   - 依存関係を再インストール: `npm ci`
   - TypeScript エラーを確認

## ライセンス

MIT License