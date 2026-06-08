import { redirect } from "next/navigation";

export default function LegacyRideTrackRedirect() {
  redirect("/meets/live");
}
