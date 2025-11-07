# 2025-11-hackathon

Initial commit to create `main` branch and enable creating `dev` branch.

This repository was initialized by an automated script.

## ローカル開発サーバの起動方法

開発中に `index.html` をブラウザで確認するには、プロジェクトルートで簡易 HTTP サーバを起動してください（Python 3 が必要です）。

例：ポート 8000 で起動する場合

```bash
cd /Users/nozomi0407/2025-11-hackathon
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
