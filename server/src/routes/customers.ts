import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { sendError } from "../http.js";

export const customersRouter = Router();

const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email().optional().nullable()
});

customersRouter.get("/", async (req, res) => {
  try {
    const search = String(req.query.search ?? "").trim();
    const result = await query(
      `
        select c.id, c.name, c.phone, c.email, c.created_at, b.balance
        from customers c
        join customer_point_balances b on b.customer_id = c.id
        where $1 = ''
          or c.name ilike '%' || $1 || '%'
          or c.phone ilike '%' || $1 || '%'
        order by c.created_at desc
        limit 50
      `,
      [search]
    );

    res.json(result.rows);
  } catch (error) {
    sendError(res, error);
  }
});

customersRouter.get("/:id", async (req, res) => {
  try {
    const result = await query(
      `
        select c.id, c.name, c.phone, c.email, c.created_at, b.balance
        from customers c
        join customer_point_balances b on b.customer_id = c.id
        where c.id = $1
      `,
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    sendError(res, error);
  }
});

customersRouter.post("/", async (req, res) => {
  try {
    const body = createCustomerSchema.parse(req.body);
    const result = await query(
      `
        insert into customers (name, phone, email)
        values ($1, $2, $3)
        returning id, name, phone, email, created_at
      `,
      [body.name, body.phone, body.email ?? null]
    );

    res.status(201).json({ ...result.rows[0], balance: 0 });
  } catch (error) {
    sendError(res, error);
  }
});

customersRouter.get("/:id/transactions", async (req, res) => {
  try {
    const result = await query(
      `
        select id, type, points, purchase_amount, redemption_value, note, created_at
        from point_transactions
        where customer_id = $1
        order by created_at desc
        limit 100
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    sendError(res, error);
  }
});

