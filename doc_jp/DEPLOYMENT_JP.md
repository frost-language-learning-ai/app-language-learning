# デプロイメントガイド

## 概要

Language Learning App は複数のプラットフォームにデプロイできます：
- **Windows** - デスクトップ実行ファイル（.exe）
- **macOS** - DMG インストーラー または App Bundle
- **Linux** - 実行ファイル または Docker コンテナ
- **Web** - スタティック HTML + Node.js バックエンド
- **Android** - APK パッケージ
- **iOS** - IPA パッケージ

すべてのデプロイメントは同一のコードベースを使用し、プラットフォーム固有のビルドツールで対応します。

## すべてのビルド前提条件

```bash
# 依存関係をインストール
npm install

# フロントエンドをビルド
npm run react:build

# データベースセットアップ（すべてのデプロイに必要）
psql "postgres://postgres:postgres@localhost:5432/language_learning" -f server/migrations/001_language_learning_init.sql
```

## 環境設定

本番環境用に `.env.production` を作成：

```env
# データベース（本番環境では管理型データベースを使用）
DATABASE_URL=postgres://user:password@db-host:5432/language_learning

# Ollama（デプロイ環境からアクセス可能である必要あり）
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b
OLLAMA_EMBEDDING_MODEL=embeddinggemma

# API サーバー
API_PORT=3000
API_HOST=0.0.0.0
NODE_ENV=production

# セキュリティ
SECURE_COOKIES=true
HTTPS_ONLY=true
```

## Windows デスクトップビルド

### 必須要件
- Windows 10/11
- Node.js 20+
- Electron Builder
- Visual Studio Build Tools（一部の依存関係用）

### ビルドステップ

1. **ビルド準備**:
```bash
npm run react:build
npm run server:build
```

2. **Windows インストーラーを作成**:
```bash
npm run dist:win
```

3. **出力ファイル**:
```
release/
├── LanguageLearning-x.x.x.exe         # インストーラー
├── LanguageLearning-x.x.x-ia32.exe    # 32 ビット版
└── LanguageLearning-x.x.x.exe.blockmap
```

### 配布

1. **直接ダウンロード**:
   - `.exe` を GitHub Releases にアップロード
   - ユーザーがダウンロードしてインストーラーを実行

2. **Windows Store**:
   - MSIX でパッケージ化
   - Microsoft Store に提出（アカウント必要）

3. **自動更新**:
   - `main.js` で electron-updater を設定
   - GitHub/S3 で releases をホスト

## macOS ビルド

### 必須要件
- macOS 11+
- Node.js 20+
- Xcode コマンドラインツール
- Apple Developer アカウント（コード署名用）

### ビルドステップ

```bash
npm run dist:mac
```

### 出力ファイル
```
release/
├── LanguageLearning-x.x.x.dmg        # DMG インストーラー
├── LanguageLearning-x.x.x.app        # App Bundle
└── LanguageLearning-x.x.x-arm64.dmg  # Apple Silicon 版
```

## Linux ビルド

### AppImage フォーマット

```bash
npm run dist:linux
```

ほとんどの Linux ディストリビューションで動作するポータブル AppImage を作成します。

## Android ビルド

### 必須要件
- Android Studio または Android SDK
- Node.js 20+
- Capacitor CLI: `npm install -g @capacitor/cli`

### ビルドステップ

1. **Web アセットをビルド**:
```bash
npm run react:build
```

2. **Android に同期**:
```bash
npx cap sync android
```

3. **APK をビルド**:
```bash
# デバッグ APK
npm run build:android

# リリース APK
npm run build:android:release
```

4. **出力ファイル**:
```
android/app/build/outputs/apk/release/app-release.apk
```

### 配布

1. **直接 APK**:
   - ユーザーが `.apk` ファイルをダウンロード
   - ファイルマネージャーまたは `adb install` でインストール

2. **Google Play Store**:
   - デベロッパーアカウント作成（$25 一回）
   - リリース APK をビルド
   - Play Console で提出

### リリース APK に署名

```bash
# キーストア生成
keytool -genkey -v -keystore my-release-key.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias

# APK に署名
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore my-release-key.keystore \
  android/app/build/outputs/apk/release/app-release.apk my-key-alias

# 検証
jarsigner -verify -verbose -certs android/app/build/outputs/apk/release/app-release.apk
```

## iOS ビルド

### 必須要件
- macOS 11+（iOS ビルドは macOS でのみ可能）
- Xcode 13+
- iOS デプロイメント ターゲット 12+
- Apple Developer アカウント

### ビルドステップ

1. **Web アセットをビルド**:
```bash
npm run react:build
```

2. **iOS プラットフォーム追加**:
```bash
npx cap add ios
```

3. **iOS に同期**:
```bash
npx cap sync ios
```

4. **Xcode で開く**:
```bash
npx cap open ios
```

5. **Xcode でビルド**:
   - ターゲットデバイスまたはシミュレーターを選択
   - Product → Build: `Cmd + B`
   - Product → Run: `Cmd + R`

### 配布

1. **TestFlight**（ベータテスト）:
   - デバッグプロビジョニングプロファイルでビルド
   - App Store Connect 経由で TestFlight にアップロード

2. **App Store**:
   - リリース型でビルド
   - App Store Connect で提出

## Web デプロイメント

### バックエンドサーバー

1. **サーバーを準備**:
```bash
npm run server:build
```

