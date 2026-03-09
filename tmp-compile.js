    const fs = require('fs');
const mjml2html = require('mjml');

const MJML_CONTENT = `<mjml>
  <mj-head>
    <mj-title>Welcome to Antigravity AI!</mj-title>
    <mj-font name="Plus Jakarta Sans" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&amp;display=swap" />
    <mj-attributes>
      <mj-all font-family="Plus Jakarta Sans, Helvetica, Arial, sans-serif" />
      <mj-text font-size="16px" color="#334155" line-height="1.6" />
    </mj-attributes>
    <mj-style>
      .hover-btn a:hover {
        background-color: #6d28d9 !important;
      }
    </mj-style>
  </mj-head>
  <mj-body background-color="#f8fafc">
    <!-- Header -->
    <mj-section padding-bottom="0px" padding-top="40px">
      <mj-column width="100%">
        <mj-image src="https://placehold.co/200x60/8b5cf6/ffffff?text=Antigravity" alt="Antigravity Logo" align="center" width="150px" />
      </mj-column>
    </mj-section>
    
    <!-- Hero / Main Card -->
    <mj-section padding="20px">
      <mj-column width="100%" background-color="#ffffff" border-radius="16px" padding="30px 20px" box-shadow="0 10px 25px -5px rgba(0, 0, 0, 0.05)">
        <mj-text align="center" font-size="28px" font-weight="700" color="#0f172a" padding-bottom="10px">
          Welcome to the Future!
        </mj-text>
        <mj-text align="center" font-size="16px" color="#64748b" padding-bottom="25px">
          We're absolutely thrilled to have you on board. You're now equipped with the most powerful AI email builder on the planet.
        </mj-text>
        <mj-image src="https://placehold.co/600x300/f1f5f9/94a3b8?text=Welcome+Hero+Image" alt="Hero Image" border-radius="12px" padding-bottom="25px" />
        <mj-text font-size="18px" font-weight="600" color="#1e293b" padding-bottom="10px">
          Here is what you can do next:
        </mj-text>
        <mj-text padding-bottom="5px">
          • Generate stunning emails from plain text prompts
        </mj-text>
        <mj-text padding-bottom="5px">
          • Upload images to match existing brand designs
        </mj-text>
        <mj-text padding-bottom="25px">
          • Edit text inline with our live-preview editor
        </mj-text>
        <mj-button href="#" css-class="hover-btn" background-color="#8b5cf6" color="#ffffff" font-size="16px" font-weight="600" border-radius="8px" padding="15px 30px" inner-padding="12px 24px">
          Start Building Now
        </mj-button>
      </mj-column>
    </mj-section>
    
    <!-- Footer -->
    <mj-section padding-top="10px" padding-bottom="40px">
      <mj-column width="100%">
        <mj-text align="center" font-size="13px" color="#94a3b8">
          © 2026 Antigravity Inc. All rights reserved.
        </mj-text>
        <mj-text align="center" font-size="13px" color="#94a3b8" padding-top="5px">
          <a href="#" style="color: #8b5cf6; text-decoration: none;">Unsubscribe</a> | <a href="#" style="color: #8b5cf6; text-decoration: none;">Privacy Policy</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

const { html } = mjml2html(MJML_CONTENT, { validationLevel: 'soft', keepComments: false });

const fileContent = `// Auto-generated sample template
export const SAMPLE_TEMPLATE = {
  mjml: \`${MJML_CONTENT.replace(/`/g, '\\`')}\`,
  html: \`${html.replace(/`/g, '\\`')}\`
};
`;

fs.writeFileSync('src/lib/sampleTemplate.ts', fileContent);
console.log('Successfully created src/lib/sampleTemplate.ts');
