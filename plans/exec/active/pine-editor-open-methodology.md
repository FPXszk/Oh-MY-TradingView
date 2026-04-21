# Pine エディタ開封方法のドキュメント

## 📋 概要

Pine エディタをプログラムから確実に開く方法。複数のアプローチが試行されたが、最終的に **aria-label 検出 + 動的座標 CDP クリック** が最適となった。

---

## ❌ 失敗したアプローチ

### 1. JavaScript MouseEvent による直接クリック（失敗）

**方法：**
```javascript
const pineEl = document.querySelector('[aria-label="Pine"]');
const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
pineEl.dispatchEvent(event);
if (pineEl.onclick) pineEl.onclick(event);
```

**結果：** ❌ グルグル状態（読み込み完了しない）

**失敗理由：**
- TradingView の Pine エディタは React ベースのコンポーネント
- JavaScript の `MouseEvent` ディスパッチでは React の内部イベントハンドラが正しくトリガーされない
- CDP の低レベルマウスイベント送信方法が必要
- 環境確認で「グルぐるしてる」と報告あり

---

## ✅ 成功したアプローチ

### aria-label 検出 + 動的座標 + CDP Input.dispatchMouseEvent

**実装コード：**

```javascript
// ステップ1: aria-label="Pine" で要素を検出
const pineBtn = await evaluateAsyncWithPopupGuard(`
  (function() {
    const pineEl = document.querySelector('[aria-label="Pine"]');
    if (!pineEl) return null;
    
    const rect = pineEl.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  })()
`);

// ステップ2: CDP で座標クリック
const client = await getClient();
await client.Input.dispatchMouseEvent({
  type: 'mousePressed',
  x: pineBtn.x,
  y: pineBtn.y,
  button: 'left',
  clickCount: 1,
});
await client.Input.dispatchMouseEvent({
  type: 'mouseReleased',
  x: pineBtn.x,
  y: pineBtn.y,
  button: 'left',
});

// ステップ3: Pine が開いたか確認
const isPineOpen = await evaluateAsyncWithPopupGuard(`
  (function() {
    const monacoContainer = document.querySelector('.monaco-editor.pine-editor-monaco');
    return monacoContainer !== null;
  })()
`);
```

**結果：** ✅ 成功（グルグルなし、完全に安定した状態）

---

## 🎯 このアプローチが最適な理由

### 1. 環境非依存
| 条件 | 対応 |
|------|------|
| 複数モニタ | ✅ OK（座標は動的計算） |
| ウィンドウ全画面/ウィンドウモード | ✅ OK（BoundingClientRect が対応） |
| 解像度変更 | ✅ OK（相対座標） |
| ウィンドウサイズ変更 | ✅ OK（毎回計算） |
| ウィンドウ移動 | ✅ OK（絶対座標を使わない） |

### 2. 堅牢性
- `aria-label="Pine"` は UIの属性で、固定的
- `getBoundingClientRect()` は正確に要素位置を取得
- CDP の `Input.dispatchMouseEvent` は React のイベントハンドラを正しくトリガー

### 3. 検証可能性
- 座標取得後に `Monaco.querySelector` で Pine が開いたか確認可能
- デバッグ情報（座標、サイズ）も出力可能

---

## 💾 My Scripts 保存時の推奨手順

戦略を My Scripts へ連続保存するときは、**既存スクリプトを直接使い回さず、毎回 `名前欄` から新規の Strategy を作ってから保存する**。

### 推奨フロー

1. Pine タブは `aria-label="Pine"` を動的座標で検出し、CDP `Input.dispatchMouseEvent` で開く
2. `名前なしのスクリプト` または現在のスクリプト名が表示されている **名前欄本体** を開く
3. `新規作成` に hover してサブメニューを出す
4. サブメニューの `ストラテジー` を選ぶ
5. `名前なしのスクリプト` 状態に戻ったことを確認する
6. `setSource()` で対象戦略の Pine source を差し替える
7. `スクリプトを保存` から名前を入れて保存する
8. 既存名と衝突した場合は overwrite 確認に `はい` で進む

### この方法を使う理由

- `コピーを作成…` は状態依存が強く、新規保存と既存保存で挙動が揺れやすい
- `新規作成 → ストラテジー` は毎回 `名前なしのスクリプト` に戻せるため、後続の `setSource()` と保存手順を共通化できる
- 実機検証では、この方法で 8 本連続の My Scripts 保存が完走した

---

## 📝 実装例（src/core/pine.js への適用）

```javascript
export async function ensurePineEditorOpen() {
  // ステップ1: Pine が既に開いているか確認
  const already = await evaluate(`
    (function() {
      return document.querySelector('.monaco-editor.pine-editor-monaco') !== null;
    })()
  `);
  
  if (already) {
    console.log('✅ Pine は既に開いています');
    return true;
  }
  
  // ステップ2: aria-label で Pine ボタンを検出して座標を取得
  const pineLocation = await evaluateAsyncWithPopupGuard(`
    (function() {
      const pineBtn = document.querySelector('[aria-label="Pine"]');
      if (!pineBtn) return null;
      
      const rect = pineBtn.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    })()
  `);
  
  if (!pineLocation?.x) {
    throw new Error('Pine button not found');
  }
  
  // ステップ3: CDP で座標クリック
  const client = getClient();
  await client.Input.dispatchMouseEvent({
    type: 'mousePressed',
    x: pineLocation.x,
    y: pineLocation.y,
    button: 'left',
    clickCount: 1,
  });
  await client.Input.dispatchMouseEvent({
    type: 'mouseReleased',
    x: pineLocation.x,
    y: pineLocation.y,
    button: 'left',
  });
  
  // ステップ4: 待機してから確認
  await new Promise(r => setTimeout(r, 2500));
  
  const isPineOpen = await evaluate(`
    (function() {
      return document.querySelector('.monaco-editor.pine-editor-monaco') !== null;
    })()
  `);
  
  if (!isPineOpen) {
    throw new Error('Failed to open Pine editor');
  }
  
  console.log('✅ Pine エディタが正常に開きました');
  return true;
}
```

---

## 🔬 テスト環境での検証

**成功したテスト（2026-04-22）：**
- ウィンドウサイズ: 993 x 711
- 検出座標: (970.5, 448)
- 結果: ✅ Pine 完全に開封、グルグルなし

---

## ⚠️ 今後の注意点

1. **React イベントシステムの複雑性**
   - JavaScript `MouseEvent` では不十分
   - CDP の低レベルイベント送信が必要

2. **座標計算の重要性**
   - 絶対座標を使ってはいけない
   - 必ず `getBoundingClientRect()` で動的計算

3. **検証ステップの不可欠性**
   - Pine 開封後、必ず `.monaco-editor.pine-editor-monaco` で確認
   - 確認なしに進むとグルグル状態に気付かない

---

## 参考資料

- TradingView Desktop: Chrome DevTools Protocol (CDP) クライアント使用
- React コンポーネント: `MouseEvent` ディスパッチでは不十分
- DOM セレクタ:
  - Pine ボタン: `[aria-label="Pine"]`
  - Pine エディタ: `.monaco-editor.pine-editor-monaco`
