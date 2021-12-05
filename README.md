# chrome-extension-system-monitor

Chromeブラウザ拡張の Native Messaging を用いてブラウザが動くPCにのメトリクスを収集しグラフに表示します。

拡張機能のディベロッパーモードで動作確認できます。Native messaging host 部分が Linuxでのみ対応しています。他のOSでは動きません 🥺。その上CPU使用率の値が怪しいです。

動作確認環境は Ubuntu 20.04 + Brave Browser 96.1.32.113 ですが Native messaging host の設定ファイルパスは Chrome に合わせてあります。

![Screenshot from 2021-12-05 19-39-10](https://user-images.githubusercontent.com/937486/144747394-846f2f23-dc5c-4a2f-a320-cf860b275871.png)
![Screenshot from 2021-12-05 19-38-26](https://user-images.githubusercontent.com/937486/144747418-3cd57ec4-943e-4aaa-bbab-c63f74d51a08.png)

Native Messaging に関する処理で、ブラウザ拡張部分の処理は `src/ts/background` が、Native messaging host 部分の処理は `src/go/collector.go` に記述されています。

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