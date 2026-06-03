import PolicyPage from "@/components/policies/PolicyPage";

export default function AccountDeletionPage() {
  return (
    <PolicyPage
      eyebrow="Crimson Society"
      title="Account Deletion"
      updated="June 8, 2026"
      intro="This page explains how to delete your Crimson Society account, what happens at each step, and what data may be retained for safety and legal compliance."
      sections={[
        {
          title: "How to request deletion",
          body: [
            "Open your private profile, tap the settings menu, and go to Safety → Request Account Deletion.",
            "You must type DELETE to confirm. Your request is submitted to our admin review queue.",
            "You are signed out immediately and your profile enters deletion_pending status.",
          ],
        },
        {
          title: "While deletion is pending",
          body: [
            "You may sign back in only to view deletion status, cancel a pending request, or read this page and our Privacy Policy.",
            "Other app features (feed, messages, meets, shop, and profile editing) are not available until deletion is canceled or completed.",
            "You can cancel a pending request from the deletion status screen. Canceling restores your previous account status.",
          ],
        },
        {
          title: "Admin approval and completion",
          body: [
            "An administrator reviews your request. When approved, we cancel active Blackcard (Stripe) subscriptions, delete your posts and uploaded media, remove garage and avatar files, and delete your Supabase authentication account.",
            "If subscription cancellation fails, account deletion is not completed until the issue is resolved.",
            "Deletion is irreversible once approved and completed.",
          ],
        },
        {
          title: "What we delete",
          body: [
            "Posts, comments, likes on your posts, post media, garage entries, avatars, direct-message media you sent, meet cover images you uploaded, and discovery profile data.",
            "Hosted meets you created are canceled and cover images removed. Your meet chat messages and attendance records are removed.",
            "Push notification tokens, follows, connections, and blocks involving your account are removed.",
          ],
        },
        {
          title: "What we may retain",
          body: [
            "Moderation records (reports, blocks, and deletion audit logs) may be kept without personal contact details where required for safety, fraud prevention, or legal obligations.",
            "Anonymized audit entries may include a hashed email and username snapshot for compliance purposes.",
          ],
        },
        {
          title: "Questions",
          body: [
            "Contact support if you need help with a pending request or believe deletion was completed in error.",
          ],
        },
      ]}
      includeSupportContact
    />
  );
}
