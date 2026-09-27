import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './privacy-policy.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy | Referral First',
  description: 'How Referral First handles account, job listing, and browser extension data.'
};

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">Referral First</Link>
        <Link className={styles.backLink} href="/">Back to dashboard</Link>
      </header>

      <article className={styles.article}>
        <p className={styles.eyebrow}>Privacy</p>
        <h1>Privacy Policy</h1>
        <p className={styles.updated}>Effective September 27, 2026</p>
        <p className={styles.intro}>
          This policy explains how Referral First handles information when you use the website and browser extension.
        </p>

        <section>
          <h2>Information we collect</h2>
          <p>When you create an account, we collect your name, email address, password, and time zone. Passwords are stored as password hashes, not as readable passwords.</p>
          <p>When you save a job, we store the job title, company, job URL, source, and any available location, company LinkedIn URL, or logo URL. We also store referral status, related dates, and reminder settings so the tracker can display your opportunities and schedule reminders.</p>
          <p>When you open the extension, it reads the active tab’s URL and title and may inspect the page for publicly available job details, such as the title, company, and location. Captured job details are sent to your account only when you choose to track the opportunity. The extension does not continuously monitor tabs.</p>
        </section>

        <section>
          <h2>How we use information</h2>
          <p>We use this information to provide account access, save and display your job opportunities, apply your time zone and reminder settings, and schedule referral follow-up reminders. If you enable browser notifications, the website may display reminders through your browser’s notification feature.</p>
        </section>

        <section>
          <h2>Cookies and security</h2>
          <p>Referral First uses an authentication cookie to keep you signed in and authorize requests to the API. The cookie is marked HttpOnly and, in production, Secure. This prevents page scripts from reading the cookie and limits it to HTTPS connections.</p>
          <p>We use reasonable safeguards to protect information, but no internet transmission or storage system can be guaranteed completely secure.</p>
        </section>

        <section>
          <h2>Service providers</h2>
          <p>We use hosting and infrastructure providers to operate the website, API, database, and reminder queue. These providers process information as needed to provide those services. We do not sell your personal information.</p>
        </section>

        <section>
          <h2>Retention and your choices</h2>
          <p>Your account and job information is retained to provide the service. You can remove tracked jobs from your dashboard. To request deletion of your account information or ask a privacy question, contact the developer using the contact details on the Referral First Chrome Web Store listing.</p>
        </section>

        <section>
          <h2>Changes and contact</h2>
          <p>We may update this policy as the service changes. The effective date above indicates when it was last revised. For questions about this policy or your information, use the developer contact details on the Chrome Web Store listing.</p>
        </section>

        <footer className={styles.footer}>
          <Link href="/">Referral First</Link>
          <span>Privacy Policy</span>
        </footer>
      </article>
    </main>
  );
}