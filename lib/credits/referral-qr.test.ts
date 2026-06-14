import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readReferralCodeFromSignupUrl } from "@/lib/credits/referral-link";
import {
  buildPublicReferralSignupUrl,
  PUBLIC_REFERRAL_SIGNUP_ORIGIN,
} from "@/lib/credits/referral-public-origin";
import {
  REFERRAL_QR_BASE_OPTIONS,
  referralQrDownloadFilename,
} from "@/lib/credits/referral-qr-options";

describe("public referral signup url", () => {
  it("builds the canonical production signup url for qr codes", () => {
    const url = buildPublicReferralSignupUrl("JAVI10");
    assert.equal(url, `${PUBLIC_REFERRAL_SIGNUP_ORIGIN}/signup?ref=JAVI10`);
  });

  it("still reads referral codes from signup urls", () => {
    const code = readReferralCodeFromSignupUrl(
      new URLSearchParams("ref=JAVI10"),
    );
    assert.equal(code, "JAVI10");
  });
});

describe("referral qr helpers", () => {
  it("uses high error correction for print-friendly qr codes", () => {
    assert.equal(REFERRAL_QR_BASE_OPTIONS.errorCorrectionLevel, "H");
    assert.equal(REFERRAL_QR_BASE_OPTIONS.margin, 2);
  });

  it("builds a stable download filename", () => {
    assert.equal(referralQrDownloadFilename("JAVI10"), "crimson-society-referral-javi10.png");
    assert.equal(referralQrDownloadFilename("rider-210"), "crimson-society-referral-rider-210.png");
  });

  it("builds a png data url for the signup link", async () => {
    const signupUrl = buildPublicReferralSignupUrl("JAVI10");
    assert.equal(signupUrl, `${PUBLIC_REFERRAL_SIGNUP_ORIGIN}/signup?ref=JAVI10`);

    const { buildReferralQrDataUrl } = await import("@/lib/credits/referral-qr");
    const dataUrl = await buildReferralQrDataUrl(signupUrl!);
    assert.match(dataUrl, /^data:image\/png;base64,/);
  });
});
