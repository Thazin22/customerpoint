import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { customersRouter } from "./routes/customers.js";
import { pointsRouter } from "./routes/points.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/customers", customersRouter);
app.use("/points", pointsRouter);

app.listen(port, () => {
  console.log(`Loyalty API listening on http://localhost:${port}`);
});

