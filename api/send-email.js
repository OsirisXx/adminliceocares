/* global process */
import { queueEmail } from "../server/email-sender.js";

const fail = (status, message) => Object.assign(new Error(message), { status });
const appUrl = () => (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = () => process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function supabaseGet(path, authorization) {
  const response = await fetch(`${appUrl()}${path}`, { headers: { apikey: anonKey(), Authorization: authorization } });
  if (!response.ok) throw fail(403, "You are not authorized to send this notification.");
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { to, subject, html, referenceNumber } = req.body || {};
    const authorization = req.headers.authorization;
    const idempotencyKey = req.headers["idempotency-key"];
    if (!appUrl() || !anonKey()) throw fail(500, "Supabase server configuration is missing.");
    if (!authorization?.startsWith("Bearer ") || typeof to !== "string" || typeof subject !== "string" || typeof html !== "string" || typeof referenceNumber !== "string" || !idempotencyKey || idempotencyKey.length > 160) throw fail(400, "Invalid email request.");
    const userResponse = await fetch(`${appUrl()}/auth/v1/user`, { headers: { apikey: anonKey(), Authorization: authorization } });
    if (!userResponse.ok) throw fail(401, "Your session is no longer valid.");
    const user = await userResponse.json();
    const [profile] = await supabaseGet(`/rest/v1/users?select=role,department&id=eq.${encodeURIComponent(user.id)}`, authorization);
    if (!profile || !["admin", "super_admin", "department"].includes(profile.role)) throw fail(403, "Only authorized staff can queue ticket notifications.");
    const [complaint] = await supabaseGet(`/rest/v1/complaints?select=email,assigned_to,assigned_department&reference_number=eq.${encodeURIComponent(referenceNumber)}`, authorization);
    if (!complaint?.email || complaint.email.toLowerCase() !== to.toLowerCase()) throw fail(403, "The notification recipient does not match this ticket.");
    if (profile.role === "department" && complaint.assigned_to !== user.id) throw fail(403, "This ticket is not assigned to you.");
    const queued = await queueEmail({ to, subject, html, idempotencyKey, tags: { app: "admin-liceo-cares", event: "ticket-notification", reference: referenceNumber } });
    return res.status(202).json({ success: true, id: queued.id, status: queued.status });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "Unable to queue email." });
  }
}
