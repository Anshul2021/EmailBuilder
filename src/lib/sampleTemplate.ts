export const SAMPLE_TEMPLATE = {
  html: `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Welcome to Mailforge</title>

  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #fff7ed;
      font-family: 'Plus Jakarta Sans', Arial, Helvetica, sans-serif;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    table {
      border-spacing: 0;
      border-collapse: collapse;
    }

    img {
      border: 0;
      display: block;
      width: 100%;
      height: auto;
      outline: none;
      text-decoration: none;
    }

    a {
      text-decoration: none;
    }

    .wrapper {
      width: 100%;
      background-color: #fff7ed;
      padding: 24px 12px;
    }

    .container {
      width: 100%;
      max-width: 620px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      overflow: hidden;
    }

    .px {
      padding-left: 32px;
      padding-right: 32px;
    }

    .button:hover {
      background-color: #c2410c !important;
    }

    @media only screen and (max-width: 600px) {
      .wrapper {
        padding: 16px 8px !important;
      }

      .px {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }

      .hero-title {
        font-size: 22px !important;
        line-height: 30px !important;
      }

      .body-text {
        font-size: 13px !important;
        line-height: 22px !important;
      }

      .two-col {
        display: block !important;
        width: 100% !important;
        padding-right: 0 !important;
        padding-left: 0 !important;
      }

      .stack-gap {
        height: 12px !important;
      }
    }
  </style>
</head>

<body>
  <!-- Preheader -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
    Your Mailforge workspace is ready. Start creating your first email template.
  </div>

  <table role="presentation" class="wrapper" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">

        <table role="presentation" class="container" width="100%" cellpadding="0" cellspacing="0">

          <!-- Header -->
          <tr>
            <td class="px" style="padding-top: 24px; padding-bottom: 20px; background-color:#ffffff; border-bottom:1px solid #ffedd5;">
              <table role="presentation" width="100%">
                <tr>
                  <td align="left">
                    <div style="font-size:18px; line-height:24px; font-weight:700; color:#111827; letter-spacing:-0.2px;">
                      Mailforge
                    </div>
                    <div style="font-size:12px; line-height:18px; color:#9a3412; font-weight:500; padding-top:2px;">
                      AI Email Template Builder
                    </div>
                  </td>

                  <td align="right">
                    <div style="display:inline-block; font-size:11px; line-height:16px; color:#c2410c; background-color:#fff7ed; border:1px solid #fed7aa; border-radius:6px; padding:6px 9px; font-weight:600;">
                      Workspace ready
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td class="px" style="padding-top: 34px; padding-bottom: 18px;">
              <h1 class="hero-title" style="margin:16px 0 0; font-size:28px; line-height:36px; color:#111827; font-weight:700; letter-spacing:-0.6px;">
                Your email workspace is ready.
              </h1>

              <p class="body-text" style="margin:12px 0 0; font-size:14px; line-height:24px; color:#4b5563; font-weight:400;">
                Hi {{first_name}}, welcome to Mailforge. You can now create clean, responsive email templates using simple prompts, brand inputs, and ready-made content blocks.
              </p>
            </td>
          </tr>

          <!-- Image Placeholder -->
          <tr>
            <td class="px" style="padding-top: 10px; padding-bottom: 26px;">
              <table role="presentation" width="100%" style="background-color:#fff7ed; border:1px solid #fed7aa; border-radius:8px;">
                <tr>
                  <td align="center" style="padding:18px;">
                    <img 
                      src="https://placehold.co/560x250/fff7ed/ea580c?text=Email+Template+Preview" 
                      width="560" 
                      alt="Email template preview" 
                      style="max-width:560px; border-radius:6px;"
                    />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main CTA -->
          <tr>
            <td class="px" style="padding-bottom: 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="#ea580c" style="border-radius:6px;">
                    <a href="{{dashboard_url}}" target="_blank" class="button" style="display:inline-block; background-color:#ea580c; color:#ffffff; font-size:13px; line-height:18px; font-weight:700; padding:12px 18px; border-radius:6px;">
                      Create first template
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:12px 0 0; font-size:12px; line-height:19px; color:#9ca3af;">
                Start from a prompt, then customize the layout, tone, and call-to-action.
              </p>
            </td>
          </tr>

          <!-- Section Divider -->
          <tr>
            <td class="px">
              <div style="height:1px; background-color:#f3f4f6;"></div>
            </td>
          </tr>

          <!-- Features -->
          <tr>
            <td class="px" style="padding-top: 28px; padding-bottom: 14px;">
              <h2 style="margin:0; font-size:17px; line-height:24px; color:#111827; font-weight:700; letter-spacing:-0.2px;">
                What you can do next
              </h2>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding-bottom: 28px;">
              <table role="presentation" width="100%">
                <tr>
                  <td class="two-col" width="50%" style="padding-right:7px; vertical-align:top;">
                    <table role="presentation" width="100%" style="border:1px solid #f3f4f6; border-radius:8px;">
                      <tr>
                        <td style="padding:16px;">
                          <div style="font-size:13px; line-height:20px; font-weight:700; color:#111827;">
                            Generate with prompts
                          </div>
                          <p style="margin:6px 0 0; font-size:12px; line-height:20px; color:#6b7280;">
                            Turn a short idea into a polished email draft.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td class="stack-gap" height="0" style="font-size:0; line-height:0;">&nbsp;</td>

                  <td class="two-col" width="50%" style="padding-left:7px; vertical-align:top;">
                    <table role="presentation" width="100%" style="border:1px solid #f3f4f6; border-radius:8px;">
                      <tr>
                        <td style="padding:16px;">
                          <div style="font-size:13px; line-height:20px; font-weight:700; color:#111827;">
                            Adjust brand style
                          </div>
                          <p style="margin:6px 0 0; font-size:12px; line-height:20px; color:#6b7280;">
                            Set colors, tone, CTA, and layout direction.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td height="14" style="font-size:0; line-height:0;">&nbsp;</td>
                </tr>

                <tr>
                  <td class="two-col" width="50%" style="padding-right:7px; vertical-align:top;">
                    <table role="presentation" width="100%" style="border:1px solid #f3f4f6; border-radius:8px;">
                      <tr>
                        <td style="padding:16px;">
                          <div style="font-size:13px; line-height:20px; font-weight:700; color:#111827;">
                            Edit each block
                          </div>
                          <p style="margin:6px 0 0; font-size:12px; line-height:20px; color:#6b7280;">
                            Refine hero, body copy, benefits, and footer.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td class="stack-gap" height="0" style="font-size:0; line-height:0;">&nbsp;</td>

                  <td class="two-col" width="50%" style="padding-left:7px; vertical-align:top;">
                    <table role="presentation" width="100%" style="border:1px solid #f3f4f6; border-radius:8px;">
                      <tr>
                        <td style="padding:16px;">
                          <div style="font-size:13px; line-height:20px; font-weight:700; color:#111827;">
                            Export HTML
                          </div>
                          <p style="margin:6px 0 0; font-size:12px; line-height:20px; color:#6b7280;">
                            Copy responsive email-ready HTML instantly.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- How it works -->
          <tr>
            <td class="px" style="background-color:#fafafa; padding-top:28px; padding-bottom:28px;">
              <h2 style="margin:0 0 14px; font-size:17px; line-height:24px; color:#111827; font-weight:700; letter-spacing:-0.2px;">
                Build your first email in 3 steps
              </h2>

              <table role="presentation" width="100%">
                <tr>
                  <td width="28" valign="top" style="padding-top:3px;">
                    <div style="width:22px; height:22px; border-radius:6px; background-color:#ea580c; color:#ffffff; font-size:11px; font-weight:700; line-height:22px; text-align:center;">1</div>
                  </td>
                  <td style="padding-bottom:14px;">
                    <div style="font-size:13px; line-height:20px; font-weight:700; color:#111827;">Choose a template goal</div>
                    <div style="font-size:12px; line-height:20px; color:#6b7280; padding-top:2px;">Welcome email, campaign, newsletter, launch, or follow-up.</div>
                  </td>
                </tr>

                <tr>
                  <td width="28" valign="top" style="padding-top:3px;">
                    <div style="width:22px; height:22px; border-radius:6px; background-color:#ffedd5; color:#c2410c; font-size:11px; font-weight:700; line-height:22px; text-align:center;">2</div>
                  </td>
                  <td style="padding-bottom:14px;">
                    <div style="font-size:13px; line-height:20px; font-weight:700; color:#111827;">Write a simple prompt</div>
                    <div style="font-size:12px; line-height:20px; color:#6b7280; padding-top:2px;">Add the audience, offer, product, tone, and desired CTA.</div>
                  </td>
                </tr>

                <tr>
                  <td width="28" valign="top" style="padding-top:3px;">
                    <div style="width:22px; height:22px; border-radius:6px; background-color:#111827; color:#ffffff; font-size:11px; font-weight:700; line-height:22px; text-align:center;">3</div>
                  </td>
                  <td>
                    <div style="font-size:13px; line-height:20px; font-weight:700; color:#111827;">Preview and export</div>
                    <div style="font-size:12px; line-height:20px; color:#6b7280; padding-top:2px;">Review the final design and copy production-ready HTML.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Secondary CTA -->
          <tr>
            <td class="px" style="padding-top: 28px; padding-bottom: 30px;">
              <table role="presentation" width="100%" style="background-color:#fff7ed; border:1px solid #fed7aa; border-radius:8px;">
                <tr>
                  <td align="left" style="padding:22px;">
                    <h2 style="margin:0; font-size:18px; line-height:26px; color:#111827; font-weight:700; letter-spacing:-0.2px;">
                      Start with a welcome email.
                    </h2>

                    <p style="margin:8px 0 16px; font-size:13px; line-height:22px; color:#6b7280;">
                      A welcome email is the fastest way to test your brand tone, layout style, and CTA structure.
                    </p>

                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" bgcolor="#ea580c" style="border-radius:6px;">
                          <a href="{{dashboard_url}}" target="_blank" style="display:inline-block; background-color:#ea580c; color:#ffffff; font-size:13px; line-height:18px; font-weight:700; padding:11px 16px; border-radius:6px;">
                            Open workspace
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#111827; padding:26px 32px;">
              <table role="presentation" width="100%">
                <tr>
                  <td align="center">
                    <div style="font-size:15px; line-height:22px; font-weight:700; color:#ffffff;">
                      Mailforge
                    </div>

                    <p style="margin:8px 0 0; font-size:12px; line-height:20px; color:#9ca3af;">
                      You are receiving this email because you created a Mailforge account.
                    </p>

                    <p style="margin:14px 0 0; font-size:12px; line-height:20px; color:#9ca3af;">
                      <a href="{{help_url}}" style="color:#fdba74; font-weight:600;">Help Center</a>
                      <span style="color:#4b5563;"> · </span>
                      <a href="{{privacy_url}}" style="color:#fdba74; font-weight:600;">Privacy Policy</a>
                      <span style="color:#4b5563;"> · </span>
                      <a href="{{unsubscribe_url}}" style="color:#fdba74; font-weight:600;">Unsubscribe</a>
                    </p>

                    <p style="margin:14px 0 0; font-size:11px; line-height:18px; color:#6b7280;">
                      © 2026 Mailforge. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
};