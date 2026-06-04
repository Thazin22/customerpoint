import { Router } from "express";
import { z } from "zod";
import { pool, query } from "../db.js";
import { AppError, sendError } from "../http.js";
import {
  calculateEarnedPoints,
  calculateRedemptionValue
} from "../config/loyalty.js";

export const pointsRouter = Router();

const earnSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  purchaseAmount: z.coerce.number().positive(),
  note: z.string().optional()
});

const redeemSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  points: z.coerce.number().int().positive(),
  note: z.string().optional()
});

pointsRouter.post("/earn", async (req, res) => {
  try {
    const body = earnSchema.parse(req.body);
    const earnedPoints = calculateEarnedPoints(body.purchaseAmount);

    if (earnedPoints <= 0) {
      throw new AppError(400, "Purchase amount is too low to earn points");
    }

    const result = await query(
      `
        insert into point_transactions
          (customer_id, type, points, purchase_amount, note)
        values ($1, 'earn', $2, $3, $4)
        returning id, customer_id, type, points, purchase_amount, note, created_at
      `,
      [body.customerId, earnedPoints, body.purchaseAmount, body.note ?? null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    sendError(res, error);
  }
});

pointsRouter.post("/redeem", async (req, res) => {
  const client = await pool.connect();

  try {
    const body = redeemSchema.parse(req.body);
    await client.query("begin");

    const customerResult = await client.query(
      "select id from customers where id = $1 for update",
      [body.customerId]
    );

    if (!customerResult.rowCount) {
      throw new AppError(404, "Customer not found");
    }

    const balanceResult = await client.query<{ balance: number }>(
      `
        select coalesce(sum(points), 0)::integer as balance
        from point_transactions
        where customer_id = $1
      `,
      [body.customerId]
    );

    const balance = balanceResult.rows[0]?.balance ?? 0;

    if (balance < body.points) {
      throw new AppError(400, "Not enough points to redeem");
    }

    const redemptionValue = calculateRedemptionValue(body.points);
    const insertResult = await client.query(
      `
        insert into point_transactions
          (customer_id, type, points, redemption_value, note)
        values ($1, 'redeem', $2, $3, $4)
        returning id, customer_id, type, points, redemption_value, note, created_at
      `,
      [body.customerId, -body.points, redemptionValue, body.note ?? null]
    );

    await client.query("commit");
    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    await client.query("rollback");
    sendError(res, error);
  } finally {
    client.release();
  }
});
