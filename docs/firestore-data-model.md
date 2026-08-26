# Cloud Firestore データ設計

Firebase Authentication の UID をデータ所有者として使い、他ユーザーのデータにアクセスできないパス構造にします。

```text
users/{uid}
  email: string
  createdAt: Timestamp
  updatedAt: Timestamp

users/{uid}/trips/{tripId}
  title: string
  startDate: string (YYYY-MM-DD)
  endDate: string (YYYY-MM-DD)
  description: string | null
  budgetAmount: number | null
  createdAt: Timestamp
  updatedAt: Timestamp

users/{uid}/trips/{tripId}/places/{placeId}
  name: string
  isVisited: boolean
  createdAt: Timestamp
  updatedAt: Timestamp

users/{uid}/trips/{tripId}/itineraryItems/{itemId}
  scheduledDate: string (YYYY-MM-DD)
  startTime: string (HH:mm) | null
  endTime: string (HH:mm) | null
  placeName: string
  tripPlaceId: string | null
  memo: string | null
  sortOrder: number
  createdAt: Timestamp
  updatedAt: Timestamp

users/{uid}/trips/{tripId}/expenses/{expenseId}
  description: string
  category: transport | accommodation | food | activity | shopping | other
  amount: number
  paymentStatus: unpaid | paid
  paidAt: string (YYYY-MM-DD) | null
  memo: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
```

## 設計上の判断

- 全データを `users/{uid}` の配下に置く。コレクションを横断する検索は現行機能にないため、親子関係と所有権をパスで表現することを優先する。
- Firestore のドキュメント ID は自動生成される文字列を使う。既存の数値 ID は移行しない。
- 日付・時刻は既存 UI の入力形式とソート順を維持するため、ISO 形式の文字列で保持する。表示・比較が必要な範囲では文字列順と日付順が一致する。
- 集計値は保存せず、費用ドキュメントを取得してクライアントで算出する。現行の予算、総額、支払済み額、カテゴリ別集計を再現できる。
- 旅行削除時のサブコレクションは Firestore で自動削除されない。段階 5 で batch write を使い、旅行・場所・旅程・費用を明示的に削除する。
- 行きたい場所を削除する際は、その場所を参照する旅程の `tripPlaceId` を `null` にする。これも batch write で実行する。

## Security Rules の責務

[firestore.rules](../firestore.rules) では次を強制する。

- 認証済みユーザーは自分の UID 配下のデータだけを読み書きできる。
- 未認証ユーザーおよび他ユーザーは、すべてのデータ操作を拒否する。
- 許可しないフィールドの追加、ID の書き換え、範囲外の金額、未知の費用カテゴリなどを拒否する。
- 旅程の日付が親の旅行期間に収まること、参照する行きたい場所が同じ旅行配下に存在することを強制する。
- `createdAt` は作成後に変更不可とし、`updatedAt` はサーバー時刻で更新する。

以下は Security Rules の対象外で、段階 4・5 のクライアント実装で検証する。

- 実在する暦日かどうか、旅行期間が14日以内かどうか。
- 旅行期間を短縮するとき、既存の全旅程が期間内に残ること。
- 同一時刻の旅程の重複。
- 同じ日の `sortOrder` の重複・連続性。

これらは同じ所有者のデータ品質に関する制約であり、他ユーザーのデータを保護する Security Rules では全件検索を使って安全に強制できないためです。

## 必要なインデックス

現行の画面で必要な一覧は親コレクションごとの単一フィールドソートで実現できるため、複合インデックスはまだ不要です。Firestore が将来のクエリに必要な複合インデックスを示した場合に、[firestore.indexes.json](../firestore.indexes.json) へ追加します。
