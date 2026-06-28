// Resend Email Service for Liceo Cares Ticketing System
// Uses Resend API to send email notifications

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const FROM_EMAIL = "Liceo Cares <noreply@raijintech.dev>";

// Liceo de Cagayan University Colors
const COLORS = {
  maroon: "#800020",
  gold: "#FFD700",
  lightMaroon: "#A0334D",
  darkGold: "#D4AF37",
};

/**
 * Generate HTML email template with Liceo branding
 */
const generateEmailTemplate = ({ title, greeting, content, footer }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${COLORS.maroon} 0%, ${COLORS.lightMaroon} 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: ${COLORS.gold}; font-size: 28px; font-weight: bold;">
                🎓 Liceo Cares
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Liceo de Cagayan University Feedback Management System
              </p>
            </td>
          </tr>
          
          <!-- Title Banner -->
          <tr>
            <td style="background-color: ${COLORS.gold}; padding: 15px 40px; text-align: center;">
              <h2 style="margin: 0; color: ${COLORS.maroon}; font-size: 18px; font-weight: 600;">
                ${title}
              </h2>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                ${greeting}
              </p>
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 25px 40px; border-top: 1px solid #eee;">
              ${footer || `
                <p style="margin: 0; color: #666; font-size: 13px; text-align: center;">
                  This is an automated message from Liceo Cares Feedback Management System.<br>
                  Please do not reply to this email.
                </p>
                <p style="margin: 15px 0 0 0; color: #999; font-size: 12px; text-align: center;">
                  © ${new Date().getFullYear()} Liceo de Cagayan University. All rights reserved.
                </p>
              `}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Generate ticket reference box HTML
 */
const ticketReferenceBox = (referenceNumber) => `
  <div style="background: linear-gradient(135deg, ${COLORS.maroon} 0%, ${COLORS.lightMaroon} 100%); border-radius: 10px; padding: 20px; text-align: center; margin: 25px 0;">
    <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.8); font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
      Tracking Number
    </p>
    <p style="margin: 0; color: ${COLORS.gold}; font-size: 24px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 2px;">
      ${referenceNumber}
    </p>
  </div>
`;

/**
 * Generate status badge HTML
 */
const statusBadge = (status, label) => {
  const statusColors = {
    submitted: { bg: "#e3f2fd", text: "#1976d2" },
    verified: { bg: "#e8f5e9", text: "#388e3c" },
    rejected: { bg: "#ffebee", text: "#d32f2f" },
    in_progress: { bg: "#fff3e0", text: "#f57c00" },
    resolved: { bg: "#e8f5e9", text: "#2e7d32" },
  };
  const colors = statusColors[status] || statusColors.submitted;
  return `
    <span style="display: inline-block; background-color: ${colors.bg}; color: ${colors.text}; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
      ${label}
    </span>
  `;
};

/**
 * Send email - uses /api/send-email endpoint
 * In development: Vite proxies to local dev server (localhost:3001)
 * In production: Vercel serverless function handles the request
 */
export const sendEmail = async ({ to, subject, html }) => {
  if (!to) {
    console.log("No recipient email provided, skipping email notification");
    return { success: false, error: "No recipient email" };
  }

  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        subject,
        html,
      }),
    });

    // Check if response has content before parsing JSON
    const text = await response.text();
    if (!text) {
      console.error("Empty response from email API");
      return { success: false, error: "Empty response from server" };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse response:", text);
      return { success: false, error: "Invalid response from server" };
    }

    if (!response.ok) {
      console.error("Email API error:", data);
      return { success: false, error: data.error || "Failed to send email" };
    }

    console.log("Email sent successfully:", data.id);
    return { success: true, id: data.id };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send ticket confirmation email
 */
