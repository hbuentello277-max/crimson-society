import PolicyPage from "@/components/policies/PolicyPage";

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Crimson Society"
      title="Privacy Policy"
      updated="June 8, 2026"
      intro="This Privacy Policy describes how Crimson Society (“we,” “us,” or “our”) collects, uses, shares, and retains information when you use our rider community platform, including profiles, posts, messaging, Meets, optional live location, push notifications, and Blackcard memberships."
      sections={[
        {
          title: "Who We Are and How to Contact Us",
          body: [
            "Crimson Society operates the Crimson Society web application and related services. For privacy questions, data requests, or account help, contact us at support@crimson-society.com or through our Support page at /support.",
            "For account deletion instructions, see /account-deletion.",
          ],
        },
        {
          title: "Eligibility",
          body: [
            "Crimson Society is intended for riders who are at least 18 years old. We do not knowingly collect personal information from anyone under 18. If you believe a minor has created an account, contact support@crimson-society.com.",
          ],
        },
        {
          title: "Information You Provide",
          body: [
            "We collect information you submit when you create and use an account, including your email address, password (stored by our authentication provider in hashed form), profile fields (username, display name, bio, location fields, riding preferences, badges, social links), avatar images, posts, comments, likes, follows, connection requests, garage entries, garage bike photos, Meets you create or join, reports, blocks, and account deletion requests.",
            "Public profile information may be visible to other authenticated members, including your username, display name, avatar, bio, badges, public posts, garage entries, and hosted Meets, subject to your privacy settings.",
            "You may control discovery visibility and whether your location appears in discovery suggestions through profile privacy settings (for example, “Show me in discovery” and location-in-discovery options).",
          ],
        },
        {
          title: "Direct Messages, Voice, and Media",
          body: [
            "When you send direct messages, we store message text, timestamps, conversation membership, and related metadata so the Inbox can deliver and display conversations.",
            "You may send image attachments and voice messages in direct conversations. Voice messages are subject to product limits (including maximum duration). We store message type, media URLs or storage paths, MIME type, file size, and duration where applicable.",
            "Message content may be reviewed by authorized administrators when needed for safety, support, fraud prevention, or enforcement of our Terms and Community Guidelines.",
          ],
        },
        {
          title: "Meets and Ride Data",
          body: [
            "When you create, join, leave, message in, or report a Meet, we store ride details (name, schedule, meet point, destination, route information, privacy setting, cover images), attendance, host information, tracking status, and Meet chat messages and photos where the feature is used.",
            "Meet information may be visible to members who are permitted to view or participate in that Meet, according to privacy settings and product rules.",
          ],
        },
        {
          title: "In-App Notifications",
          body: [
            "We store in-app notifications (for example, Meet joins, Meet chat activity, follows, direct messages, and Meet lifecycle events) so you can view activity in the Notifications tab and open relevant screens.",
          ],
        },
        {
          title: "Push Notifications",
          body: [
            "If you enable push notifications in your browser or device, we collect and store a device push token, platform (web, iOS, or Android where supported), optional browser user-agent string, and your push preference (enabled or disabled on your profile).",
            "We use Google Firebase Cloud Messaging (FCM) to deliver push notifications for eligible in-app events. Push delivery depends on your device settings and permissions. You can disable push for your account in product settings where available and through your device or browser notification controls.",
            "We do not use Firebase Analytics in the application for advertising or behavioral analytics.",
          ],
        },
        {
          title: "Live Location and Maps",
          body: [
            "Live ride tracking is off by default. If you choose to share location during an active ride, we store latitude, longitude, optional heading, optional speed, sharing state, and update time for that ride context. Live location is intended to be visible only to members permitted to view or participate in that ride.",
            "Some features (such as ride maps or discovery views) may request device location permission through your browser. You can decline permission or stop sharing at any time.",
          ],
        },
        {
          title: "Reports and Blocking",
          body: [
            "When you report a user, profile, post, direct message, or Meet, we store the reporter, reported user or content reference, reason, details, status, and timestamps. Reports are used for moderation and community safety.",
            "When you block a member, we store the block relationship so direct interaction can be limited where the product supports it, including messaging and certain profile actions.",
          ],
        },
        {
          title: "Payments (Blackcard)",
          body: [
            "Blackcard memberships are processed by Stripe, Inc. When you subscribe, Stripe collects payment method and billing information according to Stripe’s privacy policy. We receive subscription status, plan type, Stripe customer and subscription identifiers, and billing period information needed to provide membership access.",
            "We do not store full payment card numbers on our servers.",
          ],
        },
        {
          title: "Information Collected Automatically",
          body: [
            "We and our hosting and infrastructure providers may process technical information such as IP address, browser type, device information, request logs, error logs, and performance data to operate, secure, and troubleshoot the service.",
            "We use cookies and similar technologies (including browser local storage) for authentication sessions, signup preferences, and core app functionality. We do not use third-party advertising cookies.",
          ],
        },
        {
          title: "How We Use Information",
          body: [
            "We use information to provide and improve the service, authenticate users, display profiles and content, operate Meets and messaging, deliver notifications, process memberships, enforce our policies, prevent abuse, comply with law, and respond to support requests.",
            "If you are in the European Economic Area or United Kingdom, we process personal data based on contractual necessity (providing the service), legitimate interests (security, moderation, and improvement), legal obligations, and your consent where required (for example, optional location or push permissions).",
          ],
        },
        {
          title: "Service Providers",
          body: [
            "We use service providers that process data on our behalf, including: Supabase (authentication, database, realtime, and file storage); Stripe (payments); Google Firebase Cloud Messaging (push delivery); and our application hosting provider. These providers are authorized to process data only as needed to perform services for us.",
          ],
        },
        {
          title: "Retention",
          body: [
            "We retain account and content data while your account is active. Message, Meet, and profile data are deleted when account deletion is completed as described below, except where retention is required for legal or safety purposes.",
            "Push tokens are removed when you disable push, delete your account, or we complete account deletion. Moderation records (including reports and deletion audit logs) may be retained after account deletion where required for safety, fraud prevention, or legal compliance, sometimes in anonymized or minimized form.",
            "Technical logs are retained for a limited period appropriate for security and operations, then deleted or aggregated.",
          ],
        },
        {
          title: "Your Rights and Choices",
          body: [
            "Depending on where you live, you may have rights to access, correct, delete, or export personal information, or to object to or restrict certain processing. You can update profile information in the app, adjust discovery and push preferences where available, block other members, and request account deletion as described at /account-deletion.",
            "To exercise privacy rights, email support@crimson-society.com with the subject line “Privacy Request.” We may need to verify your identity before responding.",
            "California residents may have additional rights under the CCPA/CPRA, including the right to know, delete, and correct personal information, and the right to opt out of sale or sharing. We do not sell personal information for money. We do not share personal information for cross-context behavioral advertising.",
          ],
        },
        {
          title: "International Transfers",
          body: [
            "Crimson Society is operated from the United States. If you access the service from other countries, your information may be processed in the United States and other locations where our service providers operate. We use appropriate safeguards where required by applicable law.",
          ],
        },
        {
          title: "Account Deletion",
          body: [
            "You can request account deletion from your private profile: open the profile menu, go to Safety, and choose Request Account Deletion. You must type DELETE to confirm. You are signed out immediately and your account enters deletion_pending status until an administrator approves the request.",
            "While pending, you may sign in only to view deletion status, cancel the request, or read this policy and /account-deletion.",
            "When an administrator approves deletion, we cancel active Blackcard subscriptions (if cancellation fails, deletion is not completed), delete your posts and uploaded media, remove profile and garage data, delete your authentication account, and remove push tokens and social graph data tied to your account. Moderation and safety records may be retained as described at /account-deletion and in the Retention section above.",
          ],
        },
        {
          title: "Changes to This Policy",
          body: [
            "We may update this Privacy Policy from time to time. We will post the updated version with a new “Last updated” date. Material changes may also be communicated in the app or by email where appropriate. Continued use after the effective date means you accept the updated policy.",
          ],
        },
      ]}
      includeSupportContact
    />
  );
}
