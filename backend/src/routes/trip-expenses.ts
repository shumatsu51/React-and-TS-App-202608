import { Hono } from "hono";
import mysql from "mysql2/promise";

import pool from "../db/index.js";
import { requireAuth, type AuthEnv } from "../middleware/auth.js";

const tripExpenses = new Hono<AuthEnv>();

tripExpenses.use("/*", requireAuth);

const categories = ["transport", "accommodation", "food", "activity", "shopping", "other"] as const;
const paymentStatuses = ["unpaid", "paid"] as const;
const MAX_AMOUNT = 999_999_999;

type Category = (typeof categories)[number];
type PaymentStatus = (typeof paymentStatuses)[number];

type ExpenseBody = {
  description?: unknown;
  category?: unknown;
  amount?: unknown;
  payment_status?: unknown;
  paid_at?: unknown;
  memo?: unknown;
};

type ValidatedExpense = {
  description: string;
  category: Category;
  amount: number;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  memo: string | null;
};

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};

const isCategory = (value: string): value is Category => categories.includes(value as Category);

const isPaymentStatus = (value: string): value is PaymentStatus =>
  paymentStatuses.includes(value as PaymentStatus);

const parseAmount = (value: unknown): number | null => {
  const normalizedValue = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;

  if (
    typeof normalizedValue !== "number" ||
    !Number.isSafeInteger(normalizedValue) ||
    normalizedValue < 1 ||
    normalizedValue > MAX_AMOUNT
  ) {
    return null;
  }

  return normalizedValue;
};

const validateExpense = (body: ExpenseBody): { value: ValidatedExpense } | { message: string } => {
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category = typeof body.category === "string" ? body.category : "";
  const paymentStatus = typeof body.payment_status === "string" ? body.payment_status : "";
  const paidAt = typeof body.paid_at === "string" && body.paid_at ? body.paid_at : null;
  const memo = typeof body.memo === "string" && body.memo.trim() ? body.memo.trim() : null;
  const amount = parseAmount(body.amount);

  if (!description) return { message: "内容を入力してください" };
  if (description.length > 100) return { message: "内容は100文字以内で入力してください" };
  if (!category) return { message: "カテゴリを選択してください" };
  if (!isCategory(category)) return { message: "カテゴリが不正です" };
  if (body.amount === undefined || body.amount === null || body.amount === "") {
    return { message: "金額を入力してください" };
  }
  if (amount === null) return { message: "金額は1円以上999,999,999円以下の整数で入力してください" };
  if (!paymentStatus) return { message: "支払状況を選択してください" };
  if (!isPaymentStatus(paymentStatus)) return { message: "支払状況が不正です" };
  if (paidAt && !isValidDate(paidAt)) return { message: "有効な支払日を入力してください" };
  if (memo && memo.length > 500) return { message: "メモは500文字以内で入力してください" };

  return {
    value: {
      description,
      category,
      amount,
      paymentStatus,
      paidAt,
      memo,
    },
  };
};

const getOwnedTrip = async (tripId: number, userId: number) => {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT id, budget_amount FROM trips WHERE id = ? AND user_id = ?",
    [tripId, userId]
  );
  return rows[0] ?? null;
};

const getOwnedExpense = async (expenseId: number, userId: number) => {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    `
      SELECT te.id, te.trip_id
      FROM trip_expenses te
      INNER JOIN trips t ON te.trip_id = t.id
      WHERE te.id = ? AND t.user_id = ?
    `,
    [expenseId, userId]
  );
  return rows[0] ?? null;
};

const formatAmount = (value: unknown) => Number(value ?? 0);

