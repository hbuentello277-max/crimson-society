import PolicyPage from "@/components/policies/PolicyPage";

export default function SafetyPage() {
  return (
    <PolicyPage
      eyebrow="Crimson Society"
      title="Safety Center"
      updated="June 1, 2026"
      intro="Safety in Crimson Society means clear boundaries, thoughtful Meet planning, optional location sharing, and practical tools for reports, blocks, and account deletion requests."
      sections={[
        {
          title: "Before a Meet",
          body: [
            "Review the host, route, meet point, destination, time, privacy setting, and ride expectations before joining. Choose Meets that match your skill level, bike condition, gear, and comfort.",
            "Tell someone you trust where you are going. Check weather, fuel, road conditions, and local laws. Crimson Society is not an emergency service.",
          ],
        },
        {
          title: "During a Ride",
          body: [
            "Ride legally and within your limits. Leave space, respect signals, and do not pressure anyone to ride faster, share location, or continue after they are uncomfortable.",
            "If live tracking is active, remember that location sharing is optional. Stop sharing when you leave the ride or no longer want updates saved.",
          ],
        },
        {
          title: "Live Tracking Controls",
          body: [
            "Live tracking starts only after explicit user action and browser permission. Hosts can start and end ride tracking, and riders can start or stop sharing their own location while a ride is active.",
            "When a ride ends, tracking should be disabled and live location records should no longer be updated. Do not rely on live tracking for emergencies, rescue, or crash detection.",
          ],
        },
        {
          title: "Messages and Boundaries",
          body: [
            "If a rider makes you uncomfortable in messages or through a public profile, use block and report. Blocking is intended to limit direct interaction, including messaging where supported.",
            "Do not share private message content outside the app to harass, shame, threaten, or coordinate retaliation against another rider.",
          ],
        },
        {
          title: "Reporting",
          body: [
            "Report profiles, users, or Meets when you see harassment, threats, impersonation, scams, unsafe ride planning, privacy violations, or misuse of garage photos or live tracking.",
            "Include a clear reason and helpful details. Reports may be reviewed by admins or owners and may result in content removal, account limits, or other safety action.",
          ],
        },
        {
          title: "Garage and Profile Safety",
          body: [
            "Public profiles and garage photos can reveal personal details. Avoid posting images that expose your home address, workplace, regular parking spot, license plate, or another person’s private property.",
            "Use profile privacy settings where available, and keep social links current so other riders know they are connecting with the right person.",
          ],
        },
        {
          title: "Account Deletion Requests",
          body: [
            "You can request account deletion from your private profile safety controls. Deletion is irreversible once an admin marks a request completed.",
            "Immediately after completion, sign-in and app access are disabled. Your request may stay pending or under review before that step. Reports and moderation history are preserved for community safety.",
            "Cancel a pending request from profile settings while it is still pending. If you need urgent safety help, contact local emergency services first. Crimson Society tools are community safety features, not emergency response systems.",
          ],
        },
      ]}
    />
  );
}
