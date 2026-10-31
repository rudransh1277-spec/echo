// ECHO core: types, i18n dictionary, storage, message templates.
// No backend, no AI — everything here is pure functions + localStorage.

export type Lang = "en" | "hi";
export type AlertChannel = "whatsapp" | "sms";
export type Category =
  | "ambulance"
  | "fire"
  | "police"
  | "woman"
  | "child"
  | "medication";
export type PrefComm = "text" | "sign" | "hearNotSpeak";
export type Coords = { lat: number; lng: number };
export type FamilyContact = { name: string; number: string };

export type EchoProfile = {
  name: string;
  prefComm: PrefComm;
  landmark: string;
  family: FamilyContact[];
  authority: Record<
    "ambulance" | "fire" | "police" | "woman" | "child",
    string
  >;
  callNumbers: CallNumbers;
  setupDone: boolean;
};

export const DEFAULT_AUTHORITY = {
  ambulance: "919999900001",
  fire: "919999900002",
  police: "919999900003",
  woman: "919999900004",
  child: "919999900005",
};

export type CallNumbers = Record<
  "ambulance" | "fire" | "police" | "woman" | "child",
  string
>;

export const DEFAULT_CALL_NUMBERS: CallNumbers = {
  ambulance: "102",
  fire: "101",
  police: "112",
  woman: "1091",
  child: "1098",
};

export const emptyProfile = (): EchoProfile => ({
  name: "",
  prefComm: "text",
  landmark: "",
  family: [],
  authority: { ...DEFAULT_AUTHORITY },
  callNumbers: { ...DEFAULT_CALL_NUMBERS },
  setupDone: false,
});

// ---------- storage (all wrapped in try/catch) ----------

export const ls = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  },
};

export const ss = {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  },
  remove(key: string) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  },
};

export const PROFILE_KEY = "echo:profile";
export const LANG_KEY = "echo:lang";
export const THEME_KEY = "echo:theme";
export const COORDS_KEY = "echo:lastCoords";
export const PENDING_KEY = "echo:pendingFlow";

export function loadProfile(): EchoProfile | null {
  const raw = ls.get(PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EchoProfile;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      ...emptyProfile(),
      ...parsed,
      authority: { ...DEFAULT_AUTHORITY, ...parsed.authority },
      callNumbers: { ...DEFAULT_CALL_NUMBERS, ...(parsed.callNumbers ?? {}) },
      family: Array.isArray(parsed.family) ? parsed.family.slice(0, 2) : [],
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile: EchoProfile) {
  ls.set(PROFILE_KEY, JSON.stringify(profile));
}

// ---------- numbers ----------

/**
 * Normalize to digits-only international format.
 * 10 digits => prefix 91. Returns null when invalid.
 */
export function normalizeNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const withCountryCode = digits.length === 10 ? "91" + digits : digits;
  if (withCountryCode.length < 10 || withCountryCode.length > 15) return null;
  return withCountryCode;
}

/** Call numbers: digits only, 2–15 characters. */
export function normalizeCallNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 2 || digits.length > 15) return null;
  return digits;
}

export function waUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// ---------- dictionary ----------

