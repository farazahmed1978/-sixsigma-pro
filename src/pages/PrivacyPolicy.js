import React from 'react';
import './Legal.css';

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-draft-notice">
        Draft template — pending attorney review. Not final legal advice.
      </div>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: [DATE]</p>

      <section>
        <h2>1. Introduction</h2>
        <p>Aureqin ("we," "us," or "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and platform (the "Service").</p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        <p><strong>Information you provide:</strong> account information (name, email, password) collected through our authentication provider; billing information processed through our payment provider; project data, files, and content you upload or create within the Service.</p>
        <p><strong>Information collected automatically:</strong> log data, device information, IP address, browser type, and usage data collected via cookies and similar technologies.</p>
      </section>

      <section>
        <h2>3. How We Use Information</h2>
        <p>We use collected information to: provide, operate, and maintain the Service; process transactions and manage subscriptions; communicate with you about your account or updates; improve and develop the Service; detect and prevent fraud or misuse; comply with legal obligations.</p>
      </section>

      <section>
        <h2>4. Third-Party Service Providers</h2>
        <p>We use third-party providers to operate the Service, including authentication services, payment processing services, and cloud hosting providers. These providers process data on our behalf and are contractually obligated to protect your information.</p>
      </section>

      <section>
        <h2>5. Data Storage and Local Processing</h2>
        <p>Statistical calculations are performed locally within your browser whenever possible. Project data may be transmitted and stored on our servers or those of our service providers when you use account, synchronization, collaboration, or AI-assisted features.</p>
      </section>

      <section>
        <h2>6. Your California Privacy Rights (CCPA/CPRA)</h2>
        <p>If you are a California resident, you have the right to: know what personal information we collect, use, and disclose; request deletion of your personal information; correct inaccurate personal information; opt out of the sale or sharing of your personal information; not be discriminated against for exercising these rights; designate an authorized agent to make requests on your behalf.</p>
        <p>We do not sell personal information in the traditional sense. To the extent our use of certain service providers may constitute "sharing" under the CPRA, you may opt out by contacting us at [PRIVACY CONTACT EMAIL].</p>
        <p>To exercise your rights, contact us at [PRIVACY CONTACT EMAIL]. We will verify your identity before processing your request as required by law.</p>
      </section>

      <section>
        <h2>7. Cookies</h2>
        <p>We use cookies and similar technologies to operate the Service, remember preferences, and analyze usage. You can control cookies through your browser settings.</p>
      </section>

      <section>
        <h2>8. Data Retention</h2>
        <p>We retain personal information for as long as necessary to provide the Service and fulfill the purposes described in this policy, unless a longer retention period is required by law.</p>
      </section>

      <section>
        <h2>9. Children's Privacy</h2>
        <p>The Service is not directed to individuals under the age of 16. We do not knowingly collect personal information from children.</p>
      </section>

      <section>
        <h2>10. Security</h2>
        <p>We implement reasonable administrative, technical, and physical safeguards designed to protect your information. However, no method of transmission or storage is 100% secure.</p>
      </section>

      <section>
        <h2>11. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy with a new "Last updated" date.</p>
      </section>

      <section>
        <h2>12. Contact Us</h2>
        <p>Questions about this Privacy Policy can be directed to: [CONTACT EMAIL]</p>
      </section>
    </div>
  );
}
