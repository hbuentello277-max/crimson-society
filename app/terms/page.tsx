import PolicyPage from "@/components/policies/PolicyPage";

export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Crimson Society"
      title="Terms of Service"
      updated="June 1, 2026"
      intro="These Terms describe the rules for using Crimson Society, including public profiles, Meets, messages, garage photos, live tracking, reporting, blocking, and account deletion requests."
      sections={[
        {
          title: "Using Crimson Society",
          body: [
            "Crimson Society is built for riders to discover each other, share public profiles, organize Meets, exchange messages, show garage photos, and use optional live ride tracking.",
            "You are responsible for the information, photos, messages, routes, Meets, and other content you submit. Do not use Crimson Society for unlawful activity, harassment, impersonation, spam, or unsafe riding behavior.",
          ],
        },
        {
          title: "Meets and Riding",
          body: [
            "Meets are community-created plans. Hosts are responsible for posting accurate meet points, destinations, times, expectations, and updates. Riders are responsible for deciding whether a Meet is appropriate for their skill level, vehicle, and local conditions.",
            "Crimson Society does not control roads, weather, traffic, law enforcement, other riders, or venue conditions. Always follow traffic laws, wear appropriate safety gear, and ride within your limits.",
          ],
        },
        {
          title: "Public Profiles and Garage Photos",
          body: [
            "Public profiles may show your avatar, display name, username, bio, social links, badges, posts, garage entries, and hosted rides. Your garage photos should show motorcycles you own or have permission to share.",
            "Do not upload images that expose another person’s private information, license plates you are not comfortable making visible, stolen content, or media that violates someone else’s rights.",
          ],
        },
        {
          title: "Messages and Inbox",
          body: [
            "Messages are intended for rider-to-rider coordination and community conversation. Do not threaten, harass, spam, scam, or pressure other members.",
            "Blocking a rider is designed to limit direct interaction, including messaging where supported. Reporting helps Crimson Society review behavior that may violate these Terms or the Community Guidelines.",
          ],
        },
        {
          title: "Live Tracking",
          body: [
            "Live tracking is optional and requires a user action and browser permission. You should only share live location when you understand who can view it in the ride context.",
            "Hosts may start or end ride tracking for a Meet. Riders can stop sharing location at any time. Live tracking is a beta feature and should not be used as an emergency service or sole safety tool.",
          ],
        },
        {
          title: "Reports, Blocking, and Enforcement",
          body: [
            "You may report profiles, users, Meets, or ride content for safety, abuse, impersonation, harassment, or other policy concerns. Reports may be reviewed by Crimson Society admins or owners.",
            "We may remove content, limit features, suspend accounts, or take other action when we believe it is needed to protect the community or comply with law.",
          ],
        },
        {
          title: "Account Deletion Requests",
          body: [
            "During beta, account deletion is handled as a request so shared Meet, message, tracking, and safety records can be reviewed before anything destructive happens.",
            "Submitting a deletion request does not immediately remove all content. Some records may be retained when needed for safety, legal, fraud prevention, moderation, or shared community history.",
          ],
        },
      ]}
    />
  );
}