const en = {
  appName: "ECHO",
  banner:
    "Messages go to the numbers set in Settings. Call buttons dial real helplines.",
  whatsapp: "WhatsApp",
  sms: "SMS",
  call: "Call",
  speakEmergency: "Speak your emergency",
  listening: "Listening…",
  voiceTryAgain: "Listening stopped. Check microphone access or tap to try again.",
  retryVoice: "Try again",
  detailsOptional: "Details (optional)",
  detailsPlaceholder: "Type or speak up to 12 words",
  voiceUnsupported: "Voice not supported here, type instead",
  categoryLabel: "Emergency type",
  homeLocationHelp: "Shown as your home location in alerts.",
  locLocating: "Locating",
  locReady: "Ready",
  locDenied: "Denied",
  call112: "Call 112",
  installApp: "Install app",
  iosHint: "Share → Add to Home Screen",
  cancel: "Cancel",
  sendAlert: "SEND ALERT",
  sendAlertVia: "SEND ALERT via {channel}",
  recipients: "Recipients",
  authorityLabel: "Authority",
  familyLabel: "Family",
  stepNowFamily: "Now notify your family",
  stepAlertSent: "Alert {n} sent ✓.",
  notify: "Notify {name}",
  skip: "Skip",
  doneTitle: "All steps complete",
  doneSub: "Your alert has been sent to everyone available.",
  sendAgain: "Send again",
  backHome: "Back home",
  settings: "Settings",
  setupTitle: "Set up ECHO",
  setupSub:
    "One-time setup so one tap is all it takes in an emergency.",
  yourName: "Your name",
  namePlaceholder: "e.g. Azhar",
  languageLabel: "Language",
  prefCommLabel: "Preferred communication",
  prefText: "Text only",
  prefSign: "Sign / gestures",
  prefHear: "I can hear, cannot speak",
  landmarkLabel: "Home location",
  landmarkPlaceholder: "e.g. Block C, GEHU",
  familyContacts: "Family contacts (up to 2)",
  contactName: "Contact name",
  contactNamePlaceholder: "e.g. Abba",
  whatsappNumber: "WhatsApp number",
  numberPlaceholder: "e.g. 9876543210",
  addContact: "Add contact",
  removeContact: "Remove",
  authorityNumbers: "Authority numbers",
  demoHint: "Demo number: replace with a working number",
  enableLocation: "Enable location",
  locationRequested: "Location requested",
  save: "Save & finish",
  saveSettings: "Save settings",
  close: "Close",
  errName: "Please enter your name.",
  errLandmark: "Please enter a landmark or address.",
  errContactName: "Enter a name for this contact, or remove the row.",
  errNumber:
    "Enter a valid WhatsApp number (at least 10 digits).",
  callNumbersLabel: "Call numbers",
  callNumberHint: "Change to a test number while demoing",
  messageAria: "Message {category}",
  callAria: "Call {category}",
  errCallNumber: "Enter 2–15 digits.",
  emergencyTitle: "Emergency message",
  madeWith: "Does not replace emergency services.",
};

export type Dict = typeof en;

