'use client';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-twilight-50 via-dusk-50 to-dawn-50 dark:from-twilight-950 dark:via-dusk-950 dark:to-dawn-950 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-lg p-8 border border-border">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-twilight-600 via-dusk-600 to-dawn-600 bg-clip-text text-transparent mb-4">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-8">**Last Updated**: October 9, 2025</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-foreground leading-relaxed">
              Welcome to Bwain.app ("we," "our," or "us"). We are committed to protecting your
              privacy and ensuring the security of your personal information. This Privacy Policy
              explains how we collect, use, store, and protect your data when you use our
              Progressive Web Application (PWA) and related services.
            </p>
            <p className="text-foreground leading-relaxed mt-4">
              By using Bwain.app, you agree to the collection and use of information in accordance
              with this policy. If you do not agree with our policies and practices, please do not
              use our services.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              2. Information We Collect
            </h2>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              2.1 Information from Google OAuth
            </h3>
            <p className="text-foreground leading-relaxed">
              When you sign in with Google, we collect:
            </p>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>
                <strong>Google User ID:</strong> A unique identifier from Google
              </li>
              <li>
                <strong>Email Address:</strong> Your Google account email
              </li>
              <li>
                <strong>Name:</strong> Your display name from Google
              </li>
              <li>
                <strong>Profile Picture:</strong> Your Google profile image URL
              </li>
              <li>
                <strong>OAuth Tokens:</strong> Access and refresh tokens for authentication
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              2.2 Productivity Data You Create
            </h3>
            <p className="text-foreground leading-relaxed">
              When you use Bwain.app features, we store:
            </p>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>
                <strong>Tasks:</strong> Task descriptions, due dates, completion status
              </li>
              <li>
                <strong>Lists:</strong> List names, items, and completion states
              </li>
              <li>
                <strong>Notes:</strong> Note content and tags
              </li>
              <li>
                <strong>Reminders:</strong> Reminder messages, times, and recurrence settings
              </li>
              <li>
                <strong>Budget Data:</strong> Transaction amounts, categories, and descriptions
              </li>
              <li>
                <strong>Schedule Events:</strong> Event titles, dates, times, and descriptions
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              2.3 Automatically Collected Information
            </h3>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>
                <strong>Usage Data:</strong> Features accessed, frequency of use
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, operating system, screen size
              </li>
              <li>
                <strong>Log Data:</strong> IP address, access times, error logs (stored temporarily
                for debugging)
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              2.4 Information We Do NOT Collect
            </h3>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>Passwords (we use Google OAuth exclusively)</li>
              <li>Payment information (we do not process payments)</li>
              <li>Precise geolocation data</li>
              <li>Biometric data</li>
              <li>Third-party service credentials</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-foreground leading-relaxed">
              We use your information for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>
                <strong>Authentication:</strong> To verify your identity and manage your account
              </li>
              <li>
                <strong>Service Delivery:</strong> To provide productivity features (tasks, lists,
                notes, etc.)
              </li>
              <li>
                <strong>Data Synchronization:</strong> To sync your data across devices
              </li>
              <li>
                <strong>Reminders:</strong> To send notifications at scheduled times (with your
                permission)
              </li>
              <li>
                <strong>Service Improvement:</strong> To analyze usage patterns and improve features
              </li>
              <li>
                <strong>Technical Support:</strong> To diagnose and fix technical issues
              </li>
              <li>
                <strong>Security:</strong> To detect and prevent fraud, abuse, and security
                incidents
              </li>
            </ul>
          </section>

          {/* Google API Services */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Google API Services</h2>
            <p className="text-foreground leading-relaxed">
              Bwain.app uses Google OAuth 2.0 for authentication and may request access to
              additional Google APIs in the future. Our use and transfer of information received
              from Google APIs will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-twilight-600 hover:text-twilight-700 underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              4.1 Current Google API Usage
            </h3>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>
                <strong>Google Sign-In:</strong> OAuth 2.0 authentication (openid, email, profile
                scopes)
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              4.2 Potential Future Google API Integrations
            </h3>
            <p className="text-foreground leading-relaxed">
              With your explicit consent, we may request access to:
            </p>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>
                <strong>Google Calendar:</strong> To sync your schedule with your Google Calendar
              </li>
              <li>
                <strong>Google Drive:</strong> To attach files to tasks and notes
              </li>
              <li>
                <strong>Gmail:</strong> To send reminder emails
              </li>
              <li>
                <strong>Google Tasks:</strong> To sync tasks between Bwain.app and Google Tasks
              </li>
              <li>
                <strong>Google Contacts:</strong> To share tasks with your contacts
              </li>
            </ul>
            <p className="text-foreground leading-relaxed mt-4">
              <strong>Important:</strong> You will be asked for explicit permission before we access
              any additional Google services. You can revoke these permissions at any time through
              your Google Account settings.
            </p>
          </section>

          {/* Data Storage and Security */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              5. Data Storage and Security
            </h2>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              5.1 Where We Store Your Data
            </h3>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>
                <strong>Backend Database:</strong> Your productivity data is stored in a secure
                SQLite database hosted on Fly.io servers (United States)
              </li>
              <li>
                <strong>Browser Storage:</strong> Session tokens are stored in secure httpOnly
                cookies
              </li>
              <li>
                <strong>Service Worker Cache:</strong> Static assets are cached locally for offline
                functionality (no personal data)
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              5.2 Security Measures
            </h3>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>
                <strong>Encryption in Transit:</strong> All data is transmitted over HTTPS/TLS
              </li>
              <li>
                <strong>OAuth 2.0:</strong> Industry-standard authentication protocol
              </li>
              <li>
                <strong>Token-Based Authentication:</strong> Short-lived access tokens with
                automatic refresh
              </li>
              <li>
                <strong>Database Isolation:</strong> All user data is isolated by Google User ID
              </li>
              <li>
                <strong>Regular Security Audits:</strong> We regularly review our security practices
              </li>
              <li>
                <strong>No Password Storage:</strong> We never store passwords (Google handles
                authentication)
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">5.3 Data Retention</h3>
            <p className="text-foreground leading-relaxed">
              We retain your data for as long as your account is active. You can request deletion of
              your account and all associated data at any time (see Section 8).
            </p>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              6. Data Sharing and Disclosure
            </h2>
            <p className="text-foreground leading-relaxed">
              <strong>We do not sell your personal information to third parties.</strong>
            </p>
            <p className="text-foreground leading-relaxed mt-4">
              We may share your information only in the following limited circumstances:
            </p>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>
                <strong>Service Providers:</strong> We use Fly.io for backend hosting and Vercel for
                frontend hosting. These providers have access to data only to perform tasks on our
                behalf and are obligated to protect it.
              </li>
              <li>
                <strong>Google:</strong> Your Google OAuth tokens are shared with Google only for
                authentication purposes.
              </li>
              <li>
                <strong>Legal Compliance:</strong> We may disclose information if required by law,
                subpoena, or legal process.
              </li>
              <li>
                <strong>Security:</strong> We may disclose information to protect against fraud,
                abuse, or security threats.
              </li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              7. Your Rights and Choices
            </h2>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              7.1 Access and Portability
            </h3>
            <p className="text-foreground leading-relaxed">
              You can access all your data directly through the Bwain.app interface. You can export
              your data at any time (feature coming in V1.1).
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              7.2 Correction and Deletion
            </h3>
            <p className="text-foreground leading-relaxed">
              You can edit or delete any of your productivity data (tasks, lists, notes, etc.)
              directly in the app. To delete your entire account, contact us at privacy@bwain.app.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              7.3 Google Account Permissions
            </h3>
            <p className="text-foreground leading-relaxed">
              You can revoke Bwain.app's access to your Google account at any time by visiting your{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-twilight-600 hover:text-twilight-700 underline"
              >
                Google Account Permissions
              </a>
              .
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
              7.4 Cookies and Local Storage
            </h3>
            <p className="text-foreground leading-relaxed">
              You can clear cookies and local storage through your browser settings, but this will
              log you out and may affect functionality.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">7.5 Notifications</h3>
            <p className="text-foreground leading-relaxed">
              You can enable or disable push notifications through your device settings or browser
              permissions.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Children's Privacy</h2>
            <p className="text-foreground leading-relaxed">
              Bwain.app is not intended for children under the age of 13. We do not knowingly
              collect personal information from children under 13. If you are a parent or guardian
              and believe your child has provided us with personal information, please contact us at
              privacy@bwain.app, and we will delete such information from our systems.
            </p>
          </section>

          {/* International Users */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. International Users</h2>
            <p className="text-foreground leading-relaxed">
              Bwain.app is operated from the United States. If you are accessing our services from
              outside the United States, please be aware that your information will be transferred
              to, stored, and processed in the United States. By using our services, you consent to
              this transfer.
            </p>
          </section>

          {/* GDPR Compliance */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              10. GDPR Compliance (European Users)
            </h2>
            <p className="text-foreground leading-relaxed">
              If you are located in the European Economic Area (EEA), you have the following
              additional rights under the General Data Protection Regulation (GDPR):
            </p>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>
                <strong>Right to Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Right to Rectification:</strong> Correct inaccurate personal data
              </li>
              <li>
                <strong>Right to Erasure:</strong> Request deletion of your personal data ("right to
                be forgotten")
              </li>
              <li>
                <strong>Right to Restriction:</strong> Limit how we process your data
              </li>
              <li>
                <strong>Right to Data Portability:</strong> Receive your data in a machine-readable
                format
              </li>
              <li>
                <strong>Right to Object:</strong> Object to certain processing activities
              </li>
              <li>
                <strong>Right to Withdraw Consent:</strong> Withdraw consent at any time
              </li>
            </ul>
            <p className="text-foreground leading-relaxed mt-4">
              To exercise these rights, contact us at privacy@bwain.app. We will respond within 30
              days.
            </p>
          </section>

          {/* CCPA Compliance */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              11. CCPA Compliance (California Users)
            </h2>
            <p className="text-foreground leading-relaxed">
              If you are a California resident, the California Consumer Privacy Act (CCPA) provides
              you with the following rights:
            </p>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>
                <strong>Right to Know:</strong> What personal information we collect, use, disclose,
                and sell
              </li>
              <li>
                <strong>Right to Delete:</strong> Request deletion of your personal information
              </li>
              <li>
                <strong>Right to Opt-Out:</strong> Opt-out of the sale of personal information
                (note: we do not sell your data)
              </li>
              <li>
                <strong>Right to Non-Discrimination:</strong> We will not discriminate against you
                for exercising your rights
              </li>
            </ul>
            <p className="text-foreground leading-relaxed mt-4">
              To exercise these rights, contact us at privacy@bwain.app.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              12. Changes to This Privacy Policy
            </h2>
            <p className="text-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by:
            </p>
            <ul className="list-disc pl-6 text-foreground space-y-2 mt-2">
              <li>Posting the new Privacy Policy on this page</li>
              <li>Updating the "**Last Updated**" date at the top</li>
              <li>Sending you an email notification (for material changes)</li>
              <li>Displaying an in-app notification</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-4">
              Your continued use of Bwain.app after any changes indicates your acceptance of the
              updated Privacy Policy.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">13. Contact Us</h2>
            <p className="text-foreground leading-relaxed">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our
              data practices, please contact us:
            </p>
            <div className="bg-muted p-4 rounded-lg mt-4">
              <p className="text-foreground">
                <strong>Email:</strong> privacy@bwain.app
              </p>
              <p className="text-foreground mt-2">
                <strong>Website:</strong> https://bwain.app
              </p>
              <p className="text-foreground mt-2">
                <strong>Response Time:</strong> We aim to respond within 48 hours
              </p>
            </div>
          </section>

          {/* Consent */}
          <section className="bg-twilight-50 dark:bg-twilight-950 p-6 rounded-lg border-2 border-twilight-200 dark:border-twilight-800">
            <h2 className="text-2xl font-semibold text-foreground mb-4">14. Your Consent</h2>
            <p className="text-foreground leading-relaxed">
              By using Bwain.app, you acknowledge that you have read and understood this Privacy
              Policy and agree to its terms. If you do not agree with this policy, please do not use
              our services.
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
