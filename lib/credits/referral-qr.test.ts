import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readReferralCodeFromSignupUrl } from "@/lib/credits/referral-link";
import {
  buildPublicReferralSignupUrl,
  PUBLIC_APP_SIGNUP_URL,
  PUBLIC_REFERRAL_SIGNUP_ORIGIN,
} from "@/lib/credits/referral-public-origin";
import {
  buildQrDataUrlWithModule,
  buildQrPngBlobWithModule,
  type QrCodeModule,
} from "@/lib/credits/referral-qr";
import {
  appQrDownloadFilename,
  REFERRAL_QR_BASE_OPTIONS,
  referralQrDownloadFilename,
} from "@/lib/credits/referral-qr-options";

const browserQrCodeModule: QrCodeModule = {
  async toDataURL(text: string) {
    return `data:image/png;base64,${Buffer.from(text).toString("base64")}`;
  },
};

describe("public referral signup url", () => {
  it("builds the canonical production signup url for qr codes", () => {
    const url = buildPublicReferralSignupUrl("JAVI10");
    assert.equal(url, `${PUBLIC_REFERRAL_SIGNUP_ORIGIN}/signup?ref=JAVI10`);
  });

  it("exposes the official app signup url without referral params", () => {
    assert.equal(PUBLIC_APP_SIGNUP_URL, `${PUBLIC_REFERRAL_SIGNUP_ORIGIN}/signup`);
    const params = new URL(PUBLIC_APP_SIGNUP_URL).searchParams;
    assert.equal(params.get("ref"), null);
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

  it("builds stable download filenames", () => {
    assert.equal(referralQrDownloadFilename("JAVI10"), "crimson-society-referral-javi10.png");
    assert.equal(referralQrDownloadFilename("rider-210"), "crimson-society-referral-rider-210.png");
    assert.equal(appQrDownloadFilename(), "crimson-society-app-signup.png");
  });

  it("builds a png data url for the signup link", async () => {
    const signupUrl = buildPublicReferralSignupUrl("JAVI10");
    assert.equal(signupUrl, `${PUBLIC_REFERRAL_SIGNUP_ORIGIN}/signup?ref=JAVI10`);

    const { buildQrDataUrl } = await import("@/lib/credits/referral-qr");
    const dataUrl = await buildQrDataUrl(signupUrl!);
    assert.match(dataUrl, /^data:image\/png;base64,/);
  });

  it("loads browser qrcode builds that only expose toDataURL", async () => {
    const dataUrl = await buildQrDataUrlWithModule(PUBLIC_APP_SIGNUP_URL, browserQrCodeModule, 64);
    assert.match(dataUrl, /^data:image\/png;base64,/);
  });

  it("builds png blobs from browser qrcode builds without toBuffer", async () => {
    const blob = await buildQrPngBlobWithModule(PUBLIC_APP_SIGNUP_URL, browserQrCodeModule, 64);
    assert.equal(blob.type, "image/png");
    assert.ok(blob.size > 0);
  });
});
