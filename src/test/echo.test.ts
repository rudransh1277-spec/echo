import { beforeEach, describe, expect, it } from "vitest";
import {
  buildMessage,
  DEFAULT_CALL_NUMBERS,
  emptyProfile,
  loadProfile,
  normalizeCallNumber,
  normalizeNumber,
  PROFILE_KEY,
  saveProfile,
  type EchoProfile,
} from "@/lib/echo";

const profile: EchoProfile = {
  ...emptyProfile(),
  name: "Azhar",
  prefComm: "hearNotSpeak",
  landmark: "Block C, GEHU",
  family: [{ name: "Abba", number: "919876543210" }],
  authority: {
    ambulance: "919999900001",
    fire: "919999900002",
    police: "919999900003",
    woman: "919999900004",
    child: "919999900005",
  },
  setupDone: true,
};

describe("normalizeNumber", () => {
  it("prefixes 91 to 10-digit numbers", () => {
    expect(normalizeNumber("9876543210")).toBe("919876543210");
  });

  it("strips spaces and symbols", () => {
    expect(normalizeNumber("+91 98765-43210")).toBe("919876543210");
  });

  it("keeps already-international numbers", () => {
    expect(normalizeNumber("919999900001")).toBe("919999900001");
  });

  it("rejects too-short input", () => {
    expect(normalizeNumber("12345")).toBeNull();
  });
});

describe("buildMessage (EN)", () => {
  const message = buildMessage({
    profile,
    category: "ambulance",
    lang: "en",
    coords: { lat: 30.3165, lng: 78.0322 },
  });

  it("uses the fixed EN template", () => {
    expect(message).toContain("🚨 EMERGENCY: AMBULANCE");
    expect(message).toContain("Urgent medical help needed. Please send an ambulance.");
    expect(message).toContain("Person: Azhar");
    expect(message).toContain("Home location: Block C, GEHU");
    expect(message).toContain("Current location: https://maps.google.com/?q=30.3165,78.0322");
    expect(message).toContain("Emergency contact: Abba (919876543210)");
    expect(message).toContain("Preferred communication: I can hear, cannot speak");
    expect(message).toContain("Sent via ECHO at ");
  });

  it("medication uses its own need line", () => {
    const medication = buildMessage({
      profile,
      category: "medication",
      lang: "en",
      coords: null,
    });
    expect(medication).toContain("🚨 EMERGENCY: MEDICATION");
    expect(medication).toContain("I need medication urgently. Please help me get it.");
  });

  it("omits the Current location line without coordinates", () => {
    const noCoords = buildMessage({
      profile,
      category: "police",
      lang: "en",
      coords: null,
      gpsUnavailable: true,
    });
    expect(noCoords).not.toContain("Current location:");
  });
});

describe("buildMessage (HI)", () => {
  const message = buildMessage({
    profile,
    category: "woman",
    lang: "hi",
    coords: { lat: 30.3165, lng: 78.0322 },
  });

  it("uses the fixed HI template", () => {
    expect(message).toContain("🚨 आपातकाल: महिला हेल्पलाइन");
    expect(message).toContain("एक महिला खतरे में है और उसे मदद चाहिए।");
    expect(message).toContain("व्यक्ति: Azhar");
    expect(message).toContain("घर का स्थान: Block C, GEHU");
    expect(message).toContain("वर्तमान स्थान: https://maps.google.com/?q=30.3165,78.0322");
    expect(message).toContain("आपातकालीन संपर्क: Abba (919876543210)");
    expect(message).toContain("पसंदीदा संचार माध्यम: मैं सुन सकता हूँ, बोल नहीं सकता");
  });

  it("child helpline need line", () => {
    const child = buildMessage({ profile, category: "child", lang: "hi", coords: null });
    expect(child).toContain("एक बच्चा खतरे में है और उसे मदद चाहिए।");
  });
});

describe("normalizeCallNumber", () => {
  it("strips spaces and dashes, keeps digits only", () => {
    expect(normalizeCallNumber("10 2")).toBe("102");
    expect(normalizeCallNumber("109-1")).toBe("1091");
  });

  it("keeps short helpline numbers like 100", () => {
    expect(normalizeCallNumber("100")).toBe("100");
  });

  it("rejects fewer than 2 or more than 15 digits", () => {
    expect(normalizeCallNumber("1")).toBeNull();
    expect(normalizeCallNumber("1234567890123456")).toBeNull();
  });
});

describe("callNumbers persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("falls back to defaults when a stored profile lacks callNumbers", () => {
    const legacy = JSON.parse(JSON.stringify(profile)) as Record<string, unknown>;
    delete legacy["callNumbers"];
    localStorage.setItem(PROFILE_KEY, JSON.stringify(legacy));
    expect(loadProfile()?.callNumbers).toEqual(DEFAULT_CALL_NUMBERS);
  });

  it("loads edited call numbers back after saving", () => {
    saveProfile({
      ...profile,
      callNumbers: { ...DEFAULT_CALL_NUMBERS, police: "1123" },
    });
    expect(loadProfile()?.callNumbers?.["police"]).toBe("1123");
  });
});
