/**
 * Base Email Layout for GST Tennis Academy
 * Responsive HTML template with tennis branding
 */

interface BaseLayoutProps {
  preheader?: string;
  content: string;
}

export function baseEmailLayout({ preheader, content }: BaseLayoutProps): string {
  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>GST Tennis Academy</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333333;
      line-height: 1.6;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f5f5f5;
      padding: 20px 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .email-header {
      background: linear-gradient(135deg, #056c94 0%, #39c3f9 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .email-logo {
      font-size: 28px;
      font-weight: bold;
      color: #ffffff;
      margin: 0;
    }
    .email-tagline {
      color: #cef0fd;
      font-size: 14px;
      margin: 5px 0 0 0;
    }
    .email-content {
      padding: 40px 30px;
    }
    .email-footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #0690c6;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #056c94;
    }
    .info-box {
      background-color: #e6f7fe;
      border-left: 4px solid #39c3f9;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .success-box {
      background-color: #d1fae5;
      border-left: 4px solid #10b981;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    h1 {
      color: #1e293b;
      font-size: 24px;
      margin: 0 0 20px 0;
    }
    h2 {
      color: #334155;
      font-size: 20px;
      margin: 30px 0 15px 0;
    }
    p {
      margin: 0 0 15px 0;
      color: #475569;
    }
    .tennis-icon {
      font-size: 48px;
      margin: 20px 0;
    }
    .footer-links {
      margin: 15px 0;
    }
    .footer-links a {
      color: #0690c6;
      text-decoration: none;
      margin: 0 10px;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-links a {
      display: inline-block;
      margin: 0 8px;
      color: #64748b;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 30px 0;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        border-radius: 0;
      }
      .email-content {
        padding: 30px 20px;
      }
      .email-footer {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;max-height:0px;overflow:hidden;">${preheader}</div>` : ""}
  
  <div class="email-wrapper">
    <div class="email-container">
      <!-- Header -->
      <div class="email-header">
        <h1 class="email-logo">🎾 GST TENNIS ACADEMY</h1>
        <p class="email-tagline">Eccellenza nel Tennis dal 1995</p>
      </div>
      
      <!-- Content -->
      <div class="email-content">
        ${content}
      </div>
      
      <!-- Footer -->
      <div class="email-footer">
        <div class="footer-links">
          <a href="{{site_url}}">Homepage</a> •
          <a href="{{site_url}}/tornei">Tornei</a> •
          <a href="{{site_url}}/courses">Corsi</a> •
          <a href="{{site_url}}/news">News</a>
        </div>
        
        <div class="social-links">
          <a href="https://facebook.com/gst-tennis">Facebook</a>
          <a href="https://instagram.com/gst-tennis">Instagram</a>
          <a href="https://youtube.com/gst-tennis">YouTube</a>
        </div>
        
        <div class="divider"></div>
        
        <p style="font-size: 12px; color: #94a3b8; margin: 10px 0;">
          <strong>GST Tennis Academy</strong><br>
          Via Tennis, 123 - 00100 Roma, Italia<br>
          Tel: +39 06 1234567 | Email: info@gst-tennis.it
        </p>
        
        <p style="font-size: 11px; color: #cbd5e1; margin: 15px 0 0 0;">
          Hai ricevuto questa email perché sei registrato su GST Tennis Academy.<br>
          <a href="{{unsubscribe_url}}" style="color: #94a3b8;">Annulla iscrizione</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version from HTML
 */
export function generatePlainText(content: string): string {
  return content
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
