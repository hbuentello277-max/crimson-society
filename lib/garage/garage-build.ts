export const GARAGE_BUILD_POST_TYPE = "garage_build";

export type GarageBuildMetadata = {
  garage_build?: {
    motorcycle_id?: string | null;
    modification_title?: string | null;
    motorcycle_name?: string | null;
    motorcycle_year?: string | null;
  };
};

export function isGarageBuildPost(postType: string | null | undefined) {
  return postType === GARAGE_BUILD_POST_TYPE;
}

export function parseGarageBuildMetadata(metadata: unknown): GarageBuildMetadata["garage_build"] | null {
  if (!metadata || typeof metadata !== "object") return null;
  const garageBuild = (metadata as GarageBuildMetadata).garage_build;
  if (!garageBuild || typeof garageBuild !== "object") return null;
  return garageBuild;
}

export function formatGarageBuildRideLabel(
  garageBuild: GarageBuildMetadata["garage_build"] | null | undefined,
) {
  if (!garageBuild) return "Garage Build";
  const name = garageBuild.motorcycle_name?.trim();
  const year = garageBuild.motorcycle_year?.trim();
  if (name && year) return `${year} ${name}`;
  if (name) return name;
  return "Garage Build";
}

export function formatGarageBuildDate(createdAt: string) {
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