export const sendTicketConfirmationEmail = async ({
  to,
  referenceNumber,
  category,
  description,
}) => {
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  const truncatedDesc =
    description.length > 200
      ? description.substring(0, 200) + "..."
      : description;

  const html = generateEmailTemplate({
    title: "Feedback Submitted Successfully",
    greeting: "Thank you for submitting your feedback to Liceo Cares.",
    content: `
      <p style="margin: 0 0 15px 0; color: #555; font-size: 15px; line-height: 1.6;">
        We have received your feedback and it is now pending review by the VP Admin. 
        You will receive email updates as your feedback progresses through our system.
      </p>
      
      ${ticketReferenceBox(referenceNumber)}
      
      <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; color: #333; font-size: 14px;">
          <strong>Category:</strong> ${categoryLabel}
        </p>
        <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.5;">
          <strong>Description:</strong><br>
          ${truncatedDesc}
        </p>
      </div>
      
      <p style="margin: 20px 0 0 0; color: #555; font-size: 14px;">
        <strong>What happens next?</strong>
      </p>
      <ol style="margin: 10px 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.8;">
        <li>Your feedback will be reviewed by the VP Admin</li>
        <li>If verified, it will be assigned to the appropriate department</li>
        <li>The department will work on resolving your concern</li>
        <li>You'll receive updates at each step of the process</li>
      </ol>
      
      <p style="margin: 20px 0 0 0; color: #888; font-size: 13px; text-align: center;">
        Save your tracking number to check the status of your feedback anytime.
      </p>
    `,
  });

  return sendEmail({
    to,
    subject: `[Liceo Cares] Feedback Received - ${referenceNumber}`,
    html,
  });
};

/**
 * Send ticket verified (approved) email
 */
export const sendTicketVerifiedEmail = async ({
  to,
  referenceNumber,
  department,
  adminRemarks,
}) => {
  const html = generateEmailTemplate({
    title: "Feedback Verified & Assigned",
    greeting: "Good news! Your feedback has been verified.",
    content: `
      <p style="margin: 0 0 15px 0; color: #555; font-size: 15px; line-height: 1.6;">
        The VP Admin has reviewed and verified your feedback. It has now been 
        forwarded to the appropriate department for action.
      </p>
      
      ${ticketReferenceBox(referenceNumber)}
      
      <div style="text-align: center; margin: 20px 0;">
        ${statusBadge("verified", "✓ Verified")}
      </div>
      
      <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; color: #333; font-size: 14px;">
          <strong>Assigned Department:</strong> ${department}
        </p>
        ${adminRemarks
        ? `
          <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
            <strong>Admin Remarks:</strong><br>
            ${adminRemarks}
          </p>
        `
        : ""
      }
      </div>
      
      <p style="margin: 20px 0 0 0; color: #555; font-size: 14px;">
        The assigned department will now review your feedback and begin working 
        on a resolution. You will receive another update when they start processing 
        your concern.
      </p>
    `,
  });

  return sendEmail({
    to,
    subject: `[Liceo Cares] Feedback Verified - ${referenceNumber}`,
    html,
  });
};

/**
 * Send ticket rejected email
 */
export const sendTicketRejectedEmail = async ({
  to,
  referenceNumber,
  reason,
}) => {
  const html = generateEmailTemplate({
    title: "Feedback Could Not Be Processed",
    greeting: "Thank you for reaching out to Liceo Cares.",
    content: `
      <p style="margin: 0 0 15px 0; color: #555; font-size: 15px; line-height: 1.6;">
        After careful review, we regret to inform you that your feedback could not 
        be processed at this time.
      </p>
      
      ${ticketReferenceBox(referenceNumber)}
      
      <div style="text-align: center; margin: 20px 0;">
        ${statusBadge("rejected", "✗ Not Processed")}
      </div>
      
      <div style="background-color: #fff5f5; border-left: 4px solid #d32f2f; padding: 15px 20px; margin: 20px 0;">
        <p style="margin: 0; color: #333; font-size: 14px;">
          <strong>Reason:</strong><br>
          ${reason}
        </p>
      </div>
      
      <p style="margin: 20px 0 0 0; color: #555; font-size: 14px;">
        If you believe this decision was made in error, or if you have additional 
        information to support your feedback, you are welcome to submit a new 
        feedback with more details.
      </p>
      
      <p style="margin: 15px 0 0 0; color: #888; font-size: 13px;">
        We appreciate your understanding and thank you for helping us improve 
        Liceo de Cagayan University.
      </p>
    `,
  });

  return sendEmail({
    to,
    subject: `[Liceo Cares] Feedback Update - ${referenceNumber}`,
    html,
  });
};

