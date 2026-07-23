/* global process */
import { queueEmail } from "../server/email-sender.js";

const fail = (status, message) => Object.assign(new Error(message), { status });
const appUrl = () => (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = () => process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const referencePattern = /^LDCU-[A-Z0-9]+-[A-Z0-9]+$/;
const eventRules = {
  verified: { roles: ["admin", "super_admin"], status: "verified", title: "Feedback Verified" },
  rejected: { roles: ["admin", "super_admin"], status: "rejected", title: "Feedback Update" },
  in_progress: { roles: ["department"], status: "in_progress", title: "Feedback In Progress" },
  resolved: { roles: ["department"], status: "resolved", title: "Feedback Resolved" },
  status_changed: { roles: ["admin", "super_admin", "department"], title: "Feedback Status Updated" },
};
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

async function supabaseGet(path, authorization) {
  const response = await fetch(`${appUrl()}${path}`, { headers: { apikey: anonKey(), Authorization: authorization } });
  if (!response.ok) throw fail(403, "You are not authorized to send this notification.");
  return response.json();
}

function notificationHtml(complaint, title) {
  const remarks = complaint.resolution_details || complaint.department_remarks || complaint.admin_remarks || "No additional remarks were provided.";
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#333"><h2 style="color:#800020">${escapeHtml(title)}</h2><p>The status of your Liceo Cares feedback has been updated.</p><p><strong>Reference:</strong> ${escapeHtml(complaint.reference_number)}</p><p><strong>Status:</strong> ${escapeHtml(complaint.status).replace(/_/g, " ")}</p><p><strong>Remarks:</strong><br>${escapeHtml(remarks).slice(0, 2000)}</p><p>Please use your reference number to track further updates.</p></body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    if (!appUrl() || !anonKey()) throw fail(500, "Supabase server configuration is missing.");
    if (JSON.stringify(req.body || {}).length > 1000) throw fail(413, "Request is too large.");
    const { event, referenceNumber } = req.body || {};
    const rule = eventRules[event];
    const authorization = req.headers.authorization;
    if (!rule || typeof referenceNumber !== "string" || !referencePattern.test(referenceNumber) || !authorization?.startsWith("Bearer ")) throw fail(400, "Invalid notification request.");

    const userResponse = await fetch(`${appUrl()}/auth/v1/user`, { headers: { apikey: anonKey(), Authorization: authorization } });
    if (!userResponse.ok) throw fail(401, "Your session is no longer valid.");
    const user = await userResponse.json();
    const [profile] = await supabaseGet(`/rest/v1/users?select=role,department&id=eq.${encodeURIComponent(user.id)}`, authorization);
    if (!profile || !rule.roles.includes(profile.role)) throw fail(403, "Your role cannot send this notification.");

    const select = "id,email,reference_number,status,assigned_to,assigned_department,admin_remarks,department_remarks,resolution_details";
    const [complaint] = await supabaseGet(`/rest/v1/complaints?select=${select}&reference_number=eq.${encodeURIComponent(referenceNumber)}`, authorization);
    if (!complaint?.email) throw fail(404, "This ticket has no notification recipient.");
    if (rule.status && complaint.status !== rule.status) throw fail(409, "The ticket state does not match this notification.");
    if (profile.role === "department" && (complaint.assigned_to !== user.id || complaint.assigned_department !== profile.department)) throw fail(403, "This ticket is not assigned to your department account.");

    const subject = `[Liceo Cares] ${rule.title} - ${complaint.reference_number}`;
    const idempotencyKey = `admin-liceo-cares:${complaint.id}:${event}:${complaint.status}`;
    const queued = await queueEmail({ to: complaint.email, subject, html: notificationHtml(complaint, rule.title), idempotencyKey, tags: { app: "admin-liceo-cares", event, reference: complaint.reference_number } });
    return res.status(202).json({ success: true, id: queued.id, status: queued.status });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "Unable to queue email." });
  }
}
