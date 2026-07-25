# 開発ガイド

## 前提条件

- **Node.js 20.0.0+** - JavaScript ランタイム
- **npm 10.0.0+** - パッケージマネージャー
- **PostgreSQL 15+** - データベースサーバー
- **Ollama** - ローカル LLM 推論
- **Git** - バージョン管理

### インストール確認

```bash
node --version      # v20.0.0 以上が表示されることを確認
npm --version       # 10.0.0 以上が表示されることを確認
psql --version      # PostgreSQL 15+ が表示されることを確認
ollama --version    # バージョンが表示されることを確認
```

## 初期セットアップ

### 1. リポジトリをクローン

```bash
git clone <リポジトリURL>
cd app-language-learning
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. データベースをセットアップ

```bash
psql "postgres://postgres:postgres@localhost:5432/language_learning" -f server/migrations/001_language_learning_init.sql
```

### 4. 環境変数を設定

プロジェクトルートに `.env.local` を作成：

```env
# データベース
DATABASE_URL=postgres://postgres:postgres@localhost:5432/language_learning

# Ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:4b
OLLAMA_EMBEDDING_MODEL=embeddinggemma
WHISPER_MODEL=Xenova/whisper-tiny

# API サーバー
API_PORT=3000
API_HOST=localhost

# 環境
NODE_ENV=development
DEBUG=app:*
```

## 開発ワークフロー

### ターミナル 1: Ollama サービスを起動

```bash
ollama serve
```

ローカル Ollama API が `http://127.0.0.1:11434` で起動します。

### ターミナル 2: API サーバーを起動

```bash
npm run server:dev
```

機能：
- ファイル変更時に自動リロード (nodemon)
- デバッグログを有効化
- API は `http://localhost:3000` で利用可能

### ターミナル 3: フロントエンド開発サーバーを起動

```bash
npm run react:start
```

機能：
- Hot Module Replacement (HMR)
- ファイル変更時に自動リフレッシュ
- 開発ツール利用可
- アプリは `http://localhost:5173`（Vite デフォルト）

### 一括起動（オプション）

```bash
npm run dev:env
```

すべてのサービスを 1 つのターミナルで起動します（開発時は非推奨。出力が混在）。

## 開発ディレクトリ構成

```
src/                          # フロントエンドソースコード
├── components/              # 再利用可能な React コンポーネント
│   ├── WordCard.jsx        # 単語詳細表示
│   ├── SearchForm.jsx      # 検索インターフェース
│   └── PronunciationRecorder.jsx  # 音声録音
├── pages/                   # ページレベルコンポーネント
│   ├── HomePage.jsx        # ランディングページ
│   ├── LearningPage.jsx    # 学習インターフェース
│   └── SearchPage.jsx      # 検索結果
├── services/               # API 通信
│   ├── api.js             # API クライアント
│   ├── wordService.js     # 単語関連リクエスト
│   ├── searchService.js   # 検索リクエスト
│   └── ollamaService.js   # Ollama 統合
├── hooks/                 # カスタム React フック
│   ├── useWords.js        # 単語データ取得
│   └── usePronunciation.js # 発音ロジック
├── utils/                 # ユーティリティ関数
│   ├── audio.js          # 音声処理
│   ├── mfcc.js           # MFCC 特徴抽出
│   └── formatting.js     # フォーマット関数
├── styles/               # CSS ファイル
│   ├── index.css         # グローバルスタイル
│   ├── components.css    # コンポーネントスタイル
│   └── pages.css         # ページスタイル
├── App.jsx              # ルートコンポーネント
└── main.jsx            # エントリーポイント

server/                         # バックエンドソースコード
├── routes/                     # API エンドポイント定義
│   ├── words.js               # /api/words エンドポイント
│   ├── search.js              # /api/search エンドポイント
│   ├── pronunciation.js       # /api/pronunciation エンドポイント
│   └── index.js               # ルート集約
├── controllers/                # ビジネスロジック
│   ├── wordController.js      # 単語操作
│   ├── searchController.js    # 検索操作
│   └── pronunciationController.js # 発音分析
├── services/                   # 再利用可能なサービス
│   ├── ollamaService.js      # Ollama API 呼び出し
│   ├── embeddingService.js   # ベクトル操作
│   ├── transcriptionService.js # Whisper 統合
│   └── pronunciationAnalyzer.js # 発音分析
├── middleware/                 # Express ミドルウェア
│   ├── errorHandler.js       # エラーハンドリング
│   ├── logger.js             # リクエストログ
│   └── auth.js               # 認証
├── db/                         # データベースレイヤー
│   ├── connection.js         # PostgreSQL 接続
│   ├── migrations/           # マイグレーションスクリプト
│   └── queries.js            # 共通クエリ
├── config/                     # 設定
│   └── index.js              # アプリ設定
└── server.js                  # Express エントリーポイント
```