/**
 * Send ticket in progress email
 */
export const sendTicketInProgressEmail = async ({
  to,
  referenceNumber,
  department,
  remarks,
}) => {
  const html = generateEmailTemplate({
    title: "Work Has Started on Your Feedback",
    greeting: "Your feedback is now being actively addressed.",
    content: `
      <p style="margin: 0 0 15px 0; color: #555; font-size: 15px; line-height: 1.6;">
        The ${department} department has started working on your feedback. 
        Our team is actively reviewing the situation and working toward a resolution.
      </p>
      
      ${ticketReferenceBox(referenceNumber)}
      
      <div style="text-align: center; margin: 20px 0;">
        ${statusBadge("in_progress", "⏳ In Progress")}
      </div>
      
      ${remarks
        ? `
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            <strong>Department Notes:</strong><br>
            ${remarks}
          </p>
        </div>
      `
        : ""
      }
      
      <p style="margin: 20px 0 0 0; color: #555; font-size: 14px;">
        We will notify you once your feedback has been resolved. Thank you for 
        your patience as we work to address your concern.
      </p>
    `,
  });

  return sendEmail({
    to,
    subject: `[Liceo Cares] Feedback In Progress - ${referenceNumber}`,
    html,
  });
};

/**
 * Get status color for email badge
 */
const getStatusColor = (status) => {
  const statusLower = status.toLowerCase();
  const colors = {
    submitted: { bg: "#DBEAFE", text: "#1E40AF", border: "#3B82F6" },
    pending: { bg: "#DBEAFE", text: "#1E40AF", border: "#3B82F6" },
    verified: { bg: "#FEF3C7", text: "#92400E", border: "#F59E0B" },
    in_progress: { bg: "#FFEDD5", text: "#C2410C", border: "#F97316" },
    "in progress": { bg: "#FFEDD5", text: "#C2410C", border: "#F97316" },
    backlog: { bg: "#EDE9FE", text: "#6B21A8", border: "#8B5CF6" },
    resolved: { bg: "#DCFCE7", text: "#166534", border: "#22C55E" },
    closed: { bg: "#F3F4F6", text: "#374151", border: "#6B7280" },
    disputed: { bg: "#FEF3C7", text: "#92400E", border: "#F59E0B" },
    rejected: { bg: "#FEE2E2", text: "#991B1B", border: "#EF4444" },
  };
  return colors[statusLower] || colors.submitted;
};

/**
 * Generate status badge HTML for emails
 */
const emailStatusBadge = (status) => {
  const colors = getStatusColor(status);
  return `
    <span style="display: inline-block; background-color: ${colors.bg}; color: ${colors.text}; border: 2px solid ${colors.border}; padding: 8px 20px; border-radius: 25px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
      ${status}
    </span>
  `;
};

/**
 * Send ticket status changed email (admin override)
 */
