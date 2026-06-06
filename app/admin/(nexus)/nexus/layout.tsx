export const dynamic = "force-dynamic";

/**
 * Nexus owner gate — placeholder for Phase 1+.
 * TODO: requireOwnerSession() — platform owner only (is_platform_owner).
 * Staff admin access must not grant entry to /admin/nexus.
 */
export default function NexusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
