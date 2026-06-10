import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LiveRideRider } from "@/components/MeetMap";
import {
  applyLiveLocationRowChange,
  dedupeLiveRiders,
  filterStaleLiveRiders,
  isLiveLocationRowVisible,
  removeLiveRider,
  upsertLiveRider,
} from "@/lib/meets/live-rider-sync";

function rider(
  overrides: Partial<LiveRideRider> & Pick<LiveRideRider, "user_id">,
): LiveRideRider {
  return {
    rider_name: "Rider",
    rider_photo: null,
    lat: 29.42,
    lng: -98.49,
    ...overrides,
  };
}

describe("upsertLiveRider", () => {
  it("updates rider position for an existing user", () => {
    const initial = [rider({ user_id: "u-1", lat: 1, lng: 2 })];
    const updated = upsertLiveRider(initial, rider({ user_id: "u-1", lat: 9, lng: 8 }));

    assert.equal(updated.length, 1);
    assert.equal(updated[0]?.lat, 9);
    assert.equal(updated[0]?.lng, 8);
  });

  it("adds a rider when they join live sharing", () => {
    const initial = [rider({ user_id: "u-1" })];
    const next = upsertLiveRider(initial, rider({ user_id: "u-2", rider_name: "New Rider" }));

    assert.equal(next.length, 2);
    assert.deepEqual(
      next.map((entry) => entry.user_id),
      ["u-1", "u-2"],
    );
  });
});

describe("removeLiveRider", () => {
  it("removes a rider when they leave or stop sharing", () => {
    const initial = [rider({ user_id: "u-1" }), rider({ user_id: "u-2" })];
    const next = removeLiveRider(initial, "u-1");

    assert.deepEqual(
      next.map((entry) => entry.user_id),
      ["u-2"],
    );
  });
});

describe("dedupeLiveRiders", () => {
  it("keeps the latest duplicate update for a rider", () => {
    const next = dedupeLiveRiders([
      rider({ user_id: "u-1", lat: 1 }),
      rider({ user_id: "u-1", lat: 5 }),
      rider({ user_id: "u-2", lat: 2 }),
    ]);

    assert.equal(next.length, 2);
    assert.equal(next.find((entry) => entry.user_id === "u-1")?.lat, 5);
  });
});

describe("filterStaleLiveRiders", () => {
  it("removes riders whose last update is older than 30 minutes", () => {
    const nowMs = Date.parse("2026-06-09T12:00:00.000Z");
    const fresh = rider({
      user_id: "fresh",
      last_updated_at: "2026-06-09T11:50:00.000Z",
    });
    const stale = rider({
      user_id: "stale",
      last_updated_at: "2026-06-09T11:00:00.000Z",
    });

    const next = filterStaleLiveRiders([fresh, stale], nowMs);
    assert.deepEqual(
      next.map((entry) => entry.user_id),
      ["fresh"],
    );
  });
});

describe("isLiveLocationRowVisible", () => {
  it("hides rows with sharing disabled or expired timestamps", () => {
    const nowMs = Date.parse("2026-06-09T12:00:00.000Z");

    assert.equal(
      isLiveLocationRowVisible(
        {
          sharing_enabled: false,
          updated_at: "2026-06-09T11:59:00.000Z",
        },
        nowMs,
      ),
      false,
    );

    assert.equal(
      isLiveLocationRowVisible(
        {
          sharing_enabled: true,
          updated_at: "2026-06-09T10:00:00.000Z",
        },
        nowMs,
      ),
      false,
    );
  });
});

describe("applyLiveLocationRowChange", () => {
  it("applies insert and update events without duplicate markers", () => {
    const nowMs = Date.parse("2026-06-09T12:00:00.000Z");
    const initial: LiveRideRider[] = [];
    const row = {
      user_id: "u-1",
      lat: 10,
      lng: 20,
      updated_at: "2026-06-09T11:59:30.000Z",
      sharing_enabled: true,
    };
    const mapped = rider({ user_id: "u-1", lat: 10, lng: 20 });

    const joined = applyLiveLocationRowChange({
      riders: initial,
      row,
      rider: mapped,
      eventType: "INSERT",
      nowMs,
    });
    const moved = applyLiveLocationRowChange({
      riders: joined,
      row: { ...row, lat: 11, lng: 21 },
      rider: rider({ user_id: "u-1", lat: 11, lng: 21 }),
      eventType: "UPDATE",
      nowMs,
    });

    assert.equal(moved.length, 1);
    assert.equal(moved[0]?.lat, 11);
  });

  it("removes riders on delete events and stale stop-sharing updates", () => {
    const nowMs = Date.parse("2026-06-09T12:00:00.000Z");
    const initial = [rider({ user_id: "u-1" }), rider({ user_id: "u-2" })];

    const afterDelete = applyLiveLocationRowChange({
      riders: initial,
      row: { user_id: "u-1", lat: 1, lng: 2, updated_at: "2026-06-09T11:59:00.000Z" },
      rider: null,
      eventType: "DELETE",
      nowMs,
    });

    assert.deepEqual(
      afterDelete.map((entry) => entry.user_id),
      ["u-2"],
    );

    const afterStopSharing = applyLiveLocationRowChange({
      riders: [rider({ user_id: "u-2" })],
      row: {
        user_id: "u-2",
        lat: 1,
        lng: 2,
        updated_at: "2026-06-09T11:59:00.000Z",
        sharing_enabled: false,
      },
      rider: rider({ user_id: "u-2" }),
      eventType: "UPDATE",
      nowMs,
    });

    assert.equal(afterStopSharing.length, 0);
  });
});