export const sendTicketStatusChangedEmail = async ({
  to,
  referenceNumber,
  oldStatus,
  newStatus,
  remarks,
}) => {
  const html = generateEmailTemplate({
    title: "Feedback Status Updated",
    greeting: "Your feedback status has been updated.",
    content: `
      <p style="margin: 0 0 15px 0; color: #555; font-size: 15px; line-height: 1.6;">
        The status of your feedback has been changed.
      </p>
      
      ${ticketReferenceBox(referenceNumber)}
      
      <div style="background-color: #f9f9f9; border-radius: 12px; padding: 25px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 15px 0; color: #666; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
          Status Changed From
        </p>
        <div style="margin-bottom: 20px;">
          ${emailStatusBadge(oldStatus)}
        </div>
        
        <div style="margin: 15px 0;">
          <span style="display: inline-block; color: #999; font-size: 24px;">↓</span>
        </div>
        
        <p style="margin: 15px 0 15px 0; color: #666; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
          New Status
        </p>
        <div style="margin-bottom: 10px;">
          ${emailStatusBadge(newStatus)}
        </div>
      </div>
      
      ${remarks ? `
        <div style="background-color: #FFF7ED; border-left: 4px solid ${COLORS.gold}; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0 0 5px 0; color: #92400E; font-size: 13px; font-weight: 600; text-transform: uppercase;">
            Remarks
          </p>
          <p style="margin: 0; color: #78350F; font-size: 14px; line-height: 1.6;">
            ${remarks}
          </p>
        </div>
      ` : ""}
      
      <p style="margin: 20px 0 0 0; color: #555; font-size: 14px;">
        If you have any questions about this status change, please contact the 
        administration office or track your feedback online.
      </p>
    `,
  });

  return sendEmail({
    to,
    subject: `[Liceo Cares] Status Updated to ${newStatus} - ${referenceNumber}`,
    html,
  });
};

/**
 * Send ticket resolved email with verification link
 */
export const sendTicketResolvedEmail = async ({
  to,
  referenceNumber,
  resolutionDetails,
  departmentRemarks,
}) => {
  const trackingUrl = `https://liceo-cares.vercel.app/track`;
  
  const html = generateEmailTemplate({
    title: "Your Feedback Has Been Resolved",
    greeting: "Great news! Your feedback has been successfully resolved.",
    content: `
      <p style="margin: 0 0 15px 0; color: #555; font-size: 15px; line-height: 1.6;">
        We're pleased to inform you that your feedback has been addressed and 
        resolved by our team.
      </p>
      
      ${ticketReferenceBox(referenceNumber)}
      
      <div style="text-align: center; margin: 20px 0;">
        ${statusBadge("resolved", "✓ Resolved")}
      </div>
      
      <div style="background-color: #e8f5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0; color: #333; font-size: 14px;">
          <strong>Resolution Details:</strong><br>
          ${resolutionDetails || "No details provided"}
        </p>
        ${departmentRemarks
        ? `
          <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">
            <strong>Additional Notes:</strong><br>
            ${departmentRemarks}
          </p>
        `
        : ""
      }
      </div>
      
      <div style="background-color: #fff3e0; border-left: 4px solid #f57c00; padding: 15px 20px; margin: 20px 0;">
        <p style="margin: 0; color: #333; font-size: 14px;">
          <strong>⏰ Action Required Within 7 Days</strong><br>
          Please verify if your issue was properly resolved. You can confirm the resolution 
          or dispute it if you believe the problem was not addressed. If no action is taken 
          within 7 days, the ticket will be automatically closed.
        </p>
      </div>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${trackingUrl}" style="display: inline-block; background: linear-gradient(135deg, ${COLORS.maroon} 0%, ${COLORS.lightMaroon} 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Verify Your Resolution
        </a>
        <p style="margin: 10px 0 0 0; color: #888; font-size: 12px;">
          Use your tracking number: <strong>${referenceNumber}</strong>
        </p>
      </div>
      
      <p style="margin: 20px 0 0 0; color: #555; font-size: 14px;">
        Thank you for bringing this matter to our attention. Your feedback helps 
        us improve our services and create a better environment for everyone at 
        Liceo de Cagayan University.
      </p>
      
      <div style="text-align: center; margin: 25px 0 0 0; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="margin: 0; color: ${COLORS.maroon}; font-size: 16px; font-weight: 600;">
          Thank you for using Liceo Cares!
        </p>
        <p style="margin: 8px 0 0 0; color: #888; font-size: 13px;">
          Together, we make Liceo a better place.
        </p>
      </div>
    `,
  });

  return sendEmail({
    to,
    subject: `[Liceo Cares] Feedback Resolved - Action Required - ${referenceNumber}`,
    html,
  });
};
