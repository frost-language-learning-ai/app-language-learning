# トラブルシューティングガイド

## Ollama インストール問題

### PowerShell セキュリティモジュール エラー

**エラーメッセージ:**
```
The 'Get-AuthenticodeSignature' command was not found...
iex : 'Get-AuthenticodeSignature' コマンドは 'Microsoft.PowerShell.Security' 
モジュール内で見つかりましたが、モジュールをロードできませんでした。
```

**原因**: PowerShell のセキュリティモジュールがロードできない。実行ポリシーまたはモジュール読み込み設定の問題。

**解決策**: セットアップスクリプトが自動的に複数のインストール方法を試します：
1. PowerShell スクリプト（公式）
2. Winget（Windows パッケージマネージャー）
3. Chocolatey（インストール済みの場合）

すべて失敗した場合は、手動インストール：

```powershell
# 方法 1: PowerShell で直接実行（管理者権限）
powershell -ExecutionPolicy Bypass -Command "irm https://ollama.com/install.ps1 | iex"

# 方法 2: Winget でインストール
winget install Ollama.Ollama

# 方法 3: Chocolatey でインストール
choco install ollama

# 方法 4: 手動ダウンロード
# https://ollama.com/download/windows にアクセス
```

### インストール後にターミナルの再起動が必要

**症状**: インストールスクリプト完了後も `ollama --version` が失敗

**解決策**:
```bash
# 現在のターミナルを完全に閉じて新しいターミナルを開く
npm run setup
```

PATH 環境変数がインストール中に更新されるため、再読み込みが必要です。

### インストール後も「ollama コマンドが見つからない」

**症状**: 再起動後も `ollama` コマンドが認識されない

**解決策**:
- Ollama がインストール位置を確認：
  - Windows：`C:\Users\[ユーザー名]\AppData\Local\Programs\Ollama`
  - macOS：`/Applications/Ollama.app`
  - Linux：`/usr/local/bin/ollama` または `/usr/bin/ollama`
- 必要に応じて PATH に手動追加
- Ollama を再インストール

## Ollama 接続問題

### Ollama に接続できない

**エラー**: `Failed to connect to Ollama at http://127.0.0.1:11434`

**解決策**:
1. Ollama サービスを起動：
   ```bash
   ollama serve
   ```

2. Ollama が起動しているか確認：
   ```bash
   ollama --version
   ollama list
   ```

3. ポート 11434 がアクセス可能か確認：
   ```bash
   # Windows/PowerShell
   Test-NetConnection -ComputerName 127.0.0.1 -Port 11434
   
   # Linux/macOS
   nc -zv 127.0.0.1 11434
   ```

4. `OLLAMA_BASE_URL` 環境変数を確認：
   ```bash
   echo $env:OLLAMA_BASE_URL  # Windows/PowerShell
   echo $OLLAMA_BASE_URL      # Linux/macOS
   ```

5. Windows の場合：システムトレイ内の Ollama アイコンから起動
   - システムトレイの Ollama アイコンをクリック

### モデルが見つからない

**エラー**: `Error: model not found: gemma3:4b`

**解決策**:
1. 必要なモデルをダウンロード：
   ```bash
   ollama pull gemma3:4b
   ollama pull embeddinggemma
   ```

2. モデルがダウンロードされたか確認：
   ```bash
   ollama list
   ```

3. Ollama がモデル保存に十分なディスク容量があるか確認（～4-6GB）

## データベース問題

### PostgreSQL 接続失敗

**エラー**: `FATAL: remaining connection slots are reserved...`

**解決策**:
1. PostgreSQL が起動しているか確認
2. `DATABASE_URL` の認証情報を確認：
   ```bash
   # デフォルト接続文字列
   postgres://postgres:postgres@localhost:5432/language_learning
   ```
3. Windows：サービスパネルから PostgreSQL サービスを起動
4. Linux/macOS：サービスを起動：
   ```bash
   brew services start postgresql  # macOS
   sudo systemctl start postgresql # Linux
   ```

### pgvector 拡張がない

**エラー**: `ERROR: function vector(internal) does not exist`

