// ─── Reusable MJML Component Library ─────────────────────────────────────────
// Pre-built MJML section templates that can be inserted without AI.

export interface ComponentTemplate {
  id: string;
  name: string;
  icon: string;
  category: "hero" | "content" | "cta" | "features" | "testimonial" | "footer" | "divider";
  mjml: string;
}

export const COMPONENT_LIBRARY: ComponentTemplate[] = [
  {
    id: "hero-simple",
    name: "Simple Hero",
    icon: "🎯",
    category: "hero",
    mjml: `<mj-section background-color="#6d28d9" padding="40px 24px">
  <mj-column>
    <mj-text align="center" color="#ffffff" font-size="32px" font-weight="bold" font-family="Helvetica Neue, Arial, sans-serif" padding-bottom="16px">
      Your Headline Here
    </mj-text>
    <mj-text align="center" color="#e2d9f3" font-size="16px" font-family="Helvetica Neue, Arial, sans-serif" padding-bottom="24px" line-height="1.6">
      A compelling subtitle that describes your offer or message in one or two lines.
    </mj-text>
    <mj-button background-color="#ffffff" color="#6d28d9" font-size="16px" font-weight="bold" border-radius="8px" padding="0" inner-padding="14px 32px" href="#">
      Get Started
    </mj-button>
  </mj-column>
</mj-section>`,
  },
  {
    id: "hero-image",
    name: "Hero with Image",
    icon: "🖼️",
    category: "hero",
    mjml: `<mj-section padding="0">
  <mj-column padding="0">
    <mj-image src="https://placehold.co/600x300/6d28d9/ffffff?text=Hero+Image" alt="Hero image" width="600px" padding="0" />
  </mj-column>
</mj-section>
<mj-section background-color="#ffffff" padding="32px 24px">
  <mj-column>
    <mj-text align="center" font-size="28px" font-weight="bold" color="#1e293b" font-family="Helvetica Neue, Arial, sans-serif" padding-bottom="12px">
      Welcome to Our Platform
    </mj-text>
    <mj-text align="center" font-size="15px" color="#64748b" font-family="Helvetica Neue, Arial, sans-serif" line-height="1.6" padding-bottom="24px">
      Start your journey with us today. We're excited to have you on board.
    </mj-text>
    <mj-button background-color="#6d28d9" color="#ffffff" font-size="15px" font-weight="bold" border-radius="6px" padding="0" inner-padding="12px 28px" href="#">
      Explore Now
    </mj-button>
  </mj-column>
</mj-section>`,
  },
  {
    id: "features-3col",
    name: "3-Column Features",
    icon: "📊",
    category: "features",
    mjml: `<mj-section background-color="#f8fafc" padding="32px 24px">
  <mj-column>
    <mj-text align="center" font-size="22px" font-weight="bold" color="#1e293b" font-family="Helvetica Neue, Arial, sans-serif" padding-bottom="24px">
      Why Choose Us
    </mj-text>
  </mj-column>
</mj-section>
<mj-section background-color="#f8fafc" padding="0 24px 32px">
  <mj-column padding="0 12px">
    <mj-image src="https://placehold.co/80x80/e2e8f0/6d28d9?text=🚀" alt="Feature 1" width="80px" padding-bottom="12px" />
    <mj-text align="center" font-size="16px" font-weight="bold" color="#1e293b" font-family="Helvetica Neue, Arial, sans-serif" padding-bottom="8px">
      Fast Setup
    </mj-text>
    <mj-text align="center" font-size="13px" color="#64748b" font-family="Helvetica Neue, Arial, sans-serif" line-height="1.5">
      Get started in minutes with our simple onboarding process.
    </mj-text>
  </mj-column>
  <mj-column padding="0 12px">
    <mj-image src="https://placehold.co/80x80/e2e8f0/6d28d9?text=🔒" alt="Feature 2" width="80px" padding-bottom="12px" />
    <mj-text align="center" font-size="16px" font-weight="bold" color="#1e293b" font-family="Helvetica Neue, Arial, sans-serif" padding-bottom="8px">
      Secure
    </mj-text>
    <mj-text align="center" font-size="13px" color="#64748b" font-family="Helvetica Neue, Arial, sans-serif" line-height="1.5">
      Enterprise-grade security to protect your data and privacy.
    </mj-text>
  </mj-column>
  <mj-column padding="0 12px">
    <mj-image src="https://placehold.co/80x80/e2e8f0/6d28d9?text=⚡" alt="Feature 3" width="80px" padding-bottom="12px" />
    <mj-text align="center" font-size="16px" font-weight="bold" color="#1e293b" font-family="Helvetica Neue, Arial, sans-serif" padding-bottom="8px">
      Scalable
    </mj-text>
    <mj-text align="center" font-size="13px" color="#64748b" font-family="Helvetica Neue, Arial, sans-serif" line-height="1.5">
      Grows with your business from startup to enterprise scale.
    </mj-text>
  </mj-column>
</mj-section>`,
  },
  {
    id: "cta-banner",
    name: "CTA Banner",
    icon: "📢",
    category: "cta",
    mjml: `<mj-section background-color="#1e293b" padding="32px 24px">
  <mj-column>
    <mj-text align="center" font-size="22px" font-weight="bold" color="#ffffff" font-family="Helvetica Neue, Arial, sans-serif" padding-bottom="12px">
      Ready to Get Started?
    </mj-text>
    <mj-text align="center" font-size="14px" color="#94a3b8" font-family="Helvetica Neue, Arial, sans-serif" padding-bottom="24px" line-height="1.6">
      Join thousands of happy customers who have already made the switch.
    </mj-text>
    <mj-button background-color="#6d28d9" color="#ffffff" font-size="15px" font-weight="bold" border-radius="6px" padding="0" inner-padding="12px 32px" href="#">
      Start Free Trial
    </mj-button>
  </mj-column>
</mj-section>`,
  },
  {
    id: "testimonial",
    name: "Testimonial",
    icon: "💬",
    category: "testimonial",
    mjml: `<mj-section background-color="#ffffff" padding="32px 24px">
  <mj-column padding="24px" background-color="#f8fafc" border-radius="12px">
    <mj-text font-size="15px" color="#475569" font-family="Helvetica Neue, Arial, sans-serif" font-style="italic" line-height="1.7" padding-bottom="16px">
      "This product completely transformed how we work. The results speak for themselves — 40% increase in productivity within the first month."
    </mj-text>
    <mj-text font-size="14px" font-weight="bold" color="#1e293b" font-family="Helvetica Neue, Arial, sans-serif" padding-bottom="2px">
      Jane Smith
    </mj-text>
    <mj-text font-size="12px" color="#94a3b8" font-family="Helvetica Neue, Arial, sans-serif">
      CEO, Acme Corp
    </mj-text>
  </mj-column>
</mj-section>`,
  },
  {
    id: "content-text",
    name: "Text Content",
    icon: "📝",
    category: "content",
    mjml: `<mj-section background-color="#ffffff" padding="24px">
  <mj-column>
    <mj-text font-size="20px" font-weight="bold" color="#1e293b" font-family="Helvetica Neue, Arial, sans-serif" padding-bottom="12px">
      Section Heading
    </mj-text>
    <mj-text font-size="15px" color="#475569" font-family="Helvetica Neue, Arial, sans-serif" line-height="1.7">
      Your content goes here. Write compelling copy that engages your readers and drives them to take action. Keep paragraphs short and scannable for the best email experience.
    </mj-text>
  </mj-column>
</mj-section>`,
  },
  {
    id: "divider-simple",
    name: "Divider",
    icon: "➖",
    category: "divider",
    mjml: `<mj-section padding="0 24px">
  <mj-column>
    <mj-divider border-color="#e2e8f0" border-width="1px" padding="16px 0" />
  </mj-column>
</mj-section>`,
  },
  {
    id: "footer-standard",
    name: "Standard Footer",
    icon: "📋",
    category: "footer",
    mjml: `<mj-section background-color="#f1f5f9" padding="24px">
  <mj-column>
    <mj-social font-size="12px" icon-size="24px" mode="horizontal" padding-bottom="16px">
      <mj-social-element name="facebook" href="#" />
      <mj-social-element name="twitter" href="#" />
      <mj-social-element name="linkedin" href="#" />
      <mj-social-element name="instagram" href="#" />
    </mj-social>
    <mj-text align="center" font-size="12px" color="#94a3b8" font-family="Helvetica Neue, Arial, sans-serif" line-height="1.6" padding-bottom="8px">
      © 2026 Your Company, Inc. All rights reserved.
    </mj-text>
    <mj-text align="center" font-size="11px" color="#94a3b8" font-family="Helvetica Neue, Arial, sans-serif" line-height="1.5">
      123 Business St, Suite 100, City, State 10001
    </mj-text>
    <mj-text align="center" font-size="11px" color="#94a3b8" font-family="Helvetica Neue, Arial, sans-serif" padding-top="8px">
      <a href="#" style="color: #6d28d9; text-decoration: underline;">Unsubscribe</a> · <a href="#" style="color: #6d28d9; text-decoration: underline;">Preferences</a>
    </mj-text>
  </mj-column>
</mj-section>`,
  },
];

/**
 * Get components by category.
 */
export function getComponentsByCategory(category: ComponentTemplate["category"]): ComponentTemplate[] {
  return COMPONENT_LIBRARY.filter(c => c.category === category);
}

/**
 * Get a component by its ID.
 */
export function getComponentById(id: string): ComponentTemplate | undefined {
  return COMPONENT_LIBRARY.find(c => c.id === id);
}
