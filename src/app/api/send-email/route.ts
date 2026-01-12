import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { logActivityServer } from "@/lib/activity/logActivity";

// Initialize Resend for email sending
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignName,
      subject,
      message,
      recipientEmails,
      recipientType,
      recipientRole,
      template,
      userId
    } = body;

    // Validate required fields
    if (!campaignName || !subject || !message || !recipientEmails || recipientEmails.length === 0) {
      return NextResponse.json(
        { error: "Campi obbligatori mancanti" },
        { status: 400 }
      );
    }

    // Verify API key is loaded
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY not found in environment variables");
      return NextResponse.json(
        { error: "Configurazione email non trovata. Controlla le variabili d'ambiente." },
        { status: 500 }
      );
    }

    // Send emails using Resend
    console.log("Sending email campaign:", {
      campaignName,
      subject,
      recipientCount: recipientEmails.length,
      apiKeyPresent: !!process.env.RESEND_API_KEY,
    });

    // Determine the from address
    const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    // Send emails to all recipients
    const emailPromises = recipientEmails.map(async (email: string) => {
      try {
        const result = await resend.emails.send({
          from: fromAddress,
          to: email,
          subject: subject,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #08b3f7 0%, #034863 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0;">GST Tennis Academy</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                  ${message.replace(/\n/g, "<br>")}
                </div>
                <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                  <p>© 2026 GST Tennis Academy. Tutti i diritti riservati.</p>
                </div>
              </body>
            </html>
          `,
        });
        console.log(`✅ Email sent successfully to ${email}`, result);
        return { email, status: "sent", result };
      } catch (error: any) {
        console.error(`❌ Failed to send email to ${email}:`, error);
        return { email, status: "failed", error: error?.message || String(error) };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.status === "sent").length;
    const failedCount = results.filter(r => r.status === "failed").length;

    console.log(`📊 Email campaign results: ${successCount} sent, ${failedCount} failed`);

    // Log any failures with details
    if (failedCount > 0) {
      const failures = results.filter(r => r.status === "failed");
      console.error("❌ Failed emails details:", JSON.stringify(failures, null, 2));
    }

    // If all emails failed, return error with details
    if (successCount === 0 && failedCount > 0) {
      const firstError = results.find(r => r.status === "failed")?.error;
      return NextResponse.json(
        {
          error: `Invio fallito: ${firstError || "Errore sconosciuto"}`,
          details: results.slice(0, 5) // First 5 failures
        },
        { status: 500 }
      );
    }

    // Save campaign to database
    const { data: campaign, error: dbError } = await supabaseAdmin
      .from("email_campaigns")
      .insert({
        name: campaignName,
        subject,
        content: message,
        template,
        recipient_type: recipientType,
        recipient_role: recipientRole,
        recipient_count: recipientEmails.length,
        recipient_emails: recipientEmails,
        sent_by: userId,
        status: "sent",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Errore nel salvataggio della campagna" },
        { status: 500 }
      );
    }

    // Log activity
    if (userId) {
      await logActivityServer({
        userId,
        action: "email.campaign.create",
        entityType: "email_campaign",
        entityId: campaign.id,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        metadata: {
          campaignName,
          recipientCount: recipientEmails.length,
          successCount,
          failedCount,
          recipientType,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: failedCount > 0
        ? `Email inviata a ${successCount} destinatari (${failedCount} fallite)`
        : `Email inviata con successo a ${successCount} destinatari`,
      campaignId: campaign.id,
      stats: {
        total: recipientEmails.length,
        sent: successCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Errore nell'invio dell'email" },
      { status: 500 }
    );
  }
}
