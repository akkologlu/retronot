import Link from 'next/link'
import { Logo } from '@/components/layout/logo'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">Last updated: May 28, 2026</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-10 text-foreground/90 leading-relaxed">
          {/* 1 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Agreement to Terms</h2>
            <p>
              By accessing or using RetroNot (&quot;the Service&quot;), operated at{' '}
              <span className="font-medium text-foreground">retronot.app</span>, you agree to be
              bound by these Terms of Service (&quot;Terms&quot;). If you do not agree with any part
              of these Terms, you may not use the Service.
            </p>
            <p>
              These Terms apply to all visitors, users, and others who access or use the Service,
              whether as individual users or on behalf of a team or organization.
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p>
              RetroNot is a real-time retrospective collaboration platform designed for agile teams.
              The Service allows users to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Create and participate in structured retrospective sessions</li>
              <li>Write feedback cards, group them thematically, and vote on items</li>
              <li>Facilitate discussions and track action items arising from retrospectives</li>
              <li>Manage teams, invite members, and archive past retrospectives</li>
              <li>Generate AI-powered summaries and insights from retrospective data</li>
            </ul>
          </section>

          {/* 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Account Registration</h2>
            <p>
              To use RetroNot, you must create an account using a valid email address or a supported
              third-party authentication provider. You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Providing accurate and complete registration information</li>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
            </ul>
            <p>
              You must be at least 16 years of age to create an account and use the Service. By
              registering, you represent that you meet this age requirement.
            </p>
          </section>

          {/* 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. User Content</h2>
            <p>
              &quot;User Content&quot; refers to any text, feedback cards, action items, comments, or
              other content you create, upload, or share through the Service.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                <strong>Ownership:</strong> You retain full ownership of all User Content you create
                on RetroNot. We do not claim any intellectual property rights over your content.
              </li>
              <li>
                <strong>License:</strong> By submitting User Content, you grant RetroNot a limited,
                non-exclusive, worldwide license to store, process, and display your content solely
                for the purpose of providing and improving the Service.
              </li>
              <li>
                <strong>Responsibility:</strong> You are solely responsible for the content you post.
                Content must not be unlawful, defamatory, harassing, or infringe on the rights of
                others.
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Team &amp; Collaboration</h2>
            <p>
              RetroNot enables team-based collaboration. When you create or join a team:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                Team administrators may manage team membership, retrospective settings, and have
                access to all retrospective data within the team
              </li>
              <li>
                Content created within a team retrospective is visible to all participants of that
                session unless the session is configured otherwise (e.g., anonymous card writing)
              </li>
              <li>
                If you leave a team, your previously contributed content (cards, votes, action items)
                may remain accessible to other team members
              </li>
              <li>
                Invite links generated for teams and retrospectives should be shared responsibly. You
                are responsible for ensuring invites are only shared with intended recipients
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Violate any applicable law, regulation, or third-party rights</li>
              <li>Transmit malware, spam, or any malicious content</li>
              <li>
                Attempt to gain unauthorized access to the Service, other accounts, or underlying
                systems
              </li>
              <li>Interfere with or disrupt the Service or servers connected to it</li>
              <li>
                Use automated means (bots, scrapers, crawlers) to access the Service without prior
                written consent
              </li>
              <li>Impersonate another person or entity</li>
              <li>Use the Service for any purpose that is fraudulent or deceptive</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms without
              prior notice.
            </p>
          </section>

          {/* 7 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. AI Features</h2>
            <p>
              RetroNot may offer AI-powered features, including but not limited to automated
              retrospective summaries, sentiment analysis, and action item suggestions. By using
              these features:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                You acknowledge that AI-generated outputs are provided as suggestions and should be
                reviewed before use
              </li>
              <li>
                Retrospective data processed by AI features is handled in accordance with our{' '}
                <Link href="/privacy" className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                We do not guarantee the accuracy, completeness, or suitability of AI-generated
                content
              </li>
            </ul>
          </section>

          {/* 8 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Availability &amp; Modifications</h2>
            <p>
              We strive to keep RetroNot available and reliable, but we do not guarantee uninterrupted
              or error-free access. We reserve the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Modify, suspend, or discontinue any part of the Service at any time</li>
              <li>Perform scheduled or unscheduled maintenance</li>
              <li>Update features and functionality without prior notice</li>
            </ul>
            <p>
              We will make reasonable efforts to notify users of significant changes that may affect
              their use of the Service.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Intellectual Property</h2>
            <p>
              The Service, including its design, code, branding, logo, and all associated
              intellectual property, is owned by RetroNot and protected by applicable intellectual
              property laws. You may not copy, modify, distribute, or reverse engineer any part of
              the Service without prior written permission.
            </p>
            <p>
              &quot;RetroNot&quot; and the RetroNot logo are trademarks. You may not use these marks
              without prior written consent.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, RetroNot and its operators, employees, and
              affiliates shall not be liable for any indirect, incidental, special, consequential, or
              punitive damages arising from or related to your use of the Service.
            </p>
            <p>
              This includes, without limitation, damages for loss of profits, data, goodwill, or
              other intangible losses, even if we have been advised of the possibility of such
              damages.
            </p>
            <p>
              Our total liability for any claim arising from the Service shall not exceed the amount
              you paid to RetroNot, if any, during the twelve (12) months preceding the claim.
            </p>
          </section>

          {/* 11 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">11. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless RetroNot, its operators, directors,
              employees, and agents from any claims, liabilities, damages, losses, and expenses
              (including reasonable attorney&apos;s fees) arising from your use of the Service, your
              violation of these Terms, or your violation of any rights of a third party.
            </p>
          </section>

          {/* 12 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">12. Termination</h2>
            <p>
              You may stop using the Service and delete your account at any time. We may also
              terminate or suspend your access at our discretion, without prior notice, if:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>You breach these Terms</li>
              <li>Your use poses a security risk to the Service or other users</li>
              <li>We are required to do so by law</li>
              <li>We decide to discontinue the Service</li>
            </ul>
            <p>
              Upon termination, your right to use the Service ceases immediately. Provisions that by
              their nature should survive termination (including ownership, liability, and
              indemnification) shall remain in effect.
            </p>
          </section>

          {/* 13 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">13. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              Republic of Turkey, without regard to conflict of law principles. Any disputes arising
              from these Terms or the Service shall be subject to the exclusive jurisdiction of the
              courts of Istanbul, Turkey.
            </p>
          </section>

          {/* 14 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">14. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. When we make changes, we will update the
              &quot;Last updated&quot; date at the top of this page. Continued use of the Service
              after changes become effective constitutes your acceptance of the revised Terms.
            </p>
            <p>
              For significant changes, we will make reasonable efforts to provide notice via the
              Service or by email.
            </p>
          </section>

          {/* 15 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">15. Contact</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="font-medium text-foreground">
              support@retronot.app
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-8">
        <div className="mx-auto max-w-4xl flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-foreground font-medium">Terms of Service</Link>
            <Link href="/cookie-policy" className="hover:text-foreground transition-colors">Cookie Policy</Link>
            <Link href="/kvkk" className="hover:text-foreground transition-colors">KVKK</Link>
          </div>
          <p className="text-xs text-muted-foreground/60">© 2026 RetroNot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
