/* global process */
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { queueEmail } from "./email-sender.js";

dotenv.config();
const app = express();
const port = Number(process.env.PORT || 3002);
const origin = process.env.DEV_APP_ORIGIN || "https://localhost:5175";
app.use(cors({ origin }));
app.use(express.json());

app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, html, referenceNumber } = req.body || {};
    const idempotencyKey = req.get("Idempotency-Key");
    if (typeof to !== "string" || typeof subject !== "string" || typeof html !== "string" || typeof referenceNumber !== "string" || !idempotencyKey) return res.status(400).json({ error: "Invalid email request." });
    const queued = await queueEmail({ to, subject, html, idempotencyKey, tags: { app: "admin-liceo-cares", event: "ticket-notification", reference: referenceNumber, environment: "development" } });
    return res.status(202).json({ success: true, id: queued.id, status: queued.status });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "Unable to queue email." });
  }
});

app.listen(port, () => console.log(`Email queue adapter listening on http://localhost:${port}`));
