# Ollama/Gemmaを使用した語学学習アプリ
[English version here](README.md)

# Language Learning App with Ollama/Gemma

ローカル LLM を使用したプライベートな語学学習アプリ。Ollama + Gemma で完全ローカル処理、クラウド無料。

## 機能

- **Fast Pipeline**: 単語から複数言語の意味・ニュアンス・例文を自動生成
- **Semantic Search**: ベクトル埋め込みによる意味ベース検索
- **Reasoning Answer**: 言語学習コンテキストでの質問応答
- **Local Inference**: クラウド API 不要、完全オフライン
- **Pronunciation Analysis**: 録音、参照音声とのローカル MFCC 比較、Whisper 文字起こし、Gemma による改善提案
- **Multi-Language Support**: 複数言語対応（日本語・英語・ドイツ語を含む、拡張可能）

## セットアップ（最短 1 ステップ）

### 前提条件
- Node.js 20+、npm 10+
- PostgreSQL 15+（pgvector 拡張有効化）

### インストール & セットアップ

```bash
# 初回のみ：一括セットアップ（Ollama + 依存関係 + DB）
npm run setup
```

このコマンドで以下が自動実行されます：
1. ✅ Ollama インストール確認
2. ✅ npm 依存関係インストール
3. ✅ データベースセットアップ
4. ✅ Ollama モデルダウンロード (gemma3:4b, embeddinggemma)

### 起動

**最もシンプル（推奨）:**
```bash
npm run dev:env
```

このコマンドで以下が自動実行されます：
- ✅ Ollama サーバー起動（必要に応じて）
- ✅ API サーバー起動
- ✅ フロント開発サーバー起動

**個別起動:**
```bash
# ターミナル 1：API サーバー
npm run dev:server

# ターミナル 2：フロント開発サーバー
npm run dev:frontend
```

**その他:**
```bash
npm run dev              # Electron アプリ
npm run react:build      # フロント本番ビルド
npm run server:test      # テスト実行
```

## 環境変数

自動設定されます（カスタマイズ時のみ設定が必要）：

| 変数 | 説明 | デフォルト |
|-----|------|---------|
| `DATABASE_URL` | PostgreSQL 接続 | `postgres://postgres:postgres@localhost:5432/language_learning` |
| `OLLAMA_BASE_URL` | Ollama API URL | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | 生成モデル | `gemma3:4b` |
| `OLLAMA_EMBEDDING_MODEL` | 埋め込みモデル | `embeddinggemma` |
| `WHISPER_MODEL` | ローカル Whisper 文字起こしモデル | `Xenova/whisper-tiny` |

## npm スクリプト

```bash
# セットアップ（初回のみ）
npm run setup              # 完全セットアップ（Ollama + 依存関係 + DB + モデル）
npm run setup:ollama       # Ollama + モデルのみセットアップ

# 開発
npm run dev:env           # 開発環境起動（Ollama + サーバー + フロント）
npm run dev:server        # API サーバーのみ
npm run dev:frontend      # フロント開発サーバーのみ
npm run dev               # Electron アプリ開発

# ビルド
npm run react:build       # フロント本番ビルド
npm run dist:win          # Windows ビルド

# テスト
npm run server:test       # API テスト実行
```

## ドキュメント

### 英語版ドキュメント
- [README](./README.md) - 英語による概要説明
- [SETUP](doc/SETUP.md) - 詳細セットアップガイド
- [TROUBLESHOOTING](doc/TROUBLESHOOTING.md) - よくある問題と解決法
- [ARCHITECTURE](doc/ARCHITECTURE.md) - システム設計とプロジェクト構成
- [DEVELOPMENT](doc/DEVELOPMENT.md) - 開発ガイドとヒント
- [DEPLOYMENT](doc/DEPLOYMENT.md) - ビルドとデプロイメントガイド