**解決策**:
```sql
-- language_learning データベースに接続して実行
CREATE EXTENSION IF NOT EXISTS vector;

-- インストール確認
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### マイグレーション失敗

**エラー**: マイグレーションファイルが見つからない、または実行できない

**解決策**:
1. マイグレーションファイルが存在するか確認：
   ```bash
   ls server/migrations/
   ```

2. データベース認証情報と接続を確認：
   ```bash
   psql "postgres://postgres:postgres@localhost:5432/language_learning"
   ```

3. マイグレーションを手動実行：
   ```bash
   psql "postgres://postgres:postgres@localhost:5432/language_learning" -f server/migrations/001_language_learning_init.sql
   ```

4. PostgreSQL ログでエラー詳細を確認

## Whisper 文字起こし問題

### 初回文字起こしで Whisper をダウンロード

**症状**: 初回の文字起こしに 30～60 秒かかり、多くのダウンロード

**説明**: 
- 正常な動作です
- Whisper モデル（～150MB）は初回使用時にダウンロード
- モデルはローカルにキャッシュされるため、その後は高速

**解決策**:
- インターネット接続が安定していることを確認
- API サーバーを起動したまま待機
- 初回は 1～2 分かかる可能性あり（インターネット速度に依存）
- 2 回目以降は 2～5 秒に高速化

### 文字起こし完了しても結果が空

**エラー**: 文字起こしは終わるが、結果が返ってこない

**解決策**:
1. Ollama が起動しているかつアクセス可能か確認
2. Whisper モデルがダウンロード済みか確認：
   ```bash
   ollama list | grep whisper
   ```
3. サーバーログでエラーを確認
4. 文字起こしをもう一度実行（一時的な問題の場合あり）

### 文字起こしでメモリ不足

**エラー**: `Out of memory` または `CUDA out of memory`

**解決策**:
1. 他のアプリケーションを閉じる
2. ブラウザのタブを閉じてメモリ解放
3. Whisper 用に 2GB 以上の RAM が空いていることを確認
4. CPU のみで処理：`WHISPER_DEVICE=cpu` を設定

## パフォーマンス問題

### モデル読み込みが遅い

**症状**: 初回 API 呼び出しに 5 秒以上

**原因**:
- モデルがディスクからメモリに読み込まれている
- 再起動直後は通常動作

**解決策**:
- 正常な動作です。初回呼び出しが完了するまで待機
- その後の呼び出しは 1～2 秒に高速化

### メモリ使用量が高い

**症状**: Ollama プロセスが 8GB 以上のメモリを使用

**解決策**:
- Gemma3 4B は通常 4～6GB のメモリを使用
- 他のアプリを閉じる
- 複数の Ollama インスタンスが起動していないか確認
- メモリが限定的な場合はより小さいモデルの使用を検討

### CPU 使用率が高い

**症状**: モデル推論中に CPU 使用率が 100%

**解決策**:
- 推論中は正常な動作です
- GPU オフロード（利用可能な場合）が役立つ
- モデル推論をオフピーク時間帯に実行することを検討

## 開発環境問題

### npm 依存関係インストール失敗

**エラー**: `npm ERR! ...`

**解決策**:
1. npm キャッシュをクリア：
   ```bash
   npm cache clean --force
   ```

2. node_modules を削除して再インストール：
   ```bash
   rm -r node_modules
   npm install
   ```

3. npm と Node.js を更新：
   ```bash
   npm install -g npm@latest
   ```

### フロントエンドビルド失敗

**エラー**: Vite または React コンパイルエラー

**解決策**:
1. Node.js バージョン確認（20 以上が必須）：
   ```bash
   node --version
   ```

2. Vite キャッシュをクリア：
   ```bash
   rm -r node_modules/.vite
   ```

3. 再ビルド：
   ```bash
   npm run react:build
   ```

### API サーバー起動失敗

**エラー**: `Port 3000 already in use` など

**解決策**:
1. ポートを使用しているプロセスを特定・終了：
   ```bash
   # Windows/PowerShell
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Linux/macOS
   lsof -i :3000
   kill -9 <PID>
   ```

2. `.env` またはサーバー設定でポートを変更：
   ```bash
   PORT=3001 npm run server:dev
   ```

## ヘルプの取得

ここに記載されていない問題が発生した場合：

1. [アーキテクチャガイド](ARCHITECTURE_JP.md)でシステム設計を確認
2. [開発ガイド](DEVELOPMENT_JP.md)で セットアップのコツを確認
3. サーバーログで詳細なエラーメッセージを確認
4. 以下の情報を含めて Issue を作成：
   - エラーメッセージ（フルスタックトレース）
   - 再現手順
   - システム情報（OS、Node.js バージョン等）
   - 診断コマンド出力結果
