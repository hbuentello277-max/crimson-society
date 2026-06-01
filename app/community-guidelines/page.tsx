import PolicyPage from "@/components/policies/PolicyPage";

export default function CommunityGuidelinesPage() {
  return (
    <PolicyPage
      eyebrow="Crimson Society"
      title="Community Guidelines"
      updated="June 1, 2026"
      intro="Crimson Society is for disciplined riders, clean coordination, and a community that respects the road and each other."
      sections={[
        {
          title: "Ride With Respect",
          body: [
            "Treat riders with respect in public profiles, Meets, messages, comments, and garage interactions. No harassment, threats, hate, sexual pressure, stalking, doxxing, or impersonation.",
            "Do not shame riders for skill level, bike type, membership status, location, or whether they choose to share live location.",
          ],
        },
        {
          title: "Meet Standards",
          body: [
            "Post Meets with accurate details and realistic expectations. Hosts should make meet points, timing, routes, and ride pace clear before people show up.",
            "Do not organize illegal street racing, reckless riding, harassment rides, unsafe stunts on public roads, or Meets designed to evade law enforcement.",
          ],
        },
        {
          title: "Public Profiles",
          body: [
            "Use your public profile to represent yourself honestly. Do not impersonate another rider, club, shop, creator, brand, or Crimson Society admin.",
            "Profile photos, bios, badges, social links, posts, and garage photos must not contain threats, private personal information, stolen media, explicit abuse, or deceptive claims.",
          ],
        },
        {
          title: "Messages and Inbox",
          body: [
            "Use messages to coordinate, connect, and follow up. Do not spam riders, send scams, pressure someone after they say no, or continue contact after being blocked.",
            "If a conversation turns unsafe, block the rider and report the behavior. Screenshots and details help admins understand what happened.",
          ],
        },
        {
          title: "Garage Photos",
          body: [
            "Garage photos should show motorcycles you own, ride, or have permission to share. Avoid uploading photos that expose sensitive personal information.",
            "Do not use garage photos to sell stolen vehicles, misrepresent ownership, harass another rider, or post another person’s private property without permission.",
          ],
        },
        {
          title: "Live Tracking Etiquette",
          body: [
            "Live tracking is voluntary. Do not pressure riders to share location. Do not misuse another rider’s live location, follow them outside the Meet context, or share it elsewhere.",
            "Hosts should end ride tracking when the Meet is over. Riders should stop sharing whenever they leave the ride or no longer want to broadcast location.",
          ],
        },
        {
          title: "Reports and Blocking",
          body: [
            "Use reporting for real concerns: unsafe Meets, harassment, threats, impersonation, spam, scams, hate, privacy violations, or misuse of live tracking.",
            "Blocking is a boundary. Respect it. Attempts to work around a block may lead to account restrictions.",
          ],
        },
      ]}
    />
  );
}