const hi: Record<keyof typeof en, string> = {
  appName: "ECHO",
  banner:
    "संदेश सेटिंग्स में दिए नंबरों पर जाते हैं। कॉल बटन असली हेल्पलाइन को डायल करते हैं।",
  whatsapp: "व्हाट्सऐप",
  sms: "एसएमएस",
  call: "कॉल",
  speakEmergency: "अपनी आपात स्थिति बोलें",
  listening: "सुन रहा हूँ…",
  voiceTryAgain: "आवाज़ रुक गई। माइक्रोफ़ोन की अनुमति जाँचें या फिर से टैप करें।",
  retryVoice: "फिर से कोशिश करें",
  detailsOptional: "विवरण (वैकल्पिक)",
  detailsPlaceholder: "12 शब्द तक लिखें या बोलें",
  voiceUnsupported: "यहाँ आवाज़ समर्थित नहीं है, टाइप करें",
  categoryLabel: "आपात स्थिति का प्रकार",
  homeLocationHelp: "अलर्ट में आपके घर के स्थान के रूप में दिखाया जाएगा।",
  locLocating: "लोकेशन खोज रहे हैं",
  locReady: "तैयार",
  locDenied: "अस्वीकृत",
  call112: "112 पर कॉल करें",
  installApp: "ऐप इंस्टॉल करें",
  iosHint: "शेयर करें → होम स्क्रीन पर जोड़ें",
  cancel: "रद्द करें",
  sendAlert: "अलर्ट भेजें",
  sendAlertVia: "{channel} से अलर्ट भेजें",
  recipients: "प्राप्तकर्ता",
  authorityLabel: "आधिकारिक",
  familyLabel: "परिवार",
  stepNowFamily: "अब अपने परिवार को सूचित करें",
  stepAlertSent: "अलर्ट {n} भेजा गया ✓.",
  notify: "{name} को सूचित करें",
  skip: "छोड़ें",
  doneTitle: "सभी चरण पूरे हुए",
  doneSub: "आपका अलर्ट उपलब्ध सभी लोगों को भेज दिया गया है।",
  sendAgain: "दोबारा भेजें",
  backHome: "होम पर जाएँ",
  settings: "सेटिंग्स",
  setupTitle: "ECHO सेट अप करें",
  setupSub: "एक बार सेट अप करें ताकि आपातकाल में एक टैप ही काफ़ी हो।",
  yourName: "आपका नाम",
  namePlaceholder: "जैसे: अज़हर",
  languageLabel: "भाषा",
  prefCommLabel: "पसंदीदा संचार माध्यम",
  prefText: "केवल टेक्स्ट",
  prefSign: "सांकेतिक भाषा / इशारे",
  prefHear: "मैं सुन सकता हूँ, बोल नहीं सकता",
  landmarkLabel: "घर का स्थान",
  landmarkPlaceholder: "जैसे: Block C, GEHU",
  familyContacts: "परिवार के संपर्क (अधिकतम 2)",
  contactName: "संपर्क का नाम",
  contactNamePlaceholder: "जैसे: अब्बा",
  whatsappNumber: "WhatsApp नंबर",
  numberPlaceholder: "जैसे: 9876543210",
  addContact: "संपर्क जोड़ें",
  removeContact: "हटाएँ",
  authorityNumbers: "आधिकारिक नंबर",
  demoHint: "डेमो नंबर: काम करने वाला नंबर डालें",
  enableLocation: "लोकेशन चालू करें",
  locationRequested: "लोकेशन का अनुरोध किया गया",
  save: "सेव करें और पूरा करें",
  saveSettings: "सेटिंग्स सेव करें",
  close: "बंद करें",
  errName: "कृपया अपना नाम भरें।",
  errLandmark: "कृपया लैंडमार्क या पता भरें।",
  errContactName: "इस संपर्क का नाम भरें, या पंक्ति हटाएँ।",
  errNumber: "एक मान्य WhatsApp नंबर भरें (कम से कम 10 अंक)।",
  callNumbersLabel: "कॉल नंबर",
  callNumberHint: "डेमो के समय टेस्ट नंबर डालें",
  messageAria: "{category} को संदेश भेजें",
  callAria: "{category} को कॉल करें",
  errCallNumber: "2–15 अंक भरें।",
  emergencyTitle: "आपातकालीन संदेश",
  madeWith: "यह आपातकालीन सेवाओं का विकल्प नहीं है।",
};

const DICTS: Record<Lang, Dict> = { en, hi };
export const dict = (lang: Lang): Dict => DICTS[lang];

// ---------- category content ----------

export const CATEGORY_NAMES: Record<Category, Record<Lang, string>> = {
  ambulance: { en: "Ambulance", hi: "एम्बुलेंस" },
  fire: { en: "Fire", hi: "आग" },
  police: { en: "Police", hi: "पुलिस" },
  woman: { en: "Woman Helpline", hi: "महिला हेल्पलाइन" },
  child: { en: "Child Helpline", hi: "बाल हेल्पलाइन" },
  medication: { en: "Need Medication", hi: "दवा" },
};

export const CATEGORY_HEADINGS: Record<Category, Record<Lang, string>> = {
  ambulance: { en: "AMBULANCE", hi: "एम्बुलेंस" },
  fire: { en: "FIRE", hi: "आग" },
  police: { en: "POLICE", hi: "पुलिस" },
  woman: { en: "WOMAN HELPLINE", hi: "महिला हेल्पलाइन" },
  child: { en: "CHILD HELPLINE", hi: "बाल हेल्पलाइन" },
  medication: { en: "MEDICATION", hi: "दवा" },
};