### 日本語ドキュメント
- [日本語版 README](./README_JP.md) - 日本語による概要説明
- [セットアップガイド](doc_jp/SETUP_JP.md) - 詳細セットアップガイド
- [よくある問題と解決法](doc_jp/TROUBLESHOOTING_JP.md) - よくある問題と解決法
- [システム設計](doc_jp/ARCHITECTURE_JP.md) - システム設計
- [開発ガイド](doc_jp/DEVELOPMENT_JP.md) - 開発ガイド
- [ビルド・デプロイメント](doc_jp/DEPLOYMENT_JP.md) - ビルド・デプロイメント


## よくある問題

**Ollama に接続できない**
- `ollama serve` で Ollama が起動しているか確認
- `ollama list` でモデル確認
- `OLLAMA_BASE_URL` がデフォルト値か確認

**pgvector 拡張がない**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**初回の文字起こしで Whisper をダウンロードする**
- 正常な動作です。一度取得したモデルはローカルにキャッシュされます。
- 初回の文字起こしが完了するまで API サーバーを起動したままにしてください。

## Models（使用モデル一覧）

このアプリケーションは以下のオープンソース LLM を使用しています。

| モデル | 用途 | ダウンロードサイズ |
|--------|------|-----------------|
| **Gemma 3 4B Instruct** | テキスト生成・言語学習応答 | ～8GB |
| **EmbeddingGemma** | 意味ベース検索用ベクトル埋め込み | ～2GB |
| **Whisper Tiny** | 複数言語対応の音声認識（日本語・英語・ドイツ語を含む） | ～390MB |

すべてローカル環境でダウンロード・実行されます。インターネット接続が必要なのは初回モデルダウンロード時のみです。

## Security / Privacy（ローカルファーストの強み）

- ✅ **完全ローカル処理**: すべての推論、音声処理、検索がユーザーのマシン上で実行
- ✅ **クラウド送信なし**: 音声・テキスト・学習履歴はクラウドに送信されません
- ✅ **APIキー不要**: Google、OpenAI、その他クラウドサービスのキー設定が不要
- ✅ **ネット接続不要**: セットアップ後はオフライン動作可能（ただし初回モデルダウンロード時は必要）
- ✅ **データは OS ユーザーディレクトリに保存**: PostgreSQL データベースとモデルキャッシュはローカルディスクのみ
- ✅ **ユーザー制御**: すべてのデータ削除・カスタマイズ・アンインストールがユーザーの自由

プライバシーとセキュリティを最優先にした設計です。

## Benchmark（軽量モデルの推論速度）

一般的な環境での推論速度を示します（環境に応じて変動）。

| 処理 | 速度 | 備考 |
|-----|------|-----|
| **Gemma 3 4B（生成）** | 30～60 tok/s | CPU 実行、GPU では 2～3 倍高速化 |
| **Whisper Tiny（文字起こし）** | 1～2 秒 | 短い音声（5～10秒）の書き起こし時間 |
| **EmbeddingGemma（埋め込み）** | ～100ms | 単語・文章の意味表現化 |

軽量モデルを採用しており、標準的な PC（CPU のみ）でも快適に動作します。

## 今後の課題（Roadmap）

計画中の機能強化：

- [ ] 発音スコアの可視化（レーダーチャート）
- [ ] 言語対応の拡張（スペイン語、フランス語、中国語、韓国語など）
- [ ] 文法チェックの強化
- [ ] 学習履歴の可視化（進捗グラフ、学習統計）
- [ ] モバイル版（Capacitor による iOS/Android ビルド）

## 無料・オープンソース

- Ollama: 完全無料、オープンソース
- Gemma: Google のオープンソース、完全無料
- すべてローカル実行（クラウド課金なし）

 ## ライセンス

- 個人利用および商用利用は無料です。
- 商用利用の場合は、必ず筆者および開発者に連絡してください。

詳細は [LICENSE](LICENSE) ファイルをご覧ください。