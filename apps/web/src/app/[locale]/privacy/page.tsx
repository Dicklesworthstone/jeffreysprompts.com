import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for JeffreysPrompts.com - Learn how we collect, use, and protect your personal information.",
};

const tableOfContents = [
  { id: "information-collect", title: "1. Information We Collect" },
  { id: "how-we-use", title: "2. How We Use Information" },
  { id: "information-sharing", title: "3. Information Sharing" },
  { id: "data-retention", title: "4. Data Retention" },
  { id: "your-rights", title: "5. Your Rights" },
  { id: "cookies", title: "6. Cookies and Tracking" },
  { id: "children", title: "7. Children's Privacy" },
  { id: "security", title: "8. Security" },
  { id: "changes", title: "9. Changes to This Policy" },
  { id: "contact", title: "10. Contact Us" },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="January 12, 2026"
      version="1.0"
      icon="privacy"
      tableOfContents={tableOfContents}
    >
      <p className="lead">
        Your privacy is important to us. This Privacy Policy explains how JeffreysPrompts.com
        collects, uses, and protects your personal information.
      </p>

      <h2 id="information-collect">1. Information We Collect</h2>

      <h3>Account Information</h3>
      <p>
        When you create an account using Google OAuth, we receive and store:
      </p>
      <ul>
        <li>Your email address</li>
        <li>Your display name</li>
        <li>Your profile picture URL (optional)</li>
      </ul>
      <p>
        We do not receive or store your Google password.
      </p>

      <h3>Content You Create</h3>
      <p>
        We store content you create on the Service, including:
      </p>
      <ul>
        <li>Saved prompts and collections</li>
        <li>Notes and annotations</li>
        <li>Preferences and settings</li>
      </ul>

      <h3>Usage Data</h3>
      <p>
        We automatically collect certain information when you use the Service:
      </p>
      <ul>
        <li>Pages visited and features used</li>
        <li>Search queries (anonymized)</li>
        <li>Device type and browser information</li>
        <li>IP address (for security purposes)</li>
        <li>Referring website</li>
      </ul>

      <h3>Payment Information</h3>
      <p>
        If you subscribe to premium features, payment is processed by Stripe. We do not store your
        full credit card number. Stripe provides us with:
      </p>
      <ul>
        <li>Last four digits of your card</li>
        <li>Card brand and expiration date</li>
        <li>Billing address</li>
        <li>Transaction history</li>
      </ul>

      <h2 id="how-we-use">2. How We Use Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide and improve the Service</li>
        <li>Process your transactions</li>
        <li>Send you important updates about the Service</li>
        <li>Respond to your requests and support inquiries</li>
        <li>Analyze usage patterns to improve user experience</li>
        <li>Protect against fraud and abuse</li>
        <li>Comply with legal obligations</li>
      </ul>
      <p>
        We do not sell your personal information to third parties.
      </p>

      <h2 id="information-sharing">3. Information Sharing</h2>
      <p>We share your information only in the following circumstances:</p>

      <h3>Service Providers</h3>
      <p>We use trusted third-party services to operate the Service:</p>
      <ul>
        <li>
          <strong>Supabase</strong> - Database and authentication infrastructure
        </li>
        <li>
          <strong>Stripe</strong> - Payment processing
        </li>
        <li>
          <strong>Vercel</strong> - Hosting and edge functions
        </li>
        <li>
          <strong>Plausible Analytics</strong> - Privacy-focused analytics (no cookies, GDPR
          compliant)
        </li>
        <li>
          <strong>Google Analytics</strong> - Optional analytics, only loaded after you opt in
        </li>
      </ul>

      <h3>Legal Requirements</h3>
      <p>
        Your information may be disclosed if required by law, court order, or government request, or
        when disclosure is necessary to protect rights, your safety, or the safety of others.
      </p>

      <h3>Business Transfers</h3>
      <p>
        If JeffreysPrompts.com is acquired or merged with another company, your information may be
        transferred as part of that transaction.
      </p>

      <h2 id="data-retention">4. Data Retention</h2>
      <p>We retain your information for as long as:</p>
      <ul>
        <li>Your account is active</li>
        <li>Needed to provide you with the Service</li>
        <li>Required by law or for legitimate business purposes</li>
      </ul>
      <p>
        After account deletion, we may retain certain information for a reasonable period for
        backup, archival, or audit purposes.
      </p>

      <h2 id="your-rights">5. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>
          <strong>Access</strong> - Request a copy of your personal data
        </li>
        <li>
          <strong>Correction</strong> - Update or correct your information
        </li>
        <li>
          <strong>Deletion</strong> - Request deletion of your account and data
        </li>
        <li>
          <strong>Export</strong> - Download your data in a portable format
        </li>
        <li>
          <strong>Opt-out</strong> - Unsubscribe from marketing communications
        </li>
      </ul>
      <p>
        To exercise these rights, contact us at{" "}
        <a href="mailto:privacy@jeffreysprompts.com">privacy@jeffreysprompts.com</a>.
      </p>

      <h3>California Residents (CCPA)</h3>
      <p>
        If you are a California resident, you have additional rights under the California Consumer
        Privacy Act, including the right to know what personal information we collect and the right
        to opt out of the sale of personal information. We do not sell personal information.
      </p>

      <h3>EU/EEA Residents (GDPR)</h3>
      <p>
        If you are in the EU/EEA, you have rights under the General Data Protection Regulation,
        including the right to data portability and the right to lodge a complaint with a
        supervisory authority.
      </p>

      <h2 id="cookies">6. Cookies and Tracking</h2>
      <p>
        We use minimal cookies to operate the Service:
      </p>
      <ul>
        <li>
          <strong>Essential cookies</strong> - Required for authentication and security
        </li>
        <li>
          <strong>Preference cookies</strong> - Remember your settings (theme, etc.)
        </li>
      </ul>
      <p>
        We use Plausible Analytics (no cookies) and Google Analytics (GA4) for product analytics.
        We do not use advertising cookies.
      </p>
      <p>
        You can control cookies through your browser settings. Disabling essential cookies may
        affect Service functionality.
      </p>

      <h2 id="children">7. Children&apos;s Privacy</h2>
      <p>
        The Service is not intended for children under 13 years of age. We do not knowingly collect
        personal information from children under 13. If you believe we have collected information
        from a child under 13, please contact us immediately.
      </p>

      <h2 id="security">8. Security</h2>
      <p>
        We implement appropriate technical and organizational measures to protect your information,
        including:
      </p>
      <ul>
        <li>Encryption in transit (HTTPS/TLS)</li>
        <li>Encryption at rest for sensitive data</li>
        <li>Regular security audits</li>
        <li>Access controls and authentication</li>
        <li>Monitoring for suspicious activity</li>
      </ul>
      <p>
        However, no method of transmission or storage is 100% secure. We cannot guarantee absolute
        security.
      </p>

      <h2 id="changes">9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of any material
        changes by:
      </p>
      <ul>
        <li>Posting the new policy on this page</li>
        <li>Updating the &quot;Last updated&quot; date</li>
        <li>Sending you an email (for significant changes)</li>
      </ul>
      <p>
        Your continued use of the Service after changes constitutes acceptance of the updated
        policy.
      </p>

      <h2 id="contact">10. Contact Us</h2>
      <p>
        If you have questions or concerns about this Privacy Policy or our data practices, please
        contact us:
      </p>
      <ul>
        <li>
          Email:{" "}
          <a href="mailto:privacy@jeffreysprompts.com">privacy@jeffreysprompts.com</a>
        </li>
        <li>
          GitHub:{" "}
          <a
            href="https://github.com/Dicklesworthstone/jeffreysprompts.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/Dicklesworthstone/jeffreysprompts.com
          </a>
        </li>
      </ul>
      <p>
        For GDPR-related inquiries, you may also contact our Data Protection Officer at{" "}
        <a href="mailto:dpo@jeffreysprompts.com">dpo@jeffreysprompts.com</a>.
      </p>
    </LegalPageLayout>
  );
}
