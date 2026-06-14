import assert from "node:assert/strict";
import { describe, it } from "node:test";
import en from "@/translations/en.json";
import es from "@/translations/es.json";
import { translate } from "@/lib/i18n/language";

const phase5bSections = [
  "nav",
  "dashboard",
  "inbox",
  "shop",
  "credits",
  "blackcard",
  "sos",
  "settings",
  "admin",
] as const;

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" ? flattenKeys(child, path) : [path];
  });
}

describe("Phase 5B translations", () => {
  it("keeps English and Spanish Phase 5B sections in sync", () => {
    for (const section of phase5bSections) {
      assert.deepEqual(flattenKeys(es[section]).sort(), flattenKeys(en[section]).sort(), section);
    }
  });

  it("translates representative fixed UI across Phase 5B areas", () => {
    assert.equal(translate("es", "nav.home"), "Inicio");
    assert.equal(translate("es", "dashboard.feedEyebrow"), "El feed");
    assert.equal(translate("es", "inbox.notifications"), "Notificaciones");
    assert.equal(translate("es", "shop.bag"), "Bolsa");
    assert.equal(translate("es", "credits.historyTitle"), "Historial de créditos");
    assert.equal(translate("es", "blackcard.activeTitle"), "El acceso Blackcard está activo.");
    assert.equal(translate("es", "sos.activate"), "Activar SOS");
    assert.equal(translate("es", "settings.privacy"), "Privacidad");
    assert.equal(translate("es", "admin.controlRoom"), "Centro de control");
  });
});
