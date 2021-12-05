# chrome-extension-system-monitor

Chromeブラウザ拡張の Native Messaging の動作確認を兼ねてブラウザが動くPCにのメトリクスを収集しグラフに表示します。Native Messaging に関する処理については、ブラウザ拡張部分の処理は `src/ts/background.ts` に、Native messaging host 部分の処理は `src/go/collector.go` に記述されています。

この拡張は Native messaging host 部分が Linuxでのみ対応しています。その上CPU使用率が怪しいです。

拡張機能のディベロッパーモードを用いれば動作確認できます。Native Messaging を動作させるためには対象となる拡張のURLを Naitive messaging host のマニフェストファイルに埋め込む必要がありますが、ディベロッパーモードで拡張を読み込んだときはこのURLに含まれる拡張のIDが拡張のディレクトリ依存となります。このため、必要に応じて `src/com.github.ihiroky.system_monitor.json` に含まれる `allowed_origins` の値を書き換える必要があります。

動作確認環境は Ubuntu 20.04 + Brave Browser 96.1.32.113 ですが、Native messaging host の設定ファイルパスは Chrome に合わせてあります。

![Screenshot from 2021-12-05 19-39-10](https://user-images.githubusercontent.com/937486/144747394-846f2f23-dc5c-4a2f-a320-cf860b275871.png)
![Screenshot from 2021-12-05 19-38-26](https://user-images.githubusercontent.com/937486/144747418-3cd57ec4-943e-4aaa-bbab-c63f74d51a08.png)

## Prerequisites

* Node
* Yarn
* Go
* Bash

## Setup

```bash
# npm
yarn install
# ブラウザ拡張のビルド
yarn build
# Native messaging hostのビルド
yarn nmh:build
# Native messaging hostの設定ファイルインストール
yarn nmh:setup
```

## Load extension to chrome

Load `dist` directory

## Test
:(