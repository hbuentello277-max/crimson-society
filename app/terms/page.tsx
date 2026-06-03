import PolicyPage from "@/components/policies/PolicyPage";

export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Crimson Society"
      title="Terms of Service"
      updated="June 8, 2026"
      intro="These Terms of Service (“Terms”) govern your access to and use of Crimson Society. By creating an account or using the service, you agree to these Terms, our Privacy Policy at /privacy, and our Community Guidelines at /community-guidelines."
      sections={[
        {
          title: "Eligibility and Account Registration",
          body: [
            "You must be at least 18 years old to use Crimson Society. By registering, you represent that you meet this requirement and that the information you provide is accurate.",
            "You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. Notify us promptly at support@crimson-society.com if you believe your account has been compromised.",
          ],
        },
        {
          title: "Using Crimson Society",
          body: [
            "Crimson Society is a rider community platform for discovering members, sharing public profiles, organizing Meets, exchanging messages (including voice and media), showing garage photos, and using optional live ride tracking.",
            "You are responsible for all content and conduct associated with your account. Do not use the service for unlawful activity, harassment, impersonation, spam, scams, or unsafe riding behavior.",
          ],
        },
        {
          title: "User Content and License",
          body: [
            "You retain ownership of content you submit. By posting or uploading content (including text, photos, audio, video, routes, and profile information), you grant Crimson Society a non-exclusive, worldwide, royalty-free license to host, store, reproduce, display, distribute, and adapt that content solely to operate, promote, and improve the service, enforce these Terms, and comply with law.",
            "This license ends when your content is deleted, except for reasonable backup retention and copies retained for moderation, legal compliance, or dispute resolution as described in our Privacy Policy.",
          ],
        },
        {
          title: "Prohibited Conduct",
          body: [
            "You may not violate law, infringe intellectual property, upload malware, attempt unauthorized access, scrape the service, circumvent blocks or bans, harass or threaten others, distribute hate or sexual exploitation content, organize dangerous or illegal riding activity, impersonate others, or misuse reports or deletion tools.",
            "Additional community standards appear in our Community Guidelines at /community-guidelines, which are incorporated into these Terms by reference.",
          ],
        },
        {
          title: "Public Profiles and Garage Photos",
          body: [
            "Public profiles may show your avatar, display name, username, bio, social links, badges, posts, garage entries, and hosted Meets. Garage photos should depict motorcycles you own, ride, or have permission to share.",
            "Do not upload content that exposes another person’s private information without consent, stolen media, or material that violates someone else’s rights.",
          ],
        },
        {
          title: "Messages and Inbox",
          body: [
            "Messages are for rider coordination and community conversation. You may send text, images, and voice messages subject to product limits. Do not threaten, harass, spam, scam, or pressure other members.",
            "Blocking limits direct interaction where supported. Reporting helps us review conduct that may violate these Terms or the Community Guidelines. We may review message content for safety and enforcement.",
          ],
        },
        {
          title: "Meets, Riding, and Assumption of Risk",
          body: [
            "Meets are community-created plans, not professional events. Hosts are responsible for accurate meet points, destinations, times, and expectations. Riders decide whether a Meet fits their skill, vehicle, gear, and local conditions.",
            "MOTORCYCLE RIDING AND GROUP RIDES INVOLVE INHERENT RISK OF SERIOUS INJURY OR DEATH. YOU PARTICIPATE VOLUNTARILY AND ASSUME ALL RISK. Crimson Society does not organize, supervise, or control rides, roads, traffic, weather, law enforcement, other participants, or venue conditions.",
            "Crimson Society is not a transportation provider, emergency service, insurer, or agent of any host or rider. Always obey traffic laws, wear appropriate safety gear, and ride within your limits.",
          ],
        },
        {
          title: "Live Tracking",
          body: [
            "Live tracking is optional and requires your explicit action and browser or device permission. Share live location only when you understand who may view it in the Meet context.",
            "Hosts may start or end ride tracking for a Meet. Riders may stop sharing at any time. Live tracking is not an emergency, rescue, or crash-detection service and must not be relied on as your sole safety measure.",
          ],
        },
        {
          title: "Blackcard Subscriptions",
          body: [
            "Blackcard is an optional paid membership billed through Stripe. Available plans may include monthly or yearly subscriptions as shown at checkout. Prices and features are displayed before purchase.",
            "Subscriptions renew automatically at the end of each billing period unless canceled before renewal. You authorize Stripe to charge your payment method for recurring fees and applicable taxes.",
            "You may cancel renewal by canceling your subscription through Stripe customer flows where provided, or by completing account deletion as described below. Fees already paid are generally non-refundable except where required by law or expressly stated at purchase.",
            "We may change prices or features with notice where required. Continued use after a price change constitutes acceptance if permitted by law.",
            "If account deletion is approved, we attempt to cancel active Blackcard subscriptions before completing deletion. If Stripe cancellation fails, deletion may be delayed until the issue is resolved.",
          ],
        },
        {
          title: "Mobile Apps and Payments",
          body: [
            "If you access Crimson Society through a native mobile app or installed web app, membership purchases may be completed through our website checkout powered by Stripe. Third-party app store billing rules may apply to certain native distribution models; follow in-app purchase instructions where presented.",
            "Apple and Google are not parties to these Terms and are not responsible for the service or content.",
          ],
        },
        {
          title: "Reports, Blocking, and Enforcement",
          body: [
            "You may report profiles, users, posts, direct messages, or Meets for safety, abuse, impersonation, harassment, or other policy concerns. Reports may be reviewed by administrators.",
            "We are not obligated to monitor all content but may remove content, limit features, suspend, or terminate accounts at our discretion to protect the community or comply with law. Enforcement decisions are final except where law requires otherwise.",
            "To appeal an enforcement action, contact support@crimson-society.com with relevant details.",
          ],
        },
        {
          title: "Account Suspension and Termination",
          body: [
            "We may suspend or terminate your access immediately for violations of these Terms, the Community Guidelines, suspected fraud, legal requirements, or risk to the community. You may stop using the service at any time.",
          ],
        },
        {
          title: "Account Deletion",
          body: [
            "You may request account deletion from your private profile: open the profile menu, go to Safety, and choose Request Account Deletion. You must type DELETE to confirm. Your request enters an admin review queue and your account moves to deletion_pending status. You are signed out immediately.",
            "While a request is pending, you may sign in only to view deletion status, cancel the request, or read /account-deletion and /privacy. You can cancel a pending request from the deletion status screen.",
            "When an administrator approves deletion, we cancel active Blackcard subscriptions (deletion does not complete if Stripe cancellation fails), delete your posts and uploaded media, remove profile and garage data, delete your authentication account, and remove push tokens and social data tied to your account. Deletion is irreversible once completed.",
            "We may retain moderation records (including reports, blocks, and deletion audit logs) as described in our Privacy Policy and at /account-deletion. See /account-deletion for full details.",
          ],
        },
        {
          title: "Disclaimer of Warranties",
          body: [
            "CRIMSON SOCIETY IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.",
            "WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF HARMFUL COMPONENTS, OR THAT CONTENT WILL BE ACCURATE OR RELIABLE.",
          ],
        },
        {
          title: "Limitation of Liability",
          body: [
            "TO THE MAXIMUM EXTENT PERMITTED BY LAW, CRIMSON SOCIETY AND ITS OPERATORS, AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING FROM YOUR USE OF THE SERVICE, MEETS, RIDING ACTIVITIES, LOCATION SHARING, MESSAGES, OR CONTENT FROM OTHER USERS.",
            "TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS OR THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US FOR BLACKCARD IN THE TWELVE (12) MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS (USD $100).",
            "SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN THOSE CASES, OUR LIABILITY IS LIMITED TO THE FULLEST EXTENT PERMITTED BY LAW.",
          ],
        },
        {
          title: "Indemnification",
          body: [
            "You agree to defend, indemnify, and hold harmless Crimson Society and its operators, affiliates, officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including reasonable attorneys’ fees) arising from your content, your use of the service, your participation in Meets or rides, your violation of these Terms, or your violation of any law or third-party rights.",
          ],
        },
        {
          title: "Copyright and DMCA",
          body: [
            "We respect intellectual property rights. If you believe content on Crimson Society infringes your copyright, send a notice to support@crimson-society.com with: identification of the work, identification of the material, your contact information, a statement of good-faith belief, a statement under penalty of perjury that your notice is accurate, and your physical or electronic signature.",
            "We may remove or disable access to reported material and terminate repeat infringers where appropriate.",
          ],
        },
        {
          title: "Governing Law and Disputes",
          body: [
            "These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict-of-law principles, except where mandatory consumer protection laws in your country of residence require otherwise.",
            "Except where prohibited by law, you agree that disputes arising from these Terms or the service will be resolved in the state or federal courts located in Delaware, and you consent to personal jurisdiction in those courts.",
            "Before filing a claim, you agree to contact support@crimson-society.com and attempt to resolve the dispute informally for at least thirty (30) days.",
          ],
        },
        {
          title: "Changes to These Terms",
          body: [
            "We may update these Terms from time to time. We will post the updated version with a new “Last updated” date. Material changes may be communicated in the app or by email where appropriate. Continued use after the effective date constitutes acceptance of the updated Terms.",
            "If you do not agree to updated Terms, stop using the service and request account deletion at /account-deletion.",
          ],
        },
        {
          title: "Miscellaneous",
          body: [
            "If any provision of these Terms is held invalid, the remaining provisions remain in effect. Our failure to enforce a provision is not a waiver. These Terms, the Privacy Policy, and the Community Guidelines are the entire agreement between you and Crimson Society regarding the service.",
          ],
        },
      ]}
      includeSupportContact
    />
  );
}