2. **サーバーにインストール**:
```bash
# ファイルをサーバーにコピー
scp -r . user@server:/path/to/app

# サーバーでインストール
npm install --production
```

3. **環境設定**:
```bash
# サーバーで .env ファイルを作成
DATABASE_URL=postgres://...
OLLAMA_BASE_URL=...
NODE_ENV=production
```

4. **プロセスマネージャーで実行**:
```bash
# PM2 を使用
npm install -g pm2
pm2 start server/server.js --name "language-learning"
pm2 save
pm2 startup
```

### フロントエンドホスティング

1. **スタティックファイルをビルド**:
```bash
npm run react:build
```

2. **CDN/ホスティングにアップロード**:
   - GitHub Pages
   - Netlify
   - Vercel
   - AWS S3 + CloudFront
   - 自分のサーバー

3. **API エンドポイント設定**:
```javascript
// src/services/api.js
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';
```

### Docker デプロイメント

```dockerfile
# Dockerfile
FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run react:build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "server:start"]
```

ビルドして実行：
```bash
docker build -t language-learning .
docker run -p 3000:3000 --env-file .env language-learning
```

## データベースデプロイメント

### PostgreSQL ホスティングオプション

1. **自己管理**:
   - AWS EC2
   - DigitalOcean Droplet
   - Linode
   - 自分のサーバー

2. **管理型サービス**:
   - AWS RDS
   - Google Cloud SQL
   - Azure Database
   - Heroku Postgres
   - DigitalOcean 管理型データベース

### pgvector 拡張をセットアップ

```sql
-- 管理型サービスで
CREATE EXTENSION IF NOT EXISTS vector;

-- 初期テーブルを作成
CREATE TABLE words (
  id SERIAL PRIMARY KEY,
  word VARCHAR(255) NOT NULL,
  language VARCHAR(10),
  definition TEXT,
  examples TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE word_embeddings (
  word_id INTEGER REFERENCES words(id),
  embedding vector(1536)
);

CREATE INDEX ON word_embeddings USING ivfflat (embedding vector_cosine_ops);
```

## Ollama デプロイメント

### ローカルマシン
- Ollama は同じマシン上で実行するか、ネットワークアクセス可能である必要あり
- デフォルト：`http://localhost:11434`

### リモートサーバー
```bash
# サーバーで Ollama を起動
ollama serve --host 0.0.0.0:11434

# クライアント設定
OLLAMA_BASE_URL=http://server-ip:11434
```

### Docker デプロイメント
```bash
docker run -d -p 11434:11434 ollama/ollama
```

## パフォーマンス最適化

### フロントエンド最適化
```bash
npm run react:build

# バンドルサイズ分析
npm install -g webpack-bundle-analyzer
```

### バックエンド最適化
```bash
# 本番用データベースインデックスを作成
psql $DATABASE_URL -c "CREATE INDEX idx_word_embedding ON word_embeddings USING ivfflat (embedding vector_cosine_ops);"
```

### キャッシング戦略
- よくアクセスされる単語をキャッシュ
- Redis でセッションキャッシング
- フロントエンドアセット用 CDN

## 監視とログ

### 本番ログ

```javascript
// server/middleware/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### エラートラッキング

```javascript
// Sentry 統合
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

### ヘルスチェック

```bash
# API ヘルスチェック
curl http://localhost:3000/api/health

# データベースヘルスチェック
psql $DATABASE_URL -c "SELECT 1;"

# Ollama ヘルスチェック
curl http://localhost:11434/api/tags
```

## セキュリティチェックリスト

- [ ] 環境変数が安全に設定されている
- [ ] データベース認証情報がバージョン管理に含まれていない
- [ ] 本番環境で HTTPS/TLS が有効
- [ ] API レート制限が実装されている
- [ ] すべてのエンドポイントで入力検証
- [ ] 認証トークンが安全に保存されている
- [ ] CORS が適切に設定されている
- [ ] データベースバックアップが自動化されている
- [ ] ログが監視・保持されている
- [ ] 依存関係が最新に保たれている

## バックアップ戦略

### データベースバックアップ

```bash
# 日次バックアップ
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# cron で自動化
0 2 * * * pg_dump $DATABASE_URL > /backups/backup-$(date +\%Y\%m\%d).sql
```

### アプリケーションファイル

```bash
# 重要ファイルをバックアップ
tar -czf app-backup-$(date +%Y%m%d).tar.gz \
  server/migrations/ \
  json/ \
  package.json
```

## ロールバック手順

```bash
# 現在のバージョンを停止
pm2 stop language-learning

# 前のバージョンに戻す
git revert <commit-hash>
npm install
npm run server:build

# データベースを復元
psql $DATABASE_URL < backup-YYYYMMDD.sql

# 再起動
pm2 start language-learning
```

## 関連ドキュメント

- [トラブルシューティング](TROUBLESHOOTING_JP.md) - よくある問題と解決法
- [開発ガイド](DEVELOPMENT_JP.md) - 開発環境セットアップ
- [アーキテクチャガイド](ARCHITECTURE_JP.md) - システム設計

## サポートリソース

- [Electron Builder ドキュメント](https://www.electron.build)
- [Capacitor ドキュメント](https://capacitorjs.com)
- [Express.js パフォーマンス](https://expressjs.com/en/advanced/best-practice-performance.html)
- [PostgreSQL パフォーマンス](https://www.postgresql.org/docs/current/performance-tips.html)
