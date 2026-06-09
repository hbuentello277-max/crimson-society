import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFounderGreeting,
  resolveFounderName,
  timeOfDayGreeting,
} from "@/lib/nexus/founder-greeting";

describe("resolveFounderName", () => {
  it("prefers display_name over username", () => {
    assert.equal(resolveFounderName({ display_name: "Javi", username: "javi_rides" }), "Javi");
  });

  it("falls back to username when display_name is empty", () => {
    assert.equal(resolveFounderName({ display_name: "  ", username: "javi_rides" }), "javi_rides");
  });

  it("falls back to Founder when neither name is available", () => {
    assert.equal(resolveFounderName({ display_name: null, username: null }), "Founder");
  });
});

describe("timeOfDayGreeting", () => {
  it("uses morning between 05:00 and 11:59", () => {
    assert.equal(timeOfDayGreeting(new Date(2026, 5, 6, 5, 0)), "Good morning");
    assert.equal(timeOfDayGreeting(new Date(2026, 5, 6, 11, 59)), "Good morning");
  });

  it("uses afternoon between 12:00 and 17:59", () => {
    assert.equal(timeOfDayGreeting(new Date(2026, 5, 6, 12, 0)), "Good afternoon");
    assert.equal(timeOfDayGreeting(new Date(2026, 5, 6, 17, 59)), "Good afternoon");
  });

  it("uses evening between 18:00 and 04:59", () => {
    assert.equal(timeOfDayGreeting(new Date(2026, 5, 6, 18, 0)), "Good evening");
    assert.equal(timeOfDayGreeting(new Date(2026, 5, 6, 4, 59)), "Good evening");
    assert.equal(timeOfDayGreeting(new Date(2026, 5, 6, 0, 0)), "Good evening");
  });
});

describe("buildFounderGreeting", () => {
  it("combines time-of-day greeting with founder name", () => {
    assert.equal(
      buildFounderGreeting({ display_name: "Javi" }, new Date(2026, 5, 6, 18, 30)),
      "Good evening, Javi.",
    );
  });
});