## よくある開発タスク

### 新しい API エンドポイントを追加

1. **コントローラー作成** `server/controllers/` 内：
```javascript
// server/controllers/newController.js
export async function getNewData(req, res) {
  try {
    const data = await getDataFromService();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

2. **ルート作成** `server/routes/` 内：
```javascript
// server/routes/newRoutes.js
import { Router } from 'express';
import { getNewData } from '../controllers/newController.js';

const router = Router();
router.get('/new-data', getNewData);

export default router;
```

3. **ルートを登録** `server/routes/index.js` 内：
```javascript
import newRoutes from './newRoutes.js';
// ...
app.use('/api', newRoutes);
```

### 新しい React コンポーネントを追加

1. **コンポーネント作成** `src/components/` 内：
```javascript
// src/components/NewComponent.jsx
import React, { useState } from 'react';
import './newComponent.css';

export function NewComponent() {
  const [state, setState] = useState(null);
  
  return (
    <div className="new-component">
      {/* コンポーネント JSX */}
    </div>
  );
}
```

2. **スタイル作成** `src/styles/` 内：
```css
/* src/styles/newComponent.css */
.new-component {
  /* スタイル */
}
```

3. **ページ/コンポーネントで使用**：
```javascript
import { NewComponent } from '../components/NewComponent';

export function MyPage() {
  return <NewComponent />;
}
```

### 変更をテスト

```bash
# テストを実行
npm run server:test
npm run react:test

# リント実行
npm run lint

# ビルド確認
npm run react:build
```

## デバッグ

### フロントエンドデバッグ

1. **ブラウザ開発ツール**:
   - `http://localhost:5173` を開く
   - `F12` で開発者ツールを開く
   - Console、Network、Sources タブを活用

2. **React DevTools 拡張**:
   - ブラウザに React DevTools をインストール
   - React コンポーネント ツリーを検査
   - コンポーネント状態を表示・変更

3. **コンソールログ**:
```javascript
console.log('デバッグ情報:', variable);
console.error('エラー:', error);
```

### バックエンドデバッグ

1. **サーバーログ**:
   - ターミナルにデバッグログが出力される
   - `DEBUG=app:* npm run server:dev` で詳細ログを表示

2. **VS Code デバッガー**:
```javascript
// debugger ステートメントを追加
debugger;

// デバッガーで実行
node --inspect-brk server/server.js
```

3. **リクエストログ**:
```javascript
// すべてのリクエストが自動的にログされます
// ターミナル出力でリクエスト詳細を確認
```

### データベースデバッグ

```bash
# データベースに接続
psql "postgres://postgres:postgres@localhost:5432/language_learning"

# よくあるクエリ
SELECT * FROM words LIMIT 10;
SELECT * FROM users;
SELECT * FROM word_embeddings;
```

## パフォーマンス最適化

### フロントエンドパフォーマンス

1. **React 最適化**:
   - React.memo でコンポーネントをメモ化
   - useCallback でイベントハンドラーをメモ化
   - React.lazy() で遅延ロード

2. **バンドルサイズ**:
```bash
npm run react:build

# 依存関係を分析
npm install -g webpack-bundle-analyzer
```

