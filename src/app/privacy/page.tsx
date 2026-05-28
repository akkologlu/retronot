import Link from 'next/link'
import { Logo } from '@/components/layout/logo'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-8 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo size="sm" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main id="main-content" className="mx-auto max-w-4xl px-8 py-16">
        <div className="space-y-2 mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: May 28, 2026</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-10 text-foreground/90 leading-relaxed">
          {/* 1 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p>
              RetroNot (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to
              protecting your privacy. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our retrospective collaboration platform
              at{' '}
              <span className="font-medium text-foreground">retronot.app</span> (&quot;the
              Service&quot;).
            </p>
            <p>
              By using the Service, you consent to the data practices described in this policy. If
              you do not agree with these practices, please do not use the Service.
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-foreground">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                <strong>Account Information:</strong> When you register, we collect your email
                address, display name, and profile picture (if provided). If you sign in via a
                third-party provider (e.g., Google, GitHub), we receive your name, email, and avatar
                from that provider.
              </li>
              <li>
                <strong>Retrospective Content:</strong> Cards, comments, votes, group labels, action
                items, and any other content you create during retrospective sessions.
              </li>
              <li>
                <strong>Team Information:</strong> Team names, membership data, and invite
                configurations you set up.
              </li>
              <li>
                <strong>Communications:</strong> If you contact us for support or feedback, we
                collect the content of your messages along with your email address.
              </li>
            </ul>

            <h3 className="text-lg font-medium text-foreground">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                <strong>Usage Data:</strong> Pages visited, features used, session duration, and
                interaction patterns within the Service.
              </li>
              <li>
                <strong>Device &amp; Browser Information:</strong> Browser type, operating system,
                device type, screen resolution, and language preference.
              </li>
              <li>
                <strong>IP Address:</strong> Your IP address is collected for security, rate
                limiting, and approximate geolocation purposes.
              </li>
              <li>
                <strong>Cookies &amp; Local Storage:</strong> We use essential cookies for
                authentication and session management. We use local storage to persist your UI
                preferences (e.g., theme selection).
              </li>
            </ul>

            <h3 className="text-lg font-medium text-foreground">2.3 Information from Third Parties</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                <strong>Authentication Providers:</strong> When you sign in via Google, GitHub, or
                other OAuth providers, we receive basic profile information as authorized by you.
              </li>
              <li>
                <strong>Error Tracking:</strong> We use Sentry to capture error reports that may
                include technical context about your session (no personal content is intentionally
                collected through error reports).
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Provide, operate, and maintain the Service</li>
              <li>Authenticate your identity and manage your account</li>
              <li>Enable real-time collaboration in retrospective sessions</li>
              <li>
                Generate AI-powered features such as retrospective summaries, sentiment analysis,
                and action item suggestions
              </li>
              <li>Send transactional emails (e.g., password resets, team invitations)</li>
              <li>Monitor and analyze usage trends to improve the Service</li>
              <li>Detect, prevent, and address security threats, abuse, and technical issues</li>
              <li>Enforce our Terms of Service and comply with legal obligations</li>
            </ul>
          </section>

          {/* 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. AI Data Processing</h2>
            <p>
              When you use AI-powered features (e.g., retrospective summaries), your retrospective
              content may be sent to third-party AI providers for processing. We take the following
              precautions:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                Only the minimum necessary data is sent to AI providers — specifically, card text
                and action items relevant to the summary being generated
              </li>
              <li>
                We do not send personally identifiable information (such as names or email addresses)
                to AI providers unless it is part of the card content you wrote
              </li>
              <li>
                AI providers are contractually prohibited from using your data to train their models
              </li>
              <li>AI-generated outputs are stored within your retrospective session data</li>
            </ul>
          </section>

          {/* 5 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Data Sharing &amp; Disclosure</h2>
            <p>
              We do not sell, rent, or trade your personal information. We may share your data only
              in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                <strong>With Your Team:</strong> Content you create in a team retrospective is
                visible to other team members and participants of that session. Anonymous card
                authorship is preserved when configured.
              </li>
              <li>
                <strong>Service Providers:</strong> We work with trusted third-party providers who
                process data on our behalf (e.g., Supabase for database and authentication, Vercel
                for hosting, Sentry for error tracking). These providers are bound by data processing
                agreements.
              </li>
              <li>
                <strong>Legal Requirements:</strong> We may disclose your information if required by
                law, regulation, legal process, or governmental request.
              </li>
              <li>
                <strong>Safety &amp; Security:</strong> We may share information to investigate or
                prevent fraud, security threats, or violations of our Terms of Service.
              </li>
              <li>
                <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale
                of assets, your information may be transferred as part of the transaction. We will
                notify you before your data becomes subject to a different privacy policy.
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Data Storage &amp; Security</h2>
            <p>
              Your data is stored on secure servers provided by Supabase (PostgreSQL) and hosted
              infrastructure provided by Vercel. We implement the following security measures:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>All data is transmitted over HTTPS with TLS encryption</li>
              <li>Database access is protected by Row Level Security (RLS) policies</li>
              <li>Passwords are hashed using industry-standard algorithms (bcrypt via Supabase Auth)</li>
              <li>API endpoints are protected by authentication checks and rate limiting</li>
              <li>Session tokens are stored as secure, HTTP-only cookies</li>
              <li>
                Regular security reviews and dependency updates are performed to address known
                vulnerabilities
              </li>
            </ul>
            <p>
              While we take reasonable measures to protect your data, no method of electronic
              transmission or storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* 7 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                <strong>Account Data:</strong> Retained as long as your account is active. Upon
                account deletion, your personal information is removed within 30 days.
              </li>
              <li>
                <strong>Retrospective Content:</strong> Retained as long as the team or
                retrospective exists. Archived retrospectives are retained until explicitly deleted
                by a team administrator.
              </li>
              <li>
                <strong>Logs &amp; Analytics:</strong> Server logs and anonymized analytics data may
                be retained for up to 90 days for operational and security purposes.
              </li>
              <li>
                <strong>Backups:</strong> Encrypted database backups may retain data for up to 30
                days beyond deletion as part of disaster recovery procedures.
              </li>
            </ul>
          </section>

          {/* 8 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Your Rights</h2>
            <p>
              Depending on your location, you may have the following rights regarding your personal
              data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                <strong>Access:</strong> Request a copy of the personal data we hold about you
              </li>
              <li>
                <strong>Rectification:</strong> Request correction of inaccurate or incomplete data
              </li>
              <li>
                <strong>Erasure:</strong> Request deletion of your personal data (&quot;right to be
                forgotten&quot;)
              </li>
              <li>
                <strong>Data Portability:</strong> Request a machine-readable export of your data
              </li>
              <li>
                <strong>Restriction:</strong> Request that we limit the processing of your data
              </li>
              <li>
                <strong>Objection:</strong> Object to the processing of your data for certain
                purposes
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Where processing is based on consent, withdraw
                your consent at any time
              </li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at{' '}
              <span className="font-medium text-foreground">privacy@retronot.app</span>. We will
              respond to your request within 30 days.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Cookies</h2>
            <p>We use the following types of cookies:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Purpose</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-foreground/80">
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium">Essential</td>
                    <td className="px-4 py-3">Authentication, session management, CSRF protection</td>
                    <td className="px-4 py-3">Session / 7 days</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium">Functional</td>
                    <td className="px-4 py-3">Theme preference (light/dark mode), UI settings</td>
                    <td className="px-4 py-3">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Analytics</td>
                    <td className="px-4 py-3">Anonymous usage statistics for service improvement</td>
                    <td className="px-4 py-3">90 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              We do not use advertising or tracking cookies. You can control cookie settings in your
              browser, but disabling essential cookies may prevent you from using the Service.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. International Data Transfers</h2>
            <p>
              Your data may be transferred to and processed in countries other than your own. Our
              infrastructure providers (Supabase, Vercel) operate servers in multiple regions. When
              your data is transferred internationally, we ensure appropriate safeguards are in place
              through:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Standard contractual clauses approved by applicable authorities</li>
              <li>Data processing agreements with all third-party providers</li>
              <li>Ensuring providers maintain adequate levels of data protection</li>
            </ul>
          </section>

          {/* 11 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">11. Children&apos;s Privacy</h2>
            <p>
              RetroNot is not intended for use by individuals under the age of 16. We do not
              knowingly collect personal information from children. If we become aware that we have
              collected data from a child under 16, we will take steps to delete that information
              promptly. If you believe a child has provided us with personal data, please contact us
              at{' '}
              <span className="font-medium text-foreground">privacy@retronot.app</span>.
            </p>
          </section>

          {/* 12 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">12. Third-Party Services</h2>
            <p>
              The Service integrates with the following third-party services. Each has its own
              privacy policy governing data usage:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                <strong>Supabase</strong> — Database, authentication, and real-time infrastructure
              </li>
              <li>
                <strong>Vercel</strong> — Application hosting and edge functions
              </li>
              <li>
                <strong>Sentry</strong> — Error monitoring and performance tracking
              </li>
              <li>
                <strong>OpenAI / AI Providers</strong> — AI-powered summary and analysis features
              </li>
            </ul>
            <p>
              We encourage you to review the privacy policies of these services.
            </p>
          </section>

          {/* 13 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">13. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we make changes, we will
              update the &quot;Last updated&quot; date at the top of this page. For significant
              changes, we will provide notice through the Service or via email.
            </p>
            <p>
              Your continued use of the Service after changes become effective constitutes your
              acceptance of the revised Privacy Policy.
            </p>
          </section>

          {/* 14 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">14. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our
              data practices, please contact us at:
            </p>
            <div className="bg-muted/50 rounded-lg p-6 space-y-1">
              <p className="font-medium text-foreground">RetroNot — Privacy Team</p>
              <p className="text-foreground/80">Email: privacy@retronot.app</p>
              <p className="text-foreground/80">General: support@retronot.app</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-8">
        <div className="mx-auto max-w-4xl flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="text-foreground font-medium">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/cookie-policy" className="hover:text-foreground transition-colors">Cookie Policy</Link>
            <Link href="/kvkk" className="hover:text-foreground transition-colors">KVKK</Link>
          </div>
          <p className="text-xs text-muted-foreground/60">© 2026 RetroNot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
