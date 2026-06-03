import PolicyPage from "@/components/policies/PolicyPage";

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Crimson Society"
      title="Privacy Policy"
      updated="June 1, 2026"
      intro="This Privacy Policy explains how Crimson Society handles profile details, Meets, messages, garage photos, live tracking, reports, blocks, and account deletion requests."
      sections={[
        {
          title: "Information You Provide",
          body: [
            "We collect the information you add to Crimson Society, including account details, profile fields, avatar images, posts, social links, garage entries, garage bike photos, Meets, messages, reports, blocks, and account deletion requests.",
            "Public profile information may be visible to other authenticated riders, including your username, display name, avatar, bio, badges, public posts, garage entries, and hosted rides.",
          ],
        },
        {
          title: "Meets and Ride Data",
          body: [
            "When you create, join, leave, message, or report a Meet, Crimson Society stores the relevant ride and activity records so the feature can work and the community can be moderated.",
            "Meet routes, destinations, attendees, host information, and chat activity may be visible to riders who are allowed to view that Meet.",
          ],
        },
        {
          title: "Messages and Notifications",
          body: [
            "Messages and Inbox activity are stored to deliver conversations, unread badges, notifications, and abuse prevention. Message records may be reviewed when needed for safety, support, or policy enforcement.",
            "Notifications may include activity such as Meet joins, Meet messages, reports, or other community actions tied to your account.",
          ],
        },
        {
          title: "Live Location Tracking",
          body: [
            "Live tracking is off by default. If you choose to share location during an active ride, we store live latitude, longitude, optional heading, optional speed, sharing state, and update time for the ride context.",
            "Live location is intended to be visible only to riders who are permitted to view or participate in that ride. Stop sharing when you no longer want your location updated.",
          ],
        },
        {
          title: "Reports and Blocking",
          body: [
            "When you report a user, profile, post, direct message, or Meet, we store the reporter, reported user or content reference, reason, details, status, and creation time. Reports are used for moderation and community safety.",
            "When you block a rider, we store the block relationship so direct interaction can be limited where supported, including messaging and profile actions.",
          ],
        },
        {
          title: "Storage and Service Providers",
          body: [
            "Crimson Society uses Supabase for authentication, database, realtime updates, and media storage. Uploaded media such as avatars, post media, ride covers, chat media, and garage bike photos may be stored in Supabase Storage.",
            "We use technical logs and service metadata to operate the app, troubleshoot errors, protect accounts, and improve loading performance.",
          ],
        },
        {
          title: "Deletion Requests",
          body: [
            "You can request account deletion from your private profile safety controls. You must type DELETE to confirm. You are signed out immediately and your account enters deletion_pending status until an admin approves the request.",
            "While pending, you may sign in only to view deletion status, cancel the request, or read this policy and our Account Deletion page at /account-deletion.",
            "When an admin approves deletion, we cancel active Blackcard subscriptions, delete your posts and uploaded media, remove profile personal data, and delete your authentication account. Moderation and safety records may be retained as required by law. See /account-deletion for details.",
          ],
        },
      ]}
      includeSupportContact
    />
  );
}
