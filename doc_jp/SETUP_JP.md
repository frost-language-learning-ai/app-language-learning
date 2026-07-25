# 詳細セットアップガイド

このガイドでは、Language Learning App を任意のプラットフォームにセットアップする手順を説明します。

## システム要件

### 最小スペック
- OS: Windows 10、macOS 10.15、Ubuntu 18.04 以降
- CPU: デュアルコアプロセッサ
- RAM: 8GB（Ollama + アプリ）
- ディスク: 10GB 空き容量（モデル含む）
- ネット: 初期セットアップとモデルダウンロード用

### 推奨スペック
- OS: Windows 11、macOS 12+、Ubuntu 22.04+
- CPU: クアッドコアプロセッサ
- RAM: 16GB 以上
- ディスク: 20GB SSD
- GPU: NVIDIA/AMD/Intel（推論高速化用、オプション）

## ステップ 1: 前提条件のインストール

### Windows

#### 1.1 Node.js のインストール

1. [nodejs.org](https://nodejs.org) にアクセス
2. LTS バージョン（20.x 以降）をダウンロード
3. インストーラーを実行し、デフォルト設定で進める
4. インストール確認：
```powershell
node --version    # v20.x.x 以降が表示されることを確認
npm --version     # 10.x.x 以降が表示されることを確認
```

#### 1.2 PostgreSQL のインストール

1. [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) にアクセス
2. PostgreSQL 15+ をダウンロード
3. インストーラーを実行：
   - インストールディレクトリを選択
   - スーパーユーザーパスワード設定（例：postgres）
   - ポート: 5432（デフォルト）
   - ロケール: システムデフォルト

4. インストール確認：
```powershell
psql --version
psql -U postgres -c "SELECT 1"  # (1) が返ってくれば OK
```

#### 1.3 Git のインストール

1. [git-scm.com](https://git-scm.com) にアクセス
2. Windows 版をダウンロード
3. インストーラーをデフォルト設定で実行

### macOS

```bash
# Homebrew をインストール（未インストールの場合）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js をインストール
brew install node

# PostgreSQL をインストール
brew install postgresql@15
brew services start postgresql@15

# Git をインストール
brew install git

# インストール確認
node --version
npm --version
psql --version
git --version
```

### Linux（Ubuntu/Debian）

```bash
# パッケージマネージャーを更新
sudo apt update

# Node.js をインストール
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL をインストール
sudo apt install -y postgresql postgresql-contrib

# PostgreSQL サービスを開始
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Git をインストール
sudo apt install -y git

# インストール確認
node --version
npm --version
psql --version
git --version
```

## ステップ 2: Ollama のインストール

### Windows

1. [ollama.com/download/windows](https://ollama.com/download/windows) にアクセス
2. インストーラーをダウンロード
3. `OllamaSetup.exe` を実行
4. インストール完了後、コンピューターを再起動
5. インストール確認：
```powershell
ollama --version
ollama list  # 利用可能なモデルが表示される
```

### macOS

```bash
# ダウンロードしてインストール
curl -fsSL https://ollama.com/install.sh | sh

# インストール確認
ollama --version
ollama list
```

### Linux

```bash
# ダウンロードしてインストール
curl -fsSL https://ollama.com/install.sh | sh

# インストール確認
ollama --version
ollama list

# サービスを開始（必要に応じて）
sudo systemctl start ollama
sudo systemctl enable ollama
```

### 必要なモデルのダウンロード

AI モデルをダウンロード（約 3～4GB）：

```bash
# Ollama サービスを開始（未起動の場合）
ollama serve &

# 別のターミナルでモデルをダウンロード
ollama pull gemma3:4b           # テキスト生成（～2GB）
ollama pull embeddinggemma      # 埋め込み（～800MB）

# ダウンロード確認
ollama list
# 以下のように表示される：
# NAME                      ID              SIZE      MODIFIED
# gemma3:4b                 <hash>          2.0 GB    2 minutes ago
# embeddinggemma            <hash>          800 MB    1 minute ago
```

## ステップ 3: リポジトリのクローン

```bash
# プロジェクト用ディレクトリを作成
mkdir ~/projects
cd ~/projects

# リポジトリをクローン
git clone <リポジトリURL>
cd app-language-learning

# 正しいブランチにいるか確認
git status
```

## ステップ 4: Node.js 依存関係のインストール

```bash
# すべての npm パッケージをインストール
npm install

# 約 500MB をダウンロード（2～5 分程度）
# 完了まで待機

# インストール確認
npm list | head -20
```

## ステップ 5: データベースのセットアップ

### データベース作成

```bash
# PostgreSQL スーパーユーザーでログイン
psql -U postgres

# psql 内で以下を実行：
CREATE DATABASE language_learning;
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

または、一行で実行：

```bash
# Windows
psql -U postgres -c "CREATE DATABASE language_learning;" -c "CREATE EXTENSION vector;"

# macOS/Linux
sudo -u postgres psql -c "CREATE DATABASE language_learning;" -c "CREATE EXTENSION vector;"
```

### マイグレーションの実行

```bash
# プロジェクトディレクトリにいることを確認
cd app-language-learning

# マイグレーションスクリプトを実行
psql "postgres://postgres:postgres@localhost:5432/language_learning" -f server/migrations/001_language_learning_init.sql

# テーブル作成確認
psql "postgres://postgres:postgres@localhost:5432/language_learning" -c "\dt"

# 表示例：words、users、user_words、pronunciation_records など
```

### データベース接続設定

プロジェクトルートに `.env.local` ファイルを作成：

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/language_learning
```

PostgreSQL の認証情報を変更した場合は、上記の接続文字列も適宜修正してください。

## ステップ 6: 環境設定

プロジェクトルートに `.env.local` を作成し、以下を設定：

```env
# データベース
DATABASE_URL=postgres://postgres:postgres@localhost:5432/language_learning

# Ollama 設定
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:4b
OLLAMA_EMBEDDING_MODEL=embeddinggemma

# Whisper モデル（文字起こし用）
WHISPER_MODEL=Xenova/whisper-tiny

# API サーバー
API_PORT=3000
API_HOST=localhost

# 開発環境
NODE_ENV=development
DEBUG=app:*
```

## ステップ 7: セットアップ確認

### Ollama 接続確認

```bash
# Ollama をターミナルで実行
ollama serve

# 別のターミナルで接続テスト
curl http://127.0.0.1:11434/api/tags

# JSON でモデルリストが返ってくれば OK
```

### データベース接続確認

```bash
# プロジェクトルートから実行
node -e "
const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL);
client.connect((err) => {
  if (err) console.error('DB エラー:', err);
  else console.log('✓ データベース接続成功');
  client.end();
});
"
```

### セットアップスクリプトの実行

```bash
# すべてのコンポーネントを確認
npm run setup
```

以下のように表示されるはず：
```
[1] Ollama インストール確認...
✓ Ollama がインストールされています

[2] npm 依存関係をインストール...
✓ npm 依存関係がインストールされました

[3] データベースをセットアップ...
✓ データベースセットアップが完了しました

[4] Ollama モデルをダウンロード...
✓ gemma3:4b をダウンロード
✓ embeddinggemma をダウンロード

✓ セットアップが完了しました！
```

## ステップ 8: 開発環境の起動

3 つのターミナルを開いて以下を実行：

### ターミナル 1: Ollama サービス起動

```bash
ollama serve
# 以下が表示される：Listening on 127.0.0.1:11434
```

### ターミナル 2: API サーバー起動

```bash
cd app-language-learning
npm run server:dev

# 以下のように表示される：
# ✓ Listening on http://localhost:3000
```

### ターミナル 3: フロントエンド起動

```bash
cd app-language-learning
npm run react:start

# 以下のように表示される：
# VITE v5.0.0  ready in XXX ms
# ➜  Local:   http://127.0.0.1:5173/
```

### アプリへアクセス

ブラウザで以下を開く：
```
http://localhost:5173
```

## セットアップトラブルシューティング

### 「ollama コマンドが見つからない」

**Windows**:
- Ollama インストール後にコンピューターを再起動
- `C:\Users\[ユーザー名]\AppData\Local\Programs\Ollama` が存在するか確認
- 必要に応じて PATH に手動追加

**macOS/Linux**:
- インストール確認：`which ollama`
- 見つからない場合は Ollama を再インストール

### 「Ollama に接続できない」

```bash
# Ollama が起動しているか確認
ollama serve

# ポート利用可能性確認
# Windows/PowerShell
Test-NetConnection -ComputerName 127.0.0.1 -Port 11434

# macOS/Linux
nc -zv 127.0.0.1 11434
```

### 「データベース接続失敗」

```bash
# PostgreSQL が起動しているか確認
# Windows：サービス → PostgreSQL が実行中か確認
# macOS：brew services list | grep postgresql
# Linux：sudo systemctl status postgresql

# 接続テスト
psql "postgres://postgres:postgres@localhost:5432/language_learning"

# 失敗する場合は .env.local の認証情報を確認
```

### 「npm install に失敗」

```bash
# npm キャッシュをクリア
npm cache clean --force

# 再インストール
rm -rf node_modules package-lock.json
npm install
```

### 「ポート 3000 または 5173 が使用中」

```bash
# Windows/PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

## 次のステップ

セットアップ完了後：

1. **ドキュメント確認**:
   - [開発ガイド](../docs_jp/DEVELOPMENT_JP.md) - 機能追加やデバッグ方法
   - [アーキテクチャガイド](../docs_jp/ARCHITECTURE_JP.md) - システム設計を理解
   - [トラブルシューティング](../docs_jp/TROUBLESHOOTING_JP.md) - よくある問題

2. **アプリを試す**:
   - 単語を検索
   - 定義を生成
   - 発音を録音・分析
   - 学習進捗を確認

3. **カスタマイズ**:
   - 色・スタイルを変更
   - 言語を追加
   - 新機能を実装

## 高度なセットアップオプション

### PostgreSQL 認証情報を変更

```sql
CREATE USER appuser WITH PASSWORD 'secure-password';
CREATE DATABASE language_learning OWNER appuser;
```

`.env.local` を更新：
```env
DATABASE_URL=postgres://appuser:secure-password@localhost:5432/language_learning
```

### リモート PostgreSQL を使用

```env
DATABASE_URL=postgres://username:password@remote-host:5432/language_learning
```

### 別の Ollama ホストを使用

```env
OLLAMA_BASE_URL=http://192.168.1.100:11434  # リモート Ollama サーバー
```

### より小さい AI モデルを使用

低スペック環境向け：

```bash
# 軽いモデルをダウンロード
ollama pull mistral:7b-q4         # 5GB、高品質
ollama pull neural-chat:7b-q4     # 4GB、チャット向け

# .env.local を更新
OLLAMA_MODEL=mistral:7b-q4
```

## サポート

セットアップ中に問題が発生した場合：

1. [トラブルシューティング](../docs_jp/TROUBLESHOOTING_JP.md)を確認
2. ログファイルでエラーメッセージ確認
3. 前提条件が正しくインストールされているか再確認
4. 各コンポーネントを個別にテスト
5. 以下の情報を含めて Issue を作成：
   - エラーメッセージ
   - OS とバージョン
   - 実行したステップ
   - 診断コマンドの出力結果

## 参考資料

- [Node.js ドキュメント](https://nodejs.org/docs/)
- [PostgreSQL ドキュメント](https://www.postgresql.org/docs/)
- [Ollama ドキュメント](https://ollama.com)
- [Express.js ガイド](https://expressjs.com/ja/starter/basic-routing.html)
- [React ドキュメント](https://ja.react.dev)
