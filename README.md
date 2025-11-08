# 2025-11-hackathon

このリポジトリはローカルでフロント（静的ファイル）とバックエンド（FastAPI）を起動して開発・動作確認できる構成になっています。

以下はローカルでの実行手順（順序）です。macOS / zsh を想定していますが、Linux でも同様です。

## 前提
- Python 3.8+ がインストールされていること
- `git` でリポジトリをクローン済みであること

## 1) リポジトリを取得する

```bash
git clone https://github.com/KoizumiAyano/2025-11-hackathon.git
cd 2025-11-hackathon
```

## 2) バックエンド（FastAPI）の仮想環境作成と依存インストール

リポジトリ内に `requirements.txt` があるため、仮想環境を作成して依存を入れるのを推奨します。

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

> もし `requirements.txt` がない、または追加のパッケージが必要な場合は、適宜 `pip install fastapi uvicorn sqlalchemy python-dotenv` などを実行してください。

## 3) データベース接続の設定（`.env`）

バックエンドは `DATABASE_URL` 環境変数を参照します。開発時は簡単のため SQLite を使うことを推奨します。プロジェクトルートに `.env` を作成してください。

例: `./.env`

```env
DATABASE_URL=sqlite:///./test.db
```

`.env` を作成したら、仮想環境をアクティブにしてから FastAPI を起動します。

以下はよく使うコマンドの最短手順（そのままコピーして使えます）。

```bash
# 仮想環境作成（初回）
python3 -m venv .venv

# 仮想環境をアクティブ化（必須）
source .venv/bin/activate

# 依存インストール（初回）
pip install --upgrade pip
pip install -r requirements.txt

# .env を作成済みであることを確認（例: DATABASE_URL=sqlite:///./test.db）

# FastAPI 起動
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

## 4) バックエンド（FastAPI）を起動する

開発ホットリロード付きで起動する例:

```bash
# 仮想環境がアクティブな状態で
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

- 上記ではバックエンドをポート 8001 で起動しています（別のポートを使っても構いません）。
- `app/main.py` 内で CORS 設定を行っているため、フロントの静的サーバ（下記）からのアクセスは許可されています（許可 origin は `app/main.py` を参照）。

## 5) フロント（静的ファイル）の起動 — ブラウザで確認

フロントの静的ファイル（`index.html`、`src/`, `assets/` など）は簡易 HTTP サーバで配信できます。プロジェクトルートで実行します。

```bash
# 例: ポート 8000 で起動
python3 -m http.server 8000
# ブラウザで http://localhost:8000/ を開く
```

代替: VSCode の Live Server 拡張を使ってもホットリロードで確認できます。

## 6) フロントからバックエンドAPIを使う（動作確認コマンド）

バックエンドが `http://localhost:8001` で動いている前提の例です。

- 投稿を作る

```bash
curl -s -X POST http://localhost:8001/posts/ -H "Content-Type: application/json" \
	-d '{"name":"太郎","content":"テスト投稿","parm_unluckey":3}' | jq
```

- 投稿一覧を取得する

```bash
curl -s http://localhost:8001/posts/ | jq
```

- いいね（post_id=1 の例）

```bash
curl -s -X PUT http://localhost:8001/posts/1/like | jq
```

- 論理削除（post_id=1 の例）

```bash
curl -s -X DELETE http://localhost:8001/posts/1 | jq
```

※ `jq` は JSON を見やすくするためのツールです（任意）。

## 7) よくある問題と対処

- `DATABASE_URL` が設定されていない / 不正な場合
	- FastAPI 起動時に `create_engine(None)` のようなエラーになります。`.env` を用意するか環境変数をセットしてください。

- ポートが競合する場合
	- フロントとバックエンドは別々のポートで動かすことを推奨します（例: フロント 8000、バックエンド 8001）。

- CORS エラー
	- `app/main.py` に許可 origin を追加してください。現在は `http://localhost:8000` 等が許可されています。


## ローカル開発サーバの起動方法

開発中に `index.html` をブラウザで確認するには、プロジェクトルートで簡易 HTTP サーバを起動してください（Python 3 が必要です）。

例：ポート 8000 で起動する場合

```bash
cd /2025-11-hackathon
python3 -m http.server 8000
# ブラウザで http://localhost:8000/ を開く
```

停止するには、サーバを起動したターミナルで Ctrl+C を押すか、バックグラウンドで起動したプロセスを kill してください。

```bash
# 実行中プロセスを探して停止する例
ps aux | grep "http.server"
kill <PID>
```

必要に応じて別ポートを指定できます（例: `python3 -m http.server 3000`）。