// GET /api/trip-expenses/trips/:tripId
tripExpenses.get("/trips/:tripId", async (c) => {
  try {
    const tripId = Number(c.req.param("tripId"));
    const userId = Number(c.get("user").sub);

    if (!Number.isInteger(tripId)) return c.json({ message: "不正な旅行IDです" }, 400);

    const trip = await getOwnedTrip(tripId, userId);
    if (!trip) return c.json({ message: "旅行が見つかりません" }, 404);

    const [summaryRows] = await pool.query<mysql.RowDataPacket[]>(
      `
        SELECT
          COALESCE(SUM(amount), 0) AS total_amount,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0) AS paid_amount
        FROM trip_expenses
        WHERE trip_id = ?
      `,
      [tripId]
    );
    const [categoryRows] = await pool.query<mysql.RowDataPacket[]>(
      `
        SELECT
          category,
          COALESCE(SUM(amount), 0) AS total_amount,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0) AS paid_amount
        FROM trip_expenses
        WHERE trip_id = ?
        GROUP BY category
      `,
      [tripId]
    );
    const [expenseRows] = await pool.query<mysql.RowDataPacket[]>(
      `
        SELECT id, trip_id, description, category, amount, payment_status, paid_at, memo
        FROM trip_expenses
        WHERE trip_id = ?
        ORDER BY paid_at IS NULL, paid_at DESC, id DESC
      `,
      [tripId]
    );

    const totalAmount = formatAmount(summaryRows[0]?.total_amount);
    const paidAmount = formatAmount(summaryRows[0]?.paid_amount);
    const budgetAmount = trip.budget_amount === null ? null : formatAmount(trip.budget_amount);
    const categoryByName = new Map(categoryRows.map((row) => [row.category, row]));

    return c.json({
      budget_amount: budgetAmount,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      remaining_budget: budgetAmount === null ? null : budgetAmount - totalAmount,
      category_summaries: categories.map((category) => {
        const row = categoryByName.get(category);
        return {
          category,
          total_amount: formatAmount(row?.total_amount),
          paid_amount: formatAmount(row?.paid_amount),
        };
      }),
      expenses: expenseRows.map((row) => ({ ...row, amount: formatAmount(row.amount) })),
    });
  } catch (error) {
    console.error(error);
    return c.json({ message: "費用情報の取得に失敗しました" }, 500);
  }
});

// POST /api/trip-expenses/trips/:tripId
tripExpenses.post("/trips/:tripId", async (c) => {
  try {
    const tripId = Number(c.req.param("tripId"));
    const userId = Number(c.get("user").sub);

    if (!Number.isInteger(tripId)) return c.json({ message: "不正な旅行IDです" }, 400);
    if (!(await getOwnedTrip(tripId, userId)))
      return c.json({ message: "旅行が見つかりません" }, 404);

    const validated = validateExpense((await c.req.json()) as ExpenseBody);
    if ("message" in validated) return c.json({ message: validated.message }, 400);

    const value = validated.value;
    const [result] = await pool.query<mysql.ResultSetHeader>(
      `
        INSERT INTO trip_expenses (trip_id, description, category, amount, payment_status, paid_at, memo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        tripId,
        value.description,
        value.category,
        value.amount,
        value.paymentStatus,
        value.paidAt,
        value.memo,
      ]
    );

    return c.json(
      {
        id: result.insertId,
        trip_id: tripId,
        description: value.description,
        category: value.category,
        amount: value.amount,
        payment_status: value.paymentStatus,
        paid_at: value.paidAt,
        memo: value.memo,
      },
      201
    );
  } catch (error) {
    console.error(error);
    return c.json({ message: "費用の追加に失敗しました" }, 500);
  }
});

// PUT /api/trip-expenses/:id
tripExpenses.put("/:id", async (c) => {
  try {
    const expenseId = Number(c.req.param("id"));
    const userId = Number(c.get("user").sub);

    if (!Number.isInteger(expenseId)) return c.json({ message: "不正な費用IDです" }, 400);

    const expense = await getOwnedExpense(expenseId, userId);
    if (!expense) return c.json({ message: "費用が見つかりません" }, 404);

    const validated = validateExpense((await c.req.json()) as ExpenseBody);
    if ("message" in validated) return c.json({ message: validated.message }, 400);

    const value = validated.value;
    await pool.query(
      `
        UPDATE trip_expenses
        SET description = ?, category = ?, amount = ?, payment_status = ?, paid_at = ?, memo = ?
        WHERE id = ?
      `,
      [
        value.description,
        value.category,
        value.amount,
        value.paymentStatus,
        value.paidAt,
        value.memo,
        expenseId,
      ]
    );

    return c.json({
      id: expenseId,
      trip_id: expense.trip_id,
      description: value.description,
      category: value.category,
      amount: value.amount,
      payment_status: value.paymentStatus,
      paid_at: value.paidAt,
      memo: value.memo,
    });
  } catch (error) {
    console.error(error);
    return c.json({ message: "費用の更新に失敗しました" }, 500);
  }
});

// DELETE /api/trip-expenses/:id
tripExpenses.delete("/:id", async (c) => {
  try {
    const expenseId = Number(c.req.param("id"));
    const userId = Number(c.get("user").sub);

    if (!Number.isInteger(expenseId)) return c.json({ message: "不正な費用IDです" }, 400);

    const [result] = await pool.query<mysql.ResultSetHeader>(
      `
        DELETE te
        FROM trip_expenses te
        INNER JOIN trips t ON te.trip_id = t.id
        WHERE te.id = ? AND t.user_id = ?
      `,
      [expenseId, userId]
    );

    if (result.affectedRows === 0) return c.json({ message: "費用が見つかりません" }, 404);

    return c.body(null, 204);
  } catch (error) {
    console.error(error);
    return c.json({ message: "費用の削除に失敗しました" }, 500);
  }
});

export default tripExpenses;
