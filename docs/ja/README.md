# gas-structifier

`gas-structifier` は、Google Apps Script 用のライブラリで、Google スプレッドシートに入力された非構造化データを指定したスキーマに基づいて構造化データに変換することを目的としています。たとえば、Google Home を通じて収集した自由入力形式のアンケートデータを簡単に整理できます。このライブラリはカスタム関数を通じて簡単に利用できます。

---

## 主な機能

- **STRUCTIFY**: 非構造化データを指定したスキーマに基づいて構造化データに変換します。
- **SCHEMIFY**: 自然言語で記述されたスキーマを、STRUCTIFY で直接使用できるスキーマテーブル形式に変換します。

---

## インストール方法

1. **Google Apps Script プロジェクトにライブラリを追加する**

   - スクリプトエディタを開きます（例: Google スプレッドシートから `拡張機能 > Apps Script`）。
   - メニューから `ライブラリ` を選択し、次のスクリプト ID を入力してライブラリを追加します。
     ```
     スクリプト ID: 1EDhKN-alioE4fwlEaPYJWbxJbIgHnpKUrJJs1HSud1y1rJatdKkBdAJI
     ```
   - 最新バージョンを選択して保存します。

2. **スプレッドシートでカスタム関数を使用する**

   - 次のカスタム関数が使用可能になります。
     - `STRUCTIFY`
     - `SCHEMIFY`

---

## 使い方

### STRUCTIFY 関数

#### 概要

`STRUCTIFY` 関数は、入力データをスキーマに基づいて処理し、構造化データに変換します。非構造化テキストデータを処理し、定義済みのスキーマに基づいて結果を返すよう設計されています。

#### 入力

- **`inputRange`**: 次のような 2 次元配列。
  - 最初の列には一意の識別子（例: ID）が含まれます。
  - 2 列目には処理対象の非構造化テキストデータが含まれます。
  - 例:
    ```
    [
      ["ID_1", "John Doe is 29 years old."],
      ["ID_2", "Jane Smith, born in 1993, is a software engineer."]
    ]
    ```
- **`schemaRange`**: 次のような 2 次元配列。
  - 最初の行には snake_case 形式の列名（キー）が含まれます。
  - 2 行目には各列の説明が含まれます。
  - 3 行目にはデータ型（`string`, `number`, `date`, `boolean`）が含まれます。
  - 例:
    ```
    [
      ["name", "age"],
      ["User's name", "User's age"],
      ["string", "number"]
    ]
    ```

#### 出力

- 各行の構造化データがカンマで結合され、行は指定した区切り文字（デフォルトは `"|"`）で結合された文字列を返します。
- 出力例:
  ```
  "ID_1,John Doe,29|ID_2,Jane Smith,30"
  ```

#### 関数の役割

この関数は、アンケート回答、チャットログ、自由形式のテキストデータを、事前定義されたルールに基づいて構造化データに変換し、Google スプレッドシートでのさらなる分析を容易にします。

---

### SCHEMIFY 関数

#### 概要

`SCHEMIFY` 関数は、自然言語の記述からスキーマテーブルを生成します。人間が理解しやすい記述を構造化スキーマ形式に変換し、スキーマ作成を自動化します。

#### 入力

- **`naturalLanguageInput`**: スキーマに含める属性を記述した文字列。
  - 入力例: `"Name and age of a user"`

#### 出力

- 次の形式で 2 次元配列を返します。
  - 最初の行には snake_case 形式の列名（キー）。
  - 2 行目には各列の説明（入力記述の言語を保持）。
  - 3 行目にはデータ型（`string`, `number`, `date`, `boolean`）。
  - 出力例:
    ```
    [
      ["name", "age"],
      ["The user's name", "The user's age"],
      ["string", "number"]
    ]
    ```

#### 関数の役割

`SCHEMIFY` 関数の出力は、`STRUCTIFY` 関数とシームレスに連携するように設計されています。これにより、`SCHEMIFY` で生成されたスキーマを `STRUCTIFY` の `schemaRange` 引数として使用することで、自然言語の記述を構造化データに効率的に変換できます。

---

### STRUCTIFY と SCHEMIFY をカスタム関数として使用する

Google スプレッドシートで `STRUCTIFY` と `SCHEMIFY` を使用するには:

以下のラッパー関数を Google Apps Script プロジェクトに追加してください。

```javascript
function STRUCTIFY(i, s) {
  return gasstructifier.STRUCTIFY(i, s);
}

function SCHEMIFY(s) {
  return gasstructifier.SCHEMIFY(s);
}
```

その後、以下のようにスプレッドシートで直接関数を呼び出せます。

- `=STRUCTIFY(A1:B10, D1:E3)`
- `=SCHEMIFY("Name and age")`

---

### 大量データの効率的な処理

Google スプレッドシートのカスタム関数には 30 秒のタイムアウト制限があります。大量の行を処理する場合、この制限が問題になることがあります。この問題を解決するには、各行を個別に処理し、結果をスプレッドシートの数式で結合します。

#### ワークフロー

1. **STRUCTIFY の結果を保存する新しい列を追加**:
   - 各入力テキストに対して `STRUCTIFY` 関数を行ごとに適用します。
2. **結果を単一の出力に結合**:
   - 別のシートで以下の数式を使用して STRUCTIFY 出力を集計および解析します。
     ```
     =ARRAYFORMULA(SPLIT(TRANSPOSE(SPLIT(TEXTJOIN("|", TRUE, ColumnRange), "|")), ","))
     ```
     - `ColumnRange` を STRUCTIFY 結果を保存している列の範囲に置き換えます。

#### サンプルスプレッドシート

`gas-structifier` の使用例を示したサンプルスプレッドシートを作成しました。[こちら](https://docs.google.com/spreadsheets/d/1CmPEjM595miyoDUxDl_xB11zpoiVx08iRrkIcYYst7U/edit?gid=1965312518)からご覧いただけます。（閲覧専用）

この方法により、タイムアウト制限を気にせずに複数行を処理しつつ、データを整理しやすく保つことができます。

---

## エラーハンドリング

### STRUCTIFY

- **入力エラー**:
  - `inputRange` が 2 列範囲でない。
  - `schemaRange` の形式が無効。
- **スキーマエラー**:
  - スキーマの型と入力データが一致しない。

### SCHEMIFY

- **入力エラー**:
  - 自然言語スキーマ記述が無効または未対応。

---

## OpenAI API キーの設定

このライブラリは OpenAI API を使用して構造化データを処理および生成します。このライブラリを使用するには、スクリプトエディタで OpenAI API キーを設定する必要があります。

### OpenAI API キーの設定方法

1. Google Apps Script エディタを開きます。
2. 次の関数を実行して OpenAI API キーを安全に保存します。
   ```javascript
   setOpenAIKey("YOUR_OPENAI_API_KEY");
   ```
   `YOUR_OPENAI_API_KEY` を実際の API キーに置き換えてください。
3. キーが正しく設定されているかどうかは、`checkToken()` 関数を使用して確認できます。キーが正しく設定されていない場合は、エラーメッセージが手順を案内します。

### 使用例

- **キーを設定する**:
  ```javascript
  setOpenAIKey("sk-abc123...");
  ```
  これにより、API キーが Google Apps Script 環境に安全に保存されます。

- **キーを確認する**:
  ```javascript
  checkToken();
  ```
  キーが正しく設定されている場合、成功メッセージが返されます。

- **キーの使用**:
  ライブラリが OpenAI API と通信するたびにキーが自動的に取得されます。

---

## ライセンス

このプロジェクトは MIT ライセンスの下で提供されています。