export const NEED_LINES: Record<Category, Record<Lang, string>> = {
  ambulance: {
    en: "Urgent medical help needed. Please send an ambulance.",
    hi: "तुरंत चिकित्सा सहायता चाहिए। कृपया एम्बुलेंस भेजें।",
  },
  fire: {
    en: "There is a fire. Please send fire services.",
    hi: "आग लगी है। कृपया दमकल सेवा भेजें।",
  },
  police: {
    en: "I am under threat. Please send police.",
    hi: "मुझे खतरा है। कृपया पुलिस भेजें।",
  },
  woman: {
    en: "A woman is in danger and needs help.",
    hi: "एक महिला खतरे में है और उसे मदद चाहिए।",
  },
  child: {
    en: "A child is in danger and needs help.",
    hi: "एक बच्चा खतरे में है और उसे मदद चाहिए।",
  },
  medication: {
    en: "I need medication urgently. Please help me get it.",
    hi: "मुझे तुरंत दवा चाहिए। कृपया मदद करें।",
  },
};

export const PREF_TEXTS: Record<PrefComm, Record<Lang, string>> = {
  text: { en: "Text only", hi: "केवल टेक्स्ट" },
  sign: { en: "Sign / gestures", hi: "सांकेतिक भाषा / इशारे" },
  hearNotSpeak: {
    en: "I can hear, cannot speak",
    hi: "मैं सुन सकता हूँ, बोल नहीं सकता",
  },
};

// ---------- message template ----------

export type MessageInput = {
  profile: EchoProfile;
  category: Category;
  lang: Lang;
  coords: Coords | null;
  gpsUnavailable?: boolean;
  details?: string;
};

const DETAIL_LINES: Record<Category, Record<Lang, (details: string) => string>> = {
  ambulance: {
    en: (text) => `I need urgent medical help. Problem: ${text}. Please send an ambulance.`,
    hi: (text) => `मुझे तुरंत चिकित्सा सहायता चाहिए। समस्या: ${text}। कृपया एम्बुलेंस भेजें।`,
  },
  medication: {
    en: (text) => `I need medication urgently. Problem: ${text}.`,
    hi: (text) => `मुझे तुरंत दवा चाहिए। समस्या: ${text}।`,
  },
  fire: {
    en: (text) => `Fire emergency: ${text}. Please send fire services.`,
    hi: (text) => `आग की आपात स्थिति: ${text}। कृपया दमकल सेवा भेजें।`,
  },
  police: {
    en: (text) => `I am under threat: ${text}. Please send police.`,
    hi: (text) => `मुझे खतरा है: ${text}। कृपया पुलिस भेजें।`,
  },
  woman: {
    en: (text) => `A woman is in danger: ${text}. Please send help.`,
    hi: (text) => `एक महिला खतरे में है: ${text}। कृपया मदद भेजें।`,
  },
  child: {
    en: (text) => `A child is in danger: ${text}. Please send help.`,
    hi: (text) => `एक बच्चा खतरे में है: ${text}। कृपया मदद भेजें।`,
  },
};

export function normalizeDetails(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12)
    .join(" ");
}

const SPEECH_KEYWORDS: Record<Category, string[]> = {
  fire: ["fire", "smoke", "burning", "blaze", "gas leak", "short circuit", "आग", "धुआं", "जल रहा", "aag", "dhuan"],
  ambulance: ["fever", "pain", "chest", "bleeding", "blood", "injury", "injured", "accident", "unconscious", "faint", "breathing", "seizure", "heart attack", "stroke", "vomiting", "panic", "anxiety", "dizzy", "fracture", "बुखार", "दर्द", "खून", "चोट", "हादसा", "बेहोश", "सांस", "दौरा", "घबराहट", "चक्कर", "उल्टी", "bukhar", "dard", "khoon", "chot", "behosh", "ghabrahat"],
  police: ["robbery", "thief", "theft", "attack", "threat", "kidnap", "fight", "gun", "knife", "followed", "चोर", "चोरी", "हमला", "धमकी", "अपहरण", "लड़ाई", "डकैती", "चाकू", "पीछा", "chori", "hamla", "dhamki"],
  woman: ["woman", "harassment", "eve teasing", "molest", "domestic violence", "stalking", "महिला", "औरत", "छेड़छाड़", "घरेलू हिंसा", "उत्पीड़न", "chhedchhad"],
  child: ["child", "kid", "baby", "missing", "lost", "बच्चा", "बच्ची", "गुमशुदा", "लापता", "bachcha", "bachchi"],
  medication: ["medicine", "medication", "tablet", "pills", "insulin", "inhaler", "दवा", "दवाई", "इंसुलिन", "इन्हेलर", "dawa", "dawai"],
};

