import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  brandedAppQrCanvasHeight,
  brandedAppQrUsesHighErrorCorrection,
  defaultAppQrBrandCopy,
} from "@/lib/credits/app-qr-brand-image";
import { PUBLIC_APP_SIGNUP_URL } from "@/lib/credits/referral-public-origin";

describe("app qr branding", () => {
  it("builds default brand copy for the official signup url", () => {
    const brand = defaultAppQrBrandCopy({
      heading: "Join Crimson Society",
      slogan: "Built Different. Ride Different.",
    });

    assert.equal(brand.targetUrl, PUBLIC_APP_SIGNUP_URL);
    assert.equal(brand.heading, "Join Crimson Society");
    assert.equal(brand.slogan, "Built Different. Ride Different.");
    assert.equal(new URL(brand.targetUrl).searchParams.get("ref"), null);
  });

  it("uses print-friendly export dimensions and qr settings", () => {
    assert.equal(brandedAppQrCanvasHeight(1200), 1536);
    assert.equal(brandedAppQrUsesHighErrorCorrection(), true);
  });
});
