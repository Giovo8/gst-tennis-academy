import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    if (!resend) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 503 }
      );
    }

    const { to, name, title, message, link } = await request.json();

    if (!to || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #021627 0%, #0a2540 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                🎾 GST Tennis Academy
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 30px;">
              <h2 style="margin: 0 0 16px; color: #1d1d1f; font-size: 20px; font-weight: 600;">
                ${title}
              </h2>
              <p style="margin: 0; color: #424245; font-size: 15px; line-height: 1.6;">
                Ciao ${name || ""},
              </p>
              <p style="margin: 16px 0 0; color: #424245; font-size: 15px; line-height: 1.6;">
                ${message}
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          ${link ? `
          <tr>
            <td style="padding: 0 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}${link}" 
                       style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);">
                      Visualizza Dettagli
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 32px 40px; border-top: 1px solid #e5e5e7;">
              <p style="margin: 0 0 12px; color: #86868b; font-size: 13px; line-height: 1.5; text-align: center;">
                Questa email è stata inviata da GST Tennis Academy
              </p>
              <p style="margin: 0; color: #86868b; font-size: 13px; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" style="color: #06b6d4; text-decoration: none;">
                  Gestisci preferenze notifiche
                </a>
              </p>
            </td>
          </tr>

        </table>

        <!-- Footer Text -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
          <tr>
            <td style="text-align: center; color: #86868b; font-size: 12px; line-height: 1.5;">
              © ${new Date().getFullYear()} GST Tennis Academy. Tutti i diritti riservati.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const { data, error } = await resend.emails.send({
      from: "GST Tennis Academy <noreply@gsttennisacademy.com>",
      to,
      subject: `🔔 ${title}`,
      html: htmlContent,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
