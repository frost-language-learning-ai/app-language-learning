# システムアーキテクチャ

## プロジェクト概要

Language Learning App は以下を組み合わせた フルスタックアプリケーション：
- **フロントエンド**: React シングルページアプリケーション
- **バックエンド**: Express.js REST API
- **データベース**: PostgreSQL（pgvector 拡張付き）
- **AI モデル**: Ollama（Gemma3、Embedding-Gemma、Whisper）

すべての処理はローカルで実行され、クラウド依存性はありません。

## システムアーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                    ユーザーデバイス                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web アプリ  │  │Android アプリ │  │ iOS アプリ   │      │
│  │(React/Vite) │  │(Capacitor)   │  │(Capacitor)   │      │
│  │              │  │              │  │              │      │
│  │ Electron     │                                         │
│  │ (デスクトップ) │                                         │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┬─────────────────────────────────┘
                             │
                    HTTP/REST API
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                  Express.js サーバー                          │
│  (API ルート、認証、ビジネスロジック)                          │
└────────────────────────────┬─────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │     Ollama       │  │   ファイル      │
│   データベース   │  │  (ローカル LLM)   │  │   システム       │
│  + pgvector     │  │                  │  │                 │
│                 │  │ - Gemma3 4B      │  │ - モデルキャッシュ│
│ 単語データ      │  │ - 埋め込み       │  │ - 音声ファイル   │
│ ユーザー進捗    │  │ - Whisper        │  │                 │
│ 埋め込みベクトル│  │                  │  │                 │
└─────────────────┘  └──────────────────┘  └─────────────────┘
```

## データフロー

### 1. 単語定義フロー
```
ユーザー入力（単語）
    ↓
React フロントエンド
    ↓
Express API /api/word/define
    ↓
Ollama (Gemma3) → 意味・ニュアンス・例文を生成
    ↓
PostgreSQL → 単語データを保存
    ↓
フロントエンドに応答
    ↓
結果を表示
```

### 2. セマンティック検索フロー
```
ユーザークエリ
    ↓
React フロントエンド
    ↓
Express API /api/search
    ↓
Ollama (Embedding-Gemma) → クエリ埋め込みを生成
    ↓
PostgreSQL + pgvector → 類似埋め込みを検索
    ↓
マッチングした単語を取得
    ↓
フロントエンドに応答
    ↓
検索結果を表示
```

### 3. 発音分析フロー
```
ユーザーが音声を録音
    ↓
React フロントエンド (WebRTC/MediaRecorder)
    ↓
Express API /api/pronunciation/analyze
    ↓
Ollama (Whisper) → 音声を文字起こし
    ↓
信号処理 (MFCC) → 参照音声と比較
    ↓
Ollama (Gemma3) → フィードバック生成
    ↓
フロントエンドに応答
    ↓
