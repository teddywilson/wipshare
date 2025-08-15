// Email template styles and components for consistent branding
export const emailStyles = `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #fafafa;
    }
    
    .email-wrapper {
      background-color: #fafafa;
      padding: 40px 20px;
    }
    
    .email-container {
      max-width: 560px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    
    .email-header {
      background: linear-gradient(135deg, #0a0a0a 0%, #2a2a2a 100%);
      padding: 32px;
      text-align: center;
    }
    
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: white;
      letter-spacing: -0.5px;
    }
    
    .tagline {
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      margin-top: 8px;
      font-weight: 400;
    }
    
    .email-content {
      padding: 40px 32px;
    }
    
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #0a0a0a;
      margin-bottom: 16px;
      letter-spacing: -0.3px;
    }
    
    h2 {
      font-size: 20px;
      font-weight: 600;
      color: #0a0a0a;
      margin-bottom: 12px;
      letter-spacing: -0.2px;
    }
    
    p {
      font-size: 16px;
      color: #4a4a4a;
      margin-bottom: 16px;
      line-height: 1.6;
    }
    
    ul {
      margin: 20px 0;
      padding-left: 24px;
    }
    
    li {
      font-size: 15px;
      color: #4a4a4a;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    
    .highlight {
      font-weight: 600;
      color: #0a0a0a;
    }
    
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: #0a0a0a;
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      font-size: 16px;
      transition: background 0.2s;
    }
    
    .button:hover {
      background: #2a2a2a;
    }
    
    .button-secondary {
      display: inline-block;
      padding: 12px 24px;
      background: transparent;
      color: #0a0a0a !important;
      text-decoration: none;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      font-weight: 500;
      font-size: 14px;
    }
    
    .role-badge {
      display: inline-block;
      padding: 6px 12px;
      background: #f5f5f5;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #0a0a0a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .role-badge.owner {
      background: #fee;
      color: #c00;
    }
    
    .role-badge.editor {
      background: #fef4e6;
      color: #b86800;
    }
    
    .role-badge.viewer {
      background: #f0f7ff;
      color: #0066cc;
    }
    
    .info-box {
      background: #f8f8f8;
      border-radius: 8px;
      padding: 16px;
      margin: 24px 0;
      border-left: 3px solid #0a0a0a;
    }
    
    .info-box p {
      font-size: 14px;
      color: #666;
      margin: 0;
    }
    
    .divider {
      height: 1px;
      background: #f0f0f0;
      margin: 32px 0;
    }
    
    .email-footer {
      padding: 24px 32px;
      background: #fafafa;
      border-top: 1px solid #f0f0f0;
    }
    
    .footer-text {
      font-size: 13px;
      color: #999;
      text-align: center;
      margin-bottom: 8px;
    }
    
    .footer-links {
      text-align: center;
      margin-top: 16px;
    }
    
    .footer-link {
      color: #666 !important;
      text-decoration: none;
      font-size: 13px;
      margin: 0 12px;
    }
    
    .footer-link:hover {
      color: #0a0a0a !important;
    }
    
    .social-links {
      text-align: center;
      margin-top: 20px;
    }
    
    .social-link {
      display: inline-block;
      width: 32px;
      height: 32px;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 50%;
      margin: 0 6px;
      line-height: 32px;
      text-align: center;
      color: #666 !important;
      text-decoration: none;
    }
    
    @media only screen and (max-width: 600px) {
      .email-content {
        padding: 32px 24px;
      }
      
      .email-footer {
        padding: 20px 24px;
      }
      
      h1 {
        font-size: 22px;
      }
      
      .button {
        padding: 12px 28px;
        font-size: 15px;
      }
    }
  </style>
`;

export const emailHeader = (title?: string) => `
  <div class="email-header">
    <div class="logo">WipShare</div>
    ${title ? `<div class="tagline">${title}</div>` : '<div class="tagline">A quiet space for musical works in progress</div>'}
  </div>
`;

export const emailFooter = () => `
  <div class="email-footer">
    <div class="footer-links">
      <a href="https://wipshare.com" class="footer-link">Home</a>
      <a href="https://wipshare.com/dashboard" class="footer-link">Dashboard</a>
      <a href="https://wipshare.com/settings" class="footer-link">Settings</a>
    </div>
    <p class="footer-text">© ${new Date().getFullYear()} WipShare. All rights reserved.</p>
    <p class="footer-text">Made with care for musicians and creators.</p>
  </div>
`;

export const emailWrapper = (content: string, headerTitle?: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${emailStyles}
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-container">
          ${emailHeader(headerTitle)}
          <div class="email-content">
            ${content}
          </div>
          ${emailFooter()}
        </div>
      </div>
    </body>
  </html>
`;