export function interpretSpeech(text: string): Category | null {
  const normalized = text.toLocaleLowerCase();
  const priority: Category[] = ["fire", "ambulance", "police", "woman", "child", "medication"];
  let winner: Category | null = null;
  let highestHits = 0;
  for (const category of priority) {
    const hits = SPEECH_KEYWORDS[category].filter((keyword) =>
      normalized.includes(keyword),
    ).length;
    if (hits > highestHits) {
      winner = category;
      highestHits = hits;
    }
  }
  return winner;
}

export function buildMessage({
  profile,
  category,
  lang,
  coords,
  gpsUnavailable: _gpsUnavailable,
  details,
}: MessageInput): string {
  const L =
    lang === "en"
      ? {
          person: "Person",
          location: "Home location",
          currentLocation: "Current location",
          emergencyContact: "Emergency contact",
          prefComm: "Preferred communication",
          sentVia: "Sent via ECHO at",
        }
      : {
          person: "व्यक्ति",
          location: "घर का स्थान",
          currentLocation: "वर्तमान स्थान",
          emergencyContact: "आपातकालीन संपर्क",
          prefComm: "पसंदीदा संचार माध्यम",
          sentVia: "ECHO के माध्यम से भेजा गया",
        };

  const time = new Date().toLocaleString(lang === "en" ? "en-IN" : "hi-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const cleanDetails = details ? normalizeDetails(details) : "";

  const lines: string[] = [
    `🚨 ${lang === "en" ? "EMERGENCY" : "आपातकाल"}: ${CATEGORY_HEADINGS[category][lang]}`,
    cleanDetails
      ? DETAIL_LINES[category][lang](cleanDetails)
      : NEED_LINES[category][lang],
    `${L.person}: ${profile.name}`,
    `${L.location}: ${profile.landmark}`,
  ];
  if (coords) {
    lines.push(
      `${L.currentLocation}: https://maps.google.com/?q=${coords.lat},${coords.lng}`,
    );
  }
  const family = profile.family[0];
  if (family) {
    lines.push(`${L.emergencyContact}: ${family.name} (${family.number})`);
  }
  lines.push(`${L.prefComm}: ${PREF_TEXTS[profile.prefComm][lang]}`);
  lines.push(`${L.sentVia} ${time}`);
  return lines.join("\n");
}

// ---------- send flow types ----------

export type AlertStep = {
  kind: "authority" | "family";
  label: string;
  number: string;
};

export type PendingFlow = {
  steps: AlertStep[];
  index: number; // next step to execute
  completed: number; // steps already opened
  category: Category;
  message: string;
  channel: AlertChannel;
};

export function readPendingFlow(): PendingFlow | null {
  const raw = ss.get(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingFlow;
  } catch {
    return null;
  }
}

export function writePendingFlow(flow: PendingFlow | null) {
  if (!flow) ss.remove(PENDING_KEY);
  else ss.set(PENDING_KEY, JSON.stringify(flow));
}

/**
 * Opens the first authority step in the selected message channel.
 */
export function dispatchAlert(
  steps: AlertStep[],
  message: string,
  channel: AlertChannel,
) {
  const first = steps[0];
  if (!first) return;
  if (channel === "whatsapp") {
    window.open(waUrl(first.number.replace(/\D/g, ""), message), "_blank");
    return;
  }
  const digits = first.number.replace(/\D/g, "");
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const separator = isIOS ? "&" : "?";
  window.open(`sms:+${digits}${separator}body=${encodeURIComponent(message)}`, "_blank");
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* vibration unsupported */
  }
}
