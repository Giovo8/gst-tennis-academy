import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder_key_for_build");

// POST /api/admin/send-email - Send bulk emails
export async function POST(req: NextRequest) {
  try {
    // Get auth token from cookie
    const authCookie = req.cookies.get("sb-access-token")?.value || 
                       req.cookies.get("sb-localhost-auth-token")?.value;
    
    if (!authCookie) {
      return NextResponse.json({ error: "Non autorizzato - sessione mancante" }, { status: 401 });
    }

    // Create supabase client with user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${authCookie}`
          }
        }
      }
    );

    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "gestore")) {
      return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
    }

    const body = await req.json();
    const { subject, message, send_to_all, role, emails } = body;

    if (!subject || !message) {
      return NextResponse.json({ error: "Oggetto e messaggio sono obbligatori" }, { status: 400 });
    }

    // Get recipients based on selection
    let recipients: { id: string; email: string; full_name: string }[] = [];

    if (send_to_all) {
      // Get all users
      const { data: users, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .not("email", "is", null);

      if (error) throw error;
      recipients = users || [];
    } else if (role) {
      // Get users by role
      const { data: users, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("role", role)
        .not("email", "is", null);

      if (error) throw error;
      recipients = users || [];
    } else if (emails && emails.length > 0) {
      // Use custom email list
      recipients = emails.map((email: string) => ({
        id: "custom",
        email,
        full_name: email,
      }));
    } else {
      return NextResponse.json({ error: "Specificare i destinatari" }, { status: 400 });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "Nessun destinatario trovato" }, { status: 400 });
    }

    // Check for unsubscribed users
    const { data: unsubscribed } = await supabase
      .from("email_unsubscribes")
      .select("email");

    const unsubscribedEmails = new Set(unsubscribed?.map((u) => u.email) || []);
    const filteredRecipients = recipients.filter((r) => !unsubscribedEmails.has(r.email));

    // Send emails (batch of 100 at a time for Resend limits)
    const batchSize = 100;
    let sentCount = 0;
    const errors: any[] = [];

    for (let i = 0; i < filteredRecipients.length; i += batchSize) {
      const batch = filteredRecipients.slice(i, i + batchSize);

      const emailPromises = batch.map(async (recipient) => {
        try {
          const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://gst-tennis-academy.vercel.app/images/logo-tennis.png" alt="GST Tennis Academy" style="width: 60px; height: 60px;">
                <h1 style="color: #021627; margin-top: 10px;">GST Tennis Academy</h1>
              </div>
              
              <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
                <h2 style="color: #021627; margin-bottom: 20px;">${subject}</h2>
                <div style="color: #333; line-height: 1.6; white-space: pre-wrap;">${message}</div>
              </div>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="color: #666; font-size: 12px; margin-bottom: 10px;">
                  Hai ricevuto questa email perché sei registrato su GST Tennis Academy
                </p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/email/unsubscribe?email=${encodeURIComponent(recipient.email)}" 
                   style="color: #666; font-size: 12px; text-decoration: underline;">
                  Annulla iscrizione
                </a>
              </div>
            </div>
          `;

          const { data, error } = await resend.emails.send({
            from: "GST Tennis Academy <noreply@gst-tennis.com>",
            to: recipient.email,
            subject: subject,
            html: emailContent,
          });

          if (error) throw error;

          // Log email
          await supabase.from("email_logs").insert({
            recipient_email: recipient.email,
            subject: subject,
            template_name: "marketing",
            status: "sent",
            provider_id: data?.id,
          });

          sentCount++;
        } catch (error: any) {
          console.error(`Error sending to ${recipient.email}:`, error);
          errors.push({ email: recipient.email, error: error.message });

          // Log failed email
          await supabase.from("email_logs").insert({
            recipient_email: recipient.email,
            subject: subject,
            template_name: "marketing",
            status: "failed",
            error_message: error.message,
          });
        }
      });

      await Promise.all(emailPromises);
    }

    return NextResponse.json({
      success: true,
      sent_count: sentCount,
      failed_count: errors.length,
      total_recipients: filteredRecipients.length,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    console.error("Error in send-email:", error);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
