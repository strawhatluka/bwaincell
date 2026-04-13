'use client';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-twilight-50 via-dusk-50 to-dawn-50 dark:from-twilight-950 dark:via-dusk-950 dark:to-dawn-950 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-lg p-8 border border-border">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-twilight-600 via-dusk-600 to-dawn-600 bg-clip-text text-transparent mb-4">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-8">**Last Updated**: October 9, 2025</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Agreement to Terms</h2>
            <p className="text-foreground leading-relaxed">
              Welcome to Bwain.app! These Terms of Service ("Terms") govern your access to and use
              of Bwain.app's website, Progressive Web Application (PWA), and related services
              (collectively, the "Service"). By accessing or using the Service, you agree to be
              bound by these Terms.
            </p>
            <p className="text-foreground leading-relaxed mt-4">
              If you do not agree to these Terms, you may not access or use the Service.
            </p>
          </section>

          {/* Definitions */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 text-foreground space-y-2">
              <li>
                <strong>"Service"</strong> refers to Bwain.app, including the website, PWA, and
                backend API
              </li>
              <li>
                <strong>"User," "you,"</strong> or <strong>"your"</strong> refers to the person
                accessing or using the Service
              </li>
              <li>
                <strong>"We," "us,"</strong> or <strong>"our"</strong> refers to Bwain.app and its
                operators
              </li>
              <li>
                <strong>"Content"</strong> refers to tasks, lists, notes, reminders, budget data,
                and schedule events created by users
              </li>
            </ul>
          </section>

          {/* Account Registration */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              3. Account Registration and Security
            </h2>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              3.1 Google Account Requirement
            </h3>
            <p className="text-foreground leading-relaxed">
              To use the Service, you must sign in with a valid Google account. By signing in, you
              authorize us to access certain information from your Google account as described in
              our Privacy Policy.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              3.2 Account Security
            </h3>
            <p className="text-foreground leading-relaxed">
              You are responsible for maintaining the security of your Google account. We are not
              liable for any loss or damage arising from your failure to protect your account
              credentials.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              3.3 Accurate Information
            </h3>
            <p className="text-foreground leading-relaxed">
              You agree to provide accurate information when using the Service and to keep your
              Google account information up to date.
            </p>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Acceptable Use</h2>
            <p className="text-foreground leading-relaxed">
              You agree to use the Service only for lawful purposes and in accordance with these
              Terms. You agree NOT to:
            </p>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>Use the Service in any way that violates applicable laws or regulations</li>
              <li>
                Attempt to gain unauthorized access to the Service, other user accounts, or computer
                systems
              </li>
              <li>Upload or transmit viruses, malware, or other malicious code</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated scripts or bots to access the Service</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Use the Service to store or transmit illegal, harmful, or offensive content</li>
              <li>Impersonate another person or misrepresent your affiliation</li>
              <li>Sell, rent, or lease access to the Service</li>
            </ul>
          </section>

          {/* User Content */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. User Content</h2>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">5.1 Ownership</h3>
            <p className="text-foreground leading-relaxed">
              You retain all ownership rights to the Content you create using the Service (tasks,
              lists, notes, etc.). We do not claim ownership of your Content.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">5.2 License to Us</h3>
            <p className="text-foreground leading-relaxed">
              By creating Content, you grant us a limited, non-exclusive, worldwide license to
              store, process, and display your Content solely for the purpose of providing the
              Service to you.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              5.3 Content Responsibility
            </h3>
            <p className="text-foreground leading-relaxed">
              You are solely responsible for your Content. We do not review, monitor, or endorse
              Content created by users.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">5.4 Content Backup</h3>
            <p className="text-foreground leading-relaxed">
              While we implement backup procedures, you are responsible for maintaining your own
              backups of important Content. We recommend exporting your data regularly (feature
              available in V1.1).
            </p>
          </section>

          {/* Service Availability */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Service Availability</h2>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">6.1 "As Is" Service</h3>
            <p className="text-foreground leading-relaxed">
              The Service is provided on an "as is" and "as available" basis. We do not guarantee
              that the Service will be uninterrupted, error-free, or completely secure.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              6.2 Modifications and Downtime
            </h3>
            <p className="text-foreground leading-relaxed">
              We reserve the right to modify, suspend, or discontinue the Service (or any part
              thereof) at any time, with or without notice. We may also perform scheduled
              maintenance that temporarily interrupts access.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              6.3 No Liability for Downtime
            </h3>
            <p className="text-foreground leading-relaxed">
              We will not be liable for any loss or damage resulting from Service downtime,
              modifications, or discontinuation.
            </p>
          </section>

          {/* Fees and Payment */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Fees and Payment</h2>
            <p className="text-foreground leading-relaxed">
              Bwain.app is currently provided free of charge. We reserve the right to introduce paid
              features or subscriptions in the future. If we do so, we will provide advance notice
              and update these Terms accordingly.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              8. Intellectual Property
            </h2>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">8.1 Our Rights</h3>
            <p className="text-foreground leading-relaxed">
              The Service, including its design, code, graphics, logos, and trademarks, is owned by
              Bwain.app and protected by copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">8.2 Limited License</h3>
            <p className="text-foreground leading-relaxed">
              We grant you a limited, non-exclusive, non-transferable license to access and use the
              Service for personal, non-commercial purposes only.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">8.3 Restrictions</h3>
            <p className="text-foreground leading-relaxed">
              You may not copy, modify, distribute, sell, or lease any part of the Service without
              our express written permission.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Termination</h2>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              9.1 Termination by You
            </h3>
            <p className="text-foreground leading-relaxed">
              You may stop using the Service at any time. You can request deletion of your account
              and all associated data by contacting us at support@bwain.app.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              9.2 Termination by Us
            </h3>
            <p className="text-foreground leading-relaxed">
              We reserve the right to suspend or terminate your access to the Service at any time,
              with or without cause or notice, including if you violate these Terms.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              9.3 Effect of Termination
            </h3>
            <p className="text-foreground leading-relaxed">
              Upon termination, your right to use the Service will immediately cease. We may delete
              your Content after a reasonable period, unless legally required to retain it.
            </p>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Disclaimers</h2>
            <p className="text-foreground leading-relaxed uppercase font-semibold">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>
                Warranties of merchantability, fitness for a particular purpose, or non-infringement
              </li>
              <li>Warranties that the Service will be uninterrupted, secure, or error-free</li>
              <li>Warranties regarding the accuracy, reliability, or completeness of Content</li>
              <li>Warranties that defects will be corrected</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-4">
              Some jurisdictions do not allow the exclusion of implied warranties, so some of the
              above exclusions may not apply to you.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              11. Limitation of Liability
            </h2>
            <p className="text-foreground leading-relaxed uppercase font-semibold">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BWAIN.APP SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
              PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA,
              USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
            </p>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>Your access to or use of (or inability to access or use) the Service</li>
              <li>Any conduct or content of third parties</li>
              <li>Unauthorized access, use, or alteration of your Content</li>
              <li>Any bugs, viruses, or malicious code transmitted through the Service</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-4">
              IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED $100 USD OR THE AMOUNT YOU PAID US IN THE
              PAST 12 MONTHS, WHICHEVER IS LESS.
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Indemnification</h2>
            <p className="text-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless Bwain.app and its officers,
              directors, employees, and agents from any claims, liabilities, damages, losses, and
              expenses (including reasonable attorneys' fees) arising out of or related to:
            </p>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Your Content</li>
            </ul>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              13. Governing Law and Dispute Resolution
            </h2>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">13.1 Governing Law</h3>
            <p className="text-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the
              United States, without regard to conflict of law principles.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              13.2 Dispute Resolution
            </h3>
            <p className="text-foreground leading-relaxed">
              Any disputes arising from these Terms or the Service shall be resolved through binding
              arbitration, except that either party may seek injunctive relief in court for
              violations of intellectual property rights.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">14. Changes to Terms</h2>
            <p className="text-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. If we make material changes,
              we will notify you by:
            </p>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>Posting the updated Terms on this page</li>
              <li>Updating the "**Last Updated**" date</li>
              <li>Sending an email notification (for material changes)</li>
              <li>Displaying an in-app notification</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-4">
              Your continued use of the Service after changes become effective constitutes your
              acceptance of the updated Terms.
            </p>
          </section>

          {/* Miscellaneous */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">15. Miscellaneous</h2>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              15.1 Entire Agreement
            </h3>
            <p className="text-foreground leading-relaxed">
              These Terms, together with our Privacy Policy, constitute the entire agreement between
              you and Bwain.app regarding the Service.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">15.2 Severability</h3>
            <p className="text-foreground leading-relaxed">
              If any provision of these Terms is found to be unenforceable, the remaining provisions
              will remain in full effect.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">15.3 Waiver</h3>
            <p className="text-foreground leading-relaxed">
              No waiver of any provision of these Terms shall be deemed a further or continuing
              waiver of such provision or any other provision.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">15.4 Assignment</h3>
            <p className="text-foreground leading-relaxed">
              You may not assign or transfer these Terms or your rights hereunder without our prior
              written consent. We may assign these Terms without restriction.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">16. Contact Information</h2>
            <p className="text-foreground leading-relaxed">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="bg-muted p-4 rounded-lg mt-4">
              <p className="text-foreground">
                <strong>Email:</strong> support@bwain.app
              </p>
              <p className="text-foreground mt-2">
                <strong>Website:</strong> https://bwain.app
              </p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="bg-dusk-50 dark:bg-dusk-950 p-6 rounded-lg border-2 border-dusk-200 dark:border-dusk-800">
            <h2 className="text-2xl font-semibold text-foreground mb-4">17. Acknowledgment</h2>
            <p className="text-foreground leading-relaxed">
              BY USING BWAIN.APP, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE AND
              AGREE TO BE BOUND BY THEM. IF YOU DO NOT AGREE TO THESE TERMS, YOU MAY NOT USE THE
              SERVICE.
            </p>
          </section>
        </div>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-twilight-500 to-dusk-500 hover:from-twilight-600 hover:to-dusk-600 text-white rounded-lg font-medium transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
