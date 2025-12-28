import { resend, EMAIL_CONFIG, EmailTemplate, EmailStatus } from "./client";
import { supabaseServer } from "@/lib/supabase/serverClient";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  templateName?: EmailTemplate;
  templateData?: Record<string, any>;
  recipientUserId?: string;
  recipientName?: string;
  category?: string;
  replyTo?: string;
}

interface EmailLogData {
  recipient_email: string;
  recipient_name?: string;
  recipient_user_id?: string;
  subject: string;
  template_name: string;
  template_data?: Record<string, any>;
  status: EmailStatus;
  provider: string;
  provider_message_id?: string;
  sent_at?: Date;
  error_message?: string;
  metadata?: Record<string, any>;
}

/**
 * Send email using Resend and log to database
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  templateName = "system" as EmailTemplate,
  templateData = {},
  recipientUserId,
  recipientName,
  category = "transactional",
  replyTo,
}: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const supabase = supabaseServer;

    // Convert to array if single email
    const recipients = Array.isArray(to) ? to : [to];

    // Check if any recipient is unsubscribed
    for (const email of recipients) {
      const { data: unsubscribed } = await supabase.rpc("is_user_unsubscribed", {
        check_email: email,
        email_category: category,
      });

      if (unsubscribed) {
        console.log(`User ${email} is unsubscribed from ${category} emails`);
        
        // Log as skipped
        await logEmail({
          recipient_email: email,
          recipient_name: recipientName,
          recipient_user_id: recipientUserId,
          subject,
          template_name: templateName,
          template_data: templateData,
          status: "failed",
          provider: "resend",
          error_message: "User unsubscribed",
          metadata: { category, skipped: true },
        });

        return { success: false, error: "User unsubscribed" };
      }
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: recipients,
      subject,
      html,
      text: text || stripHtml(html),
      replyTo: replyTo || EMAIL_CONFIG.replyTo,
      tags: [
        { name: "template", value: templateName },
        { name: "category", value: category },
      ],
    });

    if (error) {
      console.error("Resend error:", error);

      // Log failed email
      for (const email of recipients) {
        await logEmail({
          recipient_email: email,
          recipient_name: recipientName,
          recipient_user_id: recipientUserId,
          subject,
          template_name: templateName,
          template_data: templateData,
          status: "failed",
          provider: "resend",
          error_message: error.message,
          metadata: { category },
        });
      }

      return { success: false, error: error.message };
    }

    // Log successful email
    for (const email of recipients) {
      await logEmail({
        recipient_email: email,
        recipient_name: recipientName,
        recipient_user_id: recipientUserId,
        subject,
        template_name: templateName,
        template_data: templateData,
        status: "sent",
        provider: "resend",
        provider_message_id: data?.id,
        sent_at: new Date(),
        metadata: { category },
      });
    }

    return { success: true, messageId: data?.id };
  } catch (error: any) {
    console.error("Email service error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Log email to database
 */
async function logEmail(logData: EmailLogData): Promise<void> {
  try {
    const supabase = supabaseServer;

    const { error } = await supabase.from("email_logs").insert({
      recipient_email: logData.recipient_email,
      recipient_name: logData.recipient_name,
      recipient_user_id: logData.recipient_user_id,
      subject: logData.subject,
      template_name: logData.template_name,
      template_data: logData.template_data || {},
      status: logData.status,
      provider: logData.provider,
      provider_message_id: logData.provider_message_id,
      sent_at: logData.sent_at?.toISOString(),
      error_message: logData.error_message,
      metadata: logData.metadata || {},
    });

    if (error) {
      console.error("Error logging email:", error);
    }
  } catch (error) {
    console.error("Email logging error:", error);
  }
}

/**
 * Update email status (for webhooks)
 */
export async function updateEmailStatus(
  providerMessageId: string,
  status: EmailStatus,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const supabase = supabaseServer;

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    } else if (status === "opened") {
      updateData.opened_at = new Date().toISOString();
    } else if (status === "clicked") {
      updateData.clicked_at = new Date().toISOString();
    }

    if (metadata) {
      updateData.metadata = metadata;
    }

    const { error } = await supabase
      .from("email_logs")
      .update(updateData)
      .eq("provider_message_id", providerMessageId);

    if (error) {
      console.error("Error updating email status:", error);
    }
  } catch (error) {
    console.error("Email status update error:", error);
  }
}

/**
 * Retry failed emails
 */
export async function retryFailedEmail(emailLogId: string): Promise<boolean> {
  try {
    const supabase = supabaseServer;

    // Get email log
    const { data: emailLog, error: fetchError } = await supabase
      .from("email_logs")
      .select("*")
      .eq("id", emailLogId)
      .single();

    if (fetchError || !emailLog) {
      console.error("Email log not found:", fetchError);
      return false;
    }

    // Check retry count
    if (emailLog.retry_count >= 3) {
      console.log("Max retry count reached for email:", emailLogId);
      return false;
    }

    // Get template
    const { data: template } = await supabase
      .from("email_templates")
      .select("*")
      .eq("name", emailLog.template_name)
      .single();

    if (!template) {
      console.error("Template not found:", emailLog.template_name);
      return false;
    }

    // Render template with data
    const html = renderTemplate(template.html_template, emailLog.template_data);
    const subject = renderTemplate(template.subject_template, emailLog.template_data);

    // Resend email
    const result = await sendEmail({
      to: emailLog.recipient_email,
      subject,
      html,
      templateName: emailLog.template_name as EmailTemplate,
      templateData: emailLog.template_data,
      recipientUserId: emailLog.recipient_user_id,
      recipientName: emailLog.recipient_name,
    });

    // Update retry count
    await supabase
      .from("email_logs")
      .update({ retry_count: emailLog.retry_count + 1 })
      .eq("id", emailLogId);

    return result.success;
  } catch (error) {
    console.error("Retry email error:", error);
    return false;
  }
}

/**
 * Render template with data
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template;

  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    rendered = rendered.replace(regex, String(value));
  }

  return rendered;
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, "")
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Get email statistics
 */
export async function getEmailStats(
  startDate?: Date,
  endDate?: Date
): Promise<any> {
  try {
    const supabase = supabaseServer;

    const { data, error } = await supabase.rpc("get_email_stats", {
      start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: endDate?.toISOString() || new Date().toISOString(),
    });

    if (error) {
      console.error("Error fetching email stats:", error);
      return null;
    }

    return data[0] || null;
  } catch (error) {
    console.error("Email stats error:", error);
    return null;
  }
}