3. **遅延ロード**:
```javascript
// コンポーネントをオンデマンド読み込み
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
```

### バックエンドパフォーマンス

1. **データベースクエリ最適化**:
   - よく検索されるカラムにインデックスを追加
   - EXPLAIN でクエリを分析
   - クエリ結果をキャッシュ

2. **API レスポンスキャッシング**:
```javascript
// キャッシュミドルウェア
const cache = new Map();

function getCached(key, getter, ttl = 60000) {
  if (cache.has(key)) return cache.get(key);
  const value = getter();
  cache.set(key, value);
  setTimeout(() => cache.delete(key), ttl);
  return value;
}
```

3. **モデル推論最適化**:
   - 可能な限りリクエストをバッチ処理
   - 高速操作には小さいモデルを使用
   - 埋め込みをキャッシュ

## メモリ使用量監視

### Ollama メモリ監視
```bash
# Ollama プロセス確認
ps aux | grep ollama
# または Windows の場合
tasklist | findstr ollama

# システムツールで監視
# Windows：タスクマネージャー
# macOS：アクティビティモニター
# Linux：htop
```

### メモリ使用量を減らす

1. **より小さいモデルを使用**:
   - Gemma3 4B をより小さい代替モデルに変更
   - 量子化版を使用

2. **キャッシュをクリア**:
```bash
# Ollama を再起動してモデルキャッシュをクリア
ollama serve  # 別のモデルで再起動
```

3. **フロントエンドメモリ監視**:
   - React DevTools Profiler を使用
   - ブラウザ DevTools でメモリ使用量を確認

## コード品質

### リント

```bash
npm run lint          # ESLint を実行
npm run lint:fix      # 自動修正
```

### フォーマット

```bash
npm run format        # Prettier でフォーマット
npm run format:check  # フォーマット確認
```

### テスト

```bash
npm run server:test   # バックエンドテスト
npm run react:test    # フロントエンドテスト
npm run test:coverage # カバレッジ生成
```

## 推奨 IDE 設定

### VS Code 拡張

- **ES7+ React/Redux/React-Native snippets** - dsznajder.es7-react-js-snippets
- **Prettier - Code formatter** - esbenp.prettier-vscode
- **ESLint** - dbaeumer.vscode-eslint
- **PostgreSQL** - ckolkman.vscode-postgres
- **REST Client** - humao.rest-client
- **Thunder Client** - rangav.vscode-thunder-client

### VS Code 設定

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## 開発問題トラブルシューティング

### ポートが既に使用中

```bash
# Windows/PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :3000
kill -9 <PID>
```

### モジュールが見つからない

```bash
# 依存関係をクリアして再インストール
rm -rf node_modules package-lock.json
npm install
```

### データベース接続エラー

```bash
# PostgreSQL が起動しているか確認
psql --version
psql "postgres://postgres:postgres@localhost:5432/language_learning"
```

### Ollama が利用不可

```bash
# Ollama サービスを起動
ollama serve

# 接続確認
curl http://127.0.0.1:11434/api/tags
```

## 学習リソース

### フロントエンド
- [React ドキュメント](https://ja.react.dev)
- [Vite ガイド](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)

### バックエンド
- [Express.js ガイド](https://expressjs.com/ja/)
- [PostgreSQL チュートリアル](https://www.postgresql.org/docs)
- [pgvector 拡張](https://github.com/pgvector/pgvector)

### AI/ML
- [Ollama ドキュメント](https://ollama.com)
- [Gemma モデル](https://huggingface.co/google/gemma-7b)
- [Whisper ドキュメント](https://github.com/openai/whisper)

## サポート取得

問題が発生した場合：
1. [トラブルシューティング](TROUBLESHOOTING_JP.md)を確認
2. [アーキテクチャガイド](ARCHITECTURE_JP.md)を確認
3. 以下の情報を含めて Issue を作成：
   - エラーメッセージとスタックトレース
   - 再現手順
   - システム情報
   - スクリーンショット（該当する場合）