フィードバックを表示
```

## ディレクトリ構成

```
app-language-learning/
├── src/                              # フロントエンド React アプリケーション
│   ├── components/                  # React コンポーネント
│   ├── pages/                       # ページコンポーネント
│   ├── hooks/                       # カスタム React フック
│   ├── services/                    # API サービスレイヤー
│   ├── styles/                      # CSS/スタイル
│   ├── utils/                       # ユーティリティ関数
│   └── App.jsx                      # ルートコンポーネント
│
├── server/                          # バックエンド Express アプリケーション
│   ├── routes/                      # API ルート定義
│   │   ├── words.js                # 単語エンドポイント
│   │   ├── search.js               # 検索エンドポイント
│   │   ├── pronunciation.js        # 発音エンドポイント
│   │   └── auth.js                 # 認証エンドポイント
│   ├── controllers/                # ビジネスロジック
│   ├── services/                   # サービスレイヤー (Ollama、DB)
│   ├── middleware/                 # Express ミドルウェア
│   ├── migrations/                 # データベーススクリプト
│   ├── db.js                       # DB 接続
│   ├── ollama.js                   # Ollama 統合
│   └── server.js                   # Express エントリーポイント
│
├── json/                           # 設定データ
│   ├── categories.json             # 学習カテゴリ
│   ├── languages.json              # 対応言語
│   └── currency.json               # 通貨コード
│
├── scripts/                        # 自動化スクリプト
│   ├── setup-complete.js           # 完全セットアップ
│   ├── dev-env.js                  # 開発環境マネージャー
│   ├── generate-icons.js           # アイコン生成
│   └── kill-running.js             # プロセス終了
│
├── android/                        # Capacitor Android ビルド
│   ├── app/                        # Android アプリコード
│   └── build.gradle                # Android ビルド設定
│
├── Desktop/electron/               # Electron デスクトップアプリ
│   ├── main.js                     # Electron メインプロセス
│   └── preload.js                  # プリロードスクリプト
│
├── docs/                           # ドキュメント（英語版）
│   ├── SETUP.md
│   ├── TROUBLESHOOTING.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   └── DEPLOYMENT.md
│
├── docs_jp/                        # ドキュメント（日本語版）
│   ├── SETUP_JP.md
│   ├── TROUBLESHOOTING_JP.md
│   ├── ARCHITECTURE_JP.md
│   ├── DEVELOPMENT_JP.md
│   ├── DEPLOYMENT_JP.md
│   └── README_JP.md
│
├── capacitor.config.ts             # Capacitor iOS/Android 設定
├── vite.config.js                  # Vite バンドラー設定（フロント）
├── jest.config.cjs                 # Jest テストランナー設定
├── babel.config.cjs                # Babel トランスパイラー設定
├── package.json                    # npm 依存関係・スクリプト
├── README.md                        # メインドキュメント（英語）
└── README_JP.md                    # メインドキュメント（日本語）
```

## 技術スタック

### フロントエンド
- **React 18+** - UI フレームワーク
- **Vite** - ビルドツール（高速開発）
- **Capacitor** - クロスプラットフォーム モバイル（iOS/Android）
- **Electron** - デスクトップアプリフレームワーク
- **CSS3** - スタイリング

### バックエンド
- **Node.js 20+** - ランタイム
- **Express.js** - Web フレームワーク
- **PostgreSQL 15+** - データベース
- **pgvector** - ベクトル類似度検索

### AI & ML
- **Ollama** - ローカル LLM 推論エンジン
- **Gemma3 4B** - テキスト生成モデル
- **embedding-gemma** - 埋め込みモデル（セマンティック検索用）
- **Whisper (Xenova)** - 音声文字起こし

### 開発ツール
- **npm** - パッケージマネージャー
- **Jest** - テストフレームワーク
- **Babel** - JavaScript トランスパイラー

## コンポーネント間通信

### フロントエンド ↔ バックエンド

すべての通信は REST API で JSON を使用：

```
フロントエンド (React)
    ↓
fetch() または axios
    ↓
Express サーバー (localhost:3000)
    ↓
ルートハンドラー
    ↓
サービス (Ollama、PostgreSQL)
    ↓
JSON レスポンス
    ↓
React 状態更新
    ↓
UI 再レンダリング
```

### バックエンド ↔ Ollama

HTTP REST API で通信：

```
Express サーバー
    ↓
HTTP リクエスト localhost:11434
    ↓
Ollama サービス
    ↓
モデル推論
    ↓
JSON レスポンス
    ↓
結果処理
```

### バックエンド ↔ PostgreSQL

node-postgres (pg) ドライバー使用：

```
Express サーバー
    ↓
SQL クエリ (pg ドライバー)
    ↓
PostgreSQL
    ↓
クエリ結果
    ↓
データ処理
```

## パフォーマンス考慮事項

### モデル推論時間
- 初回 API 呼び出し：～3～5 秒（モデル読み込み）
- テキスト生成：～1～3 秒
- 埋め込み生成：～0.5～2 秒
- 文字起こし：～2～10 秒（音声長に依存）

### メモリ使用量
- Ollama + Gemma3 4B：～4～6GB RAM
- PostgreSQL：～500MB～1GB
- フロントエンド (React)：～50～100MB
- 合計：8GB 推奨

### ストレージ要件
- Gemma3 4B モデル：～2～3GB
- embedding-gemma：～500MB
- Whisper モデル：～150MB
- PostgreSQL データ：可変（通常 100MB～1GB）
- 合計：～5～6GB 最小

## セキュリティ考慮事項

### 現在の実装
- ローカル展開（デフォルトでインターネット非公開）
- ローカル使用時は認証不要
- すべてのデータをローカルディスクに保存

### 本番展開向け
- 認証実装（JWT、OAuth2）
- HTTPS/TLS 暗号化
- レート制限
- ユーザー入力検証
- SQL インジェクション対策（パラメータ化クエリ）
- Ollama を隔離環境で実行
- 適切なエラーハンドリング（内部情報を公開しない）

## 関連ドキュメント

- [トラブルシューティング](TROUBLESHOOTING_JP.md) - よくある問題と解決法
- [開発ガイド](DEVELOPMENT_JP.md) - 開発環境セットアップとワークフロー
- [デプロイメント](DEPLOYMENT_JP.md) - ビルドとデプロイ方法
