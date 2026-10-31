import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Ambulance,
  Baby,
  Flame,
  HeartHandshake,
  Loader2,
  MapPin,
  MapPinOff,
  MessageSquareText,
  MessageCircle,
  Mic,
  Moon,
  Phone,
  Pill,
  Plus,
  Settings,
  Share,
  Siren,
  Sun,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  buildMessage,
  CATEGORY_NAMES,
  DEFAULT_AUTHORITY,
  dict,
  dispatchAlert,
  emptyProfile,
  interpretSpeech,
  loadProfile,
  normalizeDetails,
  normalizeCallNumber,
  normalizeNumber,
  PREF_TEXTS,
  readPendingFlow,
  saveProfile,
  vibrate,
  writePendingFlow,
  type AlertChannel,
  type AlertStep,
  type CallNumbers,
  type Category,
  type Coords,
  type EchoProfile,
  type FamilyContact,
  type Lang,
  type PendingFlow,
  type PrefComm,
} from "@/lib/echo";
import { ls } from "@/lib/echo";
import {
  LANG_KEY,
  COORDS_KEY,
  THEME_KEY,
} from "@/lib/echo";
import { registerEchoServiceWorker } from "@/pwa";
import { cn } from "@/lib/utils";

type LocStatus = "locating" | "ready" | "denied";
type Theme = "light" | "dark";

const TILES: {
  category: Category;
  icon: LucideIcon;
  colorClass: string;
}[] = [
  { category: "ambulance", icon: Ambulance, colorClass: "text-ambulance" },
  { category: "fire", icon: Flame, colorClass: "text-fire" },
  { category: "police", icon: Siren, colorClass: "text-police" },
  { category: "woman", icon: HeartHandshake, colorClass: "text-woman" },
  { category: "child", icon: Baby, colorClass: "text-child" },
  { category: "medication", icon: Pill, colorClass: "text-medication" },
];

function fetchLocation(
  timeoutMs: number,
): Promise<{ coords: Coords | null; denied: boolean }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve({ coords: null, denied: false });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          denied: false,
        }),
      (err) => resolve({ coords: null, denied: err.code === err.PERMISSION_DENIED }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 },
    );
  });
}

export default function EchoApp() {
  const [profile, setProfile] = useState<EchoProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("light");
  const [locStatus, setLocStatus] = useState<LocStatus>("locating");
  const [coords, setCoords] = useState<Coords | null>(null);
  const coordsRef = useRef<Coords | null>(null);
  const [confirmCat, setConfirmCat] = useState<Category | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [channel, setChannel] = useState<AlertChannel>("whatsapp");
  const [details, setDetails] = useState("");
  const [voiceMode, setVoiceMode] = useState<"global" | "details" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [flow, setFlow] = useState<PendingFlow | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [lastCategory, setLastCategory] = useState<Category | null>(null);
  const [lastChannel, setLastChannel] = useState<AlertChannel>("whatsapp");
  const [stepOpened, setStepOpened] = useState(false);
  const [installEvent, setInstallEvent] = useState<Event | null>(null);

  const t = dict(lang);
  const speech = useSpeechInput(lang);

  // Load persisted state (browser storage only in effects — SSR safe).
  useEffect(() => {
    registerEchoServiceWorker();

    const storedTheme = ls.get(THEME_KEY);
    const systemDark =
      window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    setTheme(storedTheme === "dark" || storedTheme === "light" ? storedTheme : systemDark ? "dark" : "light");

    const storedLang = ls.get(LANG_KEY);
    if (storedLang === "hi" || storedLang === "en") setLang(storedLang);

    setProfile(loadProfile() ?? emptyProfile());
    setReady(true);

    const storedCoords = ls.get(COORDS_KEY);
    if (storedCoords) {
      try {
        const parsed = JSON.parse(storedCoords) as Coords;
        if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          coordsRef.current = parsed;
          setCoords(parsed);
          setLocStatus("ready");
        }
      } catch {
        /* ignore */
      }
    }

    // Resume an interrupted send flow.
    const pending = readPendingFlow();
    if (pending && pending.index < pending.steps.length) {
      setFlow(pending);
      setLastCategory(pending.category);
    }

    // Location status chip.
    void fetchLocation(8000).then(({ coords: fresh, denied }) => {
      if (denied) {
        setLocStatus("denied");
        return;
      }
      if (fresh) {
        coordsRef.current = fresh;
        setCoords(fresh);
        setLocStatus("ready");
        try {
          ls.set(COORDS_KEY, JSON.stringify(fresh));
        } catch {
          /* ignore */
        }
      }
    });
  }, []);

  // Apply + persist theme.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (ready) ls.set(THEME_KEY, theme);
  }, [theme, ready]);

  // Persist language.
  useEffect(() => {
    if (ready) ls.set(LANG_KEY, lang);
  }, [lang, ready]);

  // Send flow: when the app becomes visible again, advance the steps.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const pending = readPendingFlow();
      if (!pending) return;
      if (pending.index >= pending.steps.length) {
        writePendingFlow(null);
        setFlow(null);
        setShowDone(true);
      } else {
        setFlow(pending);
        setStepOpened(false);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Install prompt.
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const isIOS = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)),
    [],
  );
  const isStandalone =
    typeof window !== "undefined" &&
    window.matchMedia?.("(display-mode: standalone)").matches;

  const enableLocation = useCallback(async () => {
    setLocStatus("locating");
    const { coords: fresh, denied } = await fetchLocation(8000);
    if (denied) {
      setLocStatus("denied");
      return;
    }
    if (fresh) {
      coordsRef.current = fresh;
      setCoords(fresh);
      setLocStatus("ready");
      try {
        ls.set(COORDS_KEY, JSON.stringify(fresh));
      } catch {
        /* ignore */
      }
    } else {
      setLocStatus(coordsRef.current ? "ready" : "denied");
    }
  }, []);

  const handleSaveProfile = useCallback((saved: EchoProfile) => {
    setProfile(saved);
    saveProfile(saved);
    setSettingsOpen(false);
  }, []);

  const openConfirm = (category: Category, selectedChannel: AlertChannel) => {
    vibrate(50);
    setConfirmCat(category);
    setChannel(selectedChannel);
    setDetails("");
    setConfirmOpen(true);
  };

  const beginGlobalVoice = () => {
    if (!speech.supported) return;
    speech.stopListening();
    setVoiceMode("global");
    speech.startListening((text) => {
      setVoiceMode(null);
      setConfirmCat(interpretSpeech(text));
      setChannel("whatsapp");
      setDetails(normalizeDetails(text));
      setConfirmOpen(true);
      vibrate(50);
    }, () => {});
  };

  const beginDetailsVoice = () => {
    if (!speech.supported) return;
    speech.stopListening();
    setVoiceMode("details");
    speech.startListening(
      (text) => setDetails(normalizeDetails(text)),
      () => setVoiceMode(null),
    );
  };

  const handleSend = useCallback(
    async (category: Category, selectedChannel: AlertChannel, messageDetails: string) => {
      if (!profile) return;
      setConfirmOpen(false);
      setLastCategory(category);
      setLastChannel(selectedChannel);
      setStepOpened(false);

      // Refresh GPS; fall back to last known; denied => landmark only.
      const { coords: fresh, denied } = await fetchLocation(8000);
      let messageCoords: Coords | null;
      let gpsUnavailable = false;
      if (denied) {
        messageCoords = null;
        gpsUnavailable = true;
      } else if (fresh) {
        messageCoords = fresh;
        coordsRef.current = fresh;
        setCoords(fresh);
        setLocStatus("ready");
        ls.set(COORDS_KEY, JSON.stringify(fresh));
      } else {
        messageCoords = coordsRef.current;
      }

      const message = buildMessage({
        profile,
        category,
        lang,
        coords: messageCoords,
        gpsUnavailable,
        details: messageDetails,
      });

      const authorityNumber =
        category === "medication"
          ? profile.authority.ambulance
          : profile.authority[category];

      const steps: AlertStep[] = [
        {
          kind: "authority",
          label: `${t.authorityLabel} · ${CATEGORY_NAMES[category][lang]}`,
          number: authorityNumber,
        },
        ...profile.family.map((f: FamilyContact) => ({
          kind: "family" as const,
          label: f.name,
          number: f.number,
        })),
      ];

      const pending: PendingFlow = {
        steps,
        index: 1,
        completed: 1,
        category,
        message,
        channel: selectedChannel,
      };
      writePendingFlow(pending);
      dispatchAlert(steps, message, selectedChannel);
    },
    [profile, lang, t],
  );

  const openNextStep = (current: PendingFlow) => {
    if (stepOpened) return;
    const step = current.steps[current.index];
    if (!step) return;
    setStepOpened(true);
    dispatchAlert([step], current.message, current.channel ?? "whatsapp");
    const next: PendingFlow = {
      ...current,
      index: current.index + 1,
      completed: current.completed + 1,
    };
    writePendingFlow(next);
  };

  const skipFlow = () => {
    writePendingFlow(null);
    setFlow(null);
    setShowDone(true);
  };

  const closeDone = () => {
    setShowDone(false);
    setFlow(null);
  };

  if (!ready || !profile) {
    return <div className="min-h-screen bg-background" />;
  }

  const showSetup = !profile.setupDone;
  const locationChip = {
    locating: { icon: Loader2, label: t.locLocating, className: "text-muted-foreground", spin: true },
    ready: { icon: MapPin, label: t.locReady, className: "text-foreground", spin: false },
    denied: { icon: MapPinOff, label: t.locDenied, className: "text-muted-foreground", spin: false },
  }[locStatus];
  const ChipIcon = locationChip.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {voiceMode === "global" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-live="polite"
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-background/95 px-6 text-center"
        >
          <Mic aria-hidden className={cn("h-10 w-10 text-alert", speech.listening && "animate-pulse")} />
          <p className="text-lg font-semibold">
            {speech.listening ? t.listening : t.voiceTryAgain}
          </p>
          {speech.transcript && (
            <p className="max-w-sm text-sm text-muted-foreground">{speech.transcript}</p>
          )}
          <Button
            variant="outline"
            onClick={() => {
              speech.stopListening();
              setVoiceMode(null);
            }}
          >
            {t.cancel}
          </Button>
          {!speech.listening && (
            <Button variant="outline" onClick={beginGlobalVoice}>
              <Mic aria-hidden className="h-4 w-4" />
              {t.retryVoice}
            </Button>
          )}
        </div>
      )}

      {/* Full-screen flow step */}
      {flow && !showDone && flow.steps[flow.index] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center"
        >
          <p className="text-sm text-muted-foreground">
            {t.stepAlertSent.replace("{n}", String(flow.completed))}
          </p>
          <h1 className="max-w-xs text-2xl font-semibold tracking-[-0.03em]">
            {t.stepNowFamily}
          </h1>
          <Button
            size="lg"
            onClick={() => openNextStep(flow)}
            disabled={stepOpened}
            className="mt-2 h-14 w-full max-w-sm text-base font-semibold"
          >
            {t.notify.replace("{name}", flow.steps[flow.index]?.label ?? "")}
          </Button>
          <button
            type="button"
            onClick={skipFlow}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {t.skip}
          </button>
        </div>
      )}

      {/* Done screen */}
      {showDone && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background px-6 text-center"
        >
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">{t.doneTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.doneSub}</p>
          <div className="mt-4 flex w-full max-w-sm flex-col gap-2">
            <Button
              size="lg"
              className="h-12 text-base font-semibold"
              onClick={() => {
                closeDone();
                if (lastCategory) {
                  setConfirmCat(lastCategory);
                  setChannel(lastChannel);
                  setConfirmOpen(true);
                }
              }}
            >
              {t.sendAgain}
            </Button>
            <Button size="lg" variant="outline" className="h-12 text-base" onClick={closeDone}>
              {t.backHome}
            </Button>
          </div>
        </div>
      )}

      {showSetup ? (
        <SetupScreen
          profile={profile}
          lang={lang}
          onLangChange={setLang}
          theme={theme}
          onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
          locStatus={locStatus}
          onEnableLocation={enableLocation}
          onSave={handleSaveProfile}
        />
      ) : (
        <div className="echo-shell mx-auto flex min-h-screen w-full max-w-[480px] flex-col">
          {/* Header */}
          <header className="flex items-center justify-between gap-2 pt-1">
            <span className="text-xl font-semibold tracking-[-0.03em]">ECHO</span>
            <div className="flex items-center gap-1">
              <LangToggle lang={lang} onLangChange={setLang} />
              <Button
                variant="ghost"
                size="icon"
                aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t.settings}
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Location chip */}
          <div className="mt-3 flex items-center">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
              <ChipIcon
                aria-hidden
                className={cn("h-3.5 w-3.5", locationChip.className, locationChip.spin && "animate-spin")}
              />
              {locationChip.label}
            </span>
          </div>

          {/* Demo banner */}
          <p
            role="note"
            className="mt-3 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground"
          >
            {t.banner}
          </p>

          {/* Emergency tiles */}
          <main className="mt-4 flex flex-1 flex-col">
            <Button
              variant="outline"
              className="mb-3 h-11 w-full"
              onClick={beginGlobalVoice}
              disabled={!speech.supported}
              title={!speech.supported ? t.voiceUnsupported : undefined}
            >
              <Mic aria-hidden className="h-4 w-4" />
              {t.speakEmergency}
            </Button>
            <div className="grid grid-cols-2 gap-3">
              {TILES.map((tile) => {
                const Icon = tile.icon;
                const label = CATEGORY_NAMES[tile.category][lang];
                const callNumber =
                  profile.callNumbers[
                    tile.category === "medication" ? "ambulance" : tile.category
                  ];
                return (
                  <div
                    key={tile.category}
                    className="flex flex-col rounded-lg border border-border bg-card p-3"
                  >
                    <Icon aria-hidden className={cn("h-5 w-5", tile.colorClass)} />
                    <span className="mt-1.5">
                      <span className="block text-sm font-semibold leading-tight">{label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{callNumber}</span>
                    </span>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openConfirm(tile.category, "whatsapp")}
                        aria-label={`${t.whatsapp}: ${label}`}
                        className="flex h-11 min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <MessageCircle aria-hidden className="h-4 w-4" />
                        {t.whatsapp}
                      </button>
                      <button
                        type="button"
                        onClick={() => openConfirm(tile.category, "sms")}
                        aria-label={`${t.sms}: ${label}`}
                        className="flex h-11 min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <MessageSquareText aria-hidden className="h-4 w-4" />
                        {t.sms}
                      </button>
                      <a
                        href={`tel:${callNumber}`}
                        onClick={() => vibrate(50)}
                        aria-label={t.callAria.replace("{category}", label)}
                        className="col-span-2 flex h-11 min-h-11 items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <Phone aria-hidden className="h-4 w-4" />
                        {t.call}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Call 112 */}
            <a
              href="tel:112"
              className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-medium transition-colors hover:bg-accent"
            >
              <Phone aria-hidden className="h-4 w-4" />
              {t.call112}
            </a>

            {/* Install */}
            {installEvent && !isStandalone && (
              <Button
                variant="outline"
                className="mt-3 h-11 w-full"
                onClick={async () => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const evt = installEvent as any;
                  evt.prompt?.();
                  try {
                    const choice = await evt.userChoice;
                    if (choice?.outcome === "accepted") setInstallEvent(null);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                {t.installApp}
              </Button>
            )}
            {isIOS && !isStandalone && (
              <p className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                <Share aria-hidden className="h-3.5 w-3.5" />
                {t.iosHint}
              </p>
            )}

            <p className="mt-auto pt-6 text-center text-xs text-muted-foreground">
              {t.madeWith}
            </p>
          </main>

          {/* Confirm sheet */}
          <ConfirmSheet
            open={confirmOpen}
            category={confirmCat}
            onCategoryChange={setConfirmCat}
            profile={profile}
            lang={lang}
            coords={coords}
            channel={channel}
            onChannelChange={setChannel}
            details={details}
            onDetailsChange={setDetails}
            speech={speech}
            voiceListening={voiceMode === "details" && speech.listening}
            voiceTranscript={voiceMode === "details" ? speech.transcript : ""}
            onDetailsMic={beginDetailsVoice}
            onCancel={() => {
              speech.stopListening();
              setVoiceMode(null);
              setConfirmOpen(false);
              setConfirmCat(null);
            }}
            onSend={handleSend}
          />

          {/* Settings sheet */}
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetContent
              side="bottom"
              className="h-[90vh] max-w-[480px] mx-auto rounded-t-xl border-border bg-background p-0 sm:max-w-[480px]"
            >
              <SheetHeader className="border-b border-border px-4 py-3 text-left">
                <SheetTitle className="text-base font-semibold tracking-[-0.03em]">
                  {t.settings}
                </SheetTitle>
                <SheetDescription className="sr-only">{t.settings}</SheetDescription>
              </SheetHeader>
              <div className="echo-scroll max-h-[calc(90vh-56px)] overflow-y-auto px-4 py-4">
                <SetupForm
                  initial={profile}
                  lang={lang}
                  onLangChange={setLang}
                  locStatus={locStatus}
                  onEnableLocation={enableLocation}
                  onSave={handleSaveProfile}
                  mode="settings"
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}

function LangToggle({
  lang,
  onLangChange,
}: {
  lang: Lang;
  onLangChange: (l: Lang) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Language"
      className="flex items-center rounded-md border border-border"
    >
      {(["en", "hi"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onLangChange(l)}
          aria-pressed={lang === l}
          className={cn(
            "px-2 py-1 text-xs font-medium transition-colors first:rounded-l-[7px] last:rounded-r-[7px]",
            lang === l
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          {l === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}

type SpeechResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechEventLike = { resultIndex: number; results: ArrayLike<SpeechResultLike> };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function useSpeechInput(lang: Lang) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishRef = useRef<(() => void) | null>(null);
  const speechWindow = typeof window === "undefined"
    ? null
    : (window as Window & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      });
  const Recognition = speechWindow?.SpeechRecognition ?? speechWindow?.webkitSpeechRecognition;
  const supported = Boolean(Recognition);

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      finishRef.current?.();
    }
    finishRef.current?.();
  };

  const startListening = (onFinal: (text: string) => void, onStop: () => void) => {
    stopListening();
    if (!Recognition) {
      onStop();
      return;
    }

    const recognition = new Recognition();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
      setListening(false);
      recognitionRef.current = null;
      finishRef.current = null;
      onStop();
    };
    const resetSilenceTimer = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          finish();
        }
      }, 6000);
    };

    recognition.lang = lang === "en" ? "en-IN" : "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = resetSilenceTimer;
    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      setTranscript((finalText || interim).trim());
      resetSilenceTimer();
      if (finalText.trim()) {
        onFinal(finalText.trim());
        finish();
        try {
          recognition.stop();
        } catch {
          /* recognition may already have stopped */
        }
      }
    };
    recognition.onend = finish;
    recognition.onerror = finish;
    recognitionRef.current = recognition;
    finishRef.current = finish;
    setTranscript("");
    setListening(true);
    resetSilenceTimer();
    try {
      recognition.start();
    } catch {
      finish();
    }
  };

  useEffect(
    () => () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore cleanup errors */
      }
    },
    [],
  );

  return { listening, transcript, supported, startListening, stopListening };
}

function ConfirmSheet({
  open,
  category,
  onCategoryChange,
  profile,
  lang,
  coords,
  channel,
  onChannelChange,
  details,
  onDetailsChange,
  speech,
  voiceListening,
  voiceTranscript,
  onDetailsMic,
  onCancel,
  onSend,
}: {
  open: boolean;
  category: Category | null;
  onCategoryChange: (category: Category) => void;
  profile: EchoProfile;
  lang: Lang;
  coords: Coords | null;
  channel: AlertChannel;
  onChannelChange: (channel: AlertChannel) => void;
  details: string;
  onDetailsChange: (details: string) => void;
  speech: ReturnType<typeof useSpeechInput>;
  voiceListening: boolean;
  voiceTranscript: string;
  onDetailsMic: () => void;
  onCancel: () => void;
  onSend: (
    category: Category,
    channel: AlertChannel,
    details: string,
  ) => void;
}) {
  const t = dict(lang);
  const message = useMemo(() => {
    if (!category) return "";
    return buildMessage({ profile, category, lang, coords, details });
  }, [category, profile, lang, coords, details]);

  const authorityNumber =
    category === "medication"
      ? profile.authority.ambulance
      : category
        ? profile.authority[category]
        : "";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onCancel()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-[480px] rounded-t-xl border-border bg-background p-0 sm:max-w-[480px]"
      >
        <SheetHeader className="px-4 pt-4 text-left">
          <SheetTitle className="text-base font-semibold tracking-[-0.03em]">
            {category ? CATEGORY_NAMES[category][lang] : t.emergencyTitle}
          </SheetTitle>
          <SheetDescription>{t.emergencyTitle}</SheetDescription>
        </SheetHeader>
        <div className="echo-scroll flex max-h-[calc(90vh-88px)] flex-col gap-4 overflow-y-auto px-4 pb-6 pt-2">
          <div className="flex gap-2" role="group" aria-label={`${t.whatsapp} / ${t.sms}`}>
            {(["whatsapp", "sms"] as AlertChannel[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={channel === value}
                onClick={() => onChannelChange(value)}
                className={cn(
                  "min-h-10 flex-1 rounded-md border px-3 text-sm font-medium",
                  channel === value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:bg-accent",
                )}
              >
                {value === "whatsapp" ? t.whatsapp : t.sms}
              </button>
            ))}
          </div>

          <div>
            <Label htmlFor="echo-details" className="text-sm font-medium">
              {t.detailsOptional}
            </Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="echo-details"
                value={details}
                onChange={(event) => onDetailsChange(normalizeDetails(event.target.value))}
                placeholder={t.detailsPlaceholder}
                className="bg-background"
                maxLength={160}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t.detailsOptional}
                title={!speech.supported ? t.voiceUnsupported : t.detailsOptional}
                disabled={!speech.supported}
                aria-pressed={voiceListening}
                onClick={onDetailsMic}
                className="h-10 w-10 shrink-0"
              >
                <Mic aria-hidden className={cn("h-4 w-4", voiceListening && "animate-pulse text-alert")} />
              </Button>
            </div>
            {voiceListening && voiceTranscript && (
              <p aria-live="polite" className="mt-1 text-xs text-muted-foreground">
                {voiceTranscript}
              </p>
            )}
            {!speech.supported && (
              <p className="mt-1 text-xs text-muted-foreground">{t.voiceUnsupported}</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {t.categoryLabel}
            </p>
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
              {TILES.map(({ category: chipCategory }) => (
                <button
                  key={chipCategory}
                  type="button"
                  aria-pressed={category === chipCategory}
                  onClick={() => onCategoryChange(chipCategory)}
                  className={cn(
                    "min-h-9 shrink-0 rounded-md border px-2.5 text-xs font-medium",
                    category === chipCategory
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:bg-accent",
                  )}
                >
                  {CATEGORY_NAMES[chipCategory][lang]}
                </button>
              ))}
            </div>
          </div>

          <p className="-mb-3 text-xs font-medium text-muted-foreground">
            {channel === "whatsapp" ? t.whatsapp : t.sms}
          </p>
          <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-3 font-mono text-xs leading-relaxed">
            {message}
          </pre>

          {category && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t.recipients}</p>
              <ul className="flex flex-col gap-2">
                <li className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="h-2 w-2 rounded-full bg-alert" />
                    {t.authorityLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">{authorityNumber}</span>
                </li>
                {profile.family.map((f, i) => (
                  <li
                    key={`${f.number}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="h-2 w-2 rounded-full bg-foreground" />
                      {t.familyLabel} · {f.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{f.number}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            size="lg"
            onClick={() => category && onSend(category, channel, details)}
            disabled={!category}
            className="h-14 w-full bg-alert text-base font-semibold tracking-wide text-alert-foreground hover:bg-alert/90"
          >
            {t.sendAlertVia.replace("{channel}", channel === "whatsapp" ? t.whatsapp : t.sms)}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="mx-auto text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {t.cancel}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SetupScreen({
  profile,
  lang,
  onLangChange,
  theme,
  onThemeToggle,
  locStatus,
  onEnableLocation,
  onSave,
}: {
  profile: EchoProfile;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  theme: Theme;
  onThemeToggle: () => void;
  locStatus: LocStatus;
  onEnableLocation: () => void;
  onSave: (p: EchoProfile) => void;
}) {
  const t = dict(lang);
  return (
    <div className="echo-shell mx-auto flex min-h-screen w-full max-w-[480px] flex-col">
      <header className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xl font-semibold tracking-[-0.03em]">ECHO</span>
        <div className="flex items-center gap-1">
          <LangToggle lang={lang} onLangChange={onLangChange} />
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={onThemeToggle}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <div className="mt-8 flex flex-1 flex-col">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">{t.setupTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.setupSub}</p>
        <div className="mt-6">
          <SetupForm
            initial={profile}
            lang={lang}
            onLangChange={onLangChange}
            locStatus={locStatus}
            onEnableLocation={onEnableLocation}
            onSave={onSave}
            mode="setup"
          />
        </div>
      </div>
    </div>
  );
}

function SetupForm({
  initial,
  lang,
  onLangChange,
  locStatus,
  onEnableLocation,
  onSave,
  mode,
}: {
  initial: EchoProfile;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  locStatus: LocStatus;
  onEnableLocation: () => void;
  onSave: (p: EchoProfile) => void;
  mode: "setup" | "settings";
}) {
  const t = dict(lang);
  const [name, setName] = useState(initial.name);
  const [prefComm, setPrefComm] = useState<PrefComm>(initial.prefComm);
  const [landmark, setLandmark] = useState(initial.landmark);
  const [familyRows, setFamilyRows] = useState<FamilyContact[]>(
    initial.family.length > 0 ? initial.family : [{ name: "", number: "" }],
  );
  const [authority, setAuthority] = useState(initial.authority);
  const [callNumbers, setCallNumbers] = useState<CallNumbers>(initial.callNumbers);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const authorityFields: { key: keyof typeof DEFAULT_AUTHORITY; label: string }[] = [
    { key: "ambulance", label: CATEGORY_NAMES.ambulance[lang] },
    { key: "fire", label: CATEGORY_NAMES.fire[lang] },
    { key: "police", label: CATEGORY_NAMES.police[lang] },
    { key: "woman", label: CATEGORY_NAMES.woman[lang] },
    { key: "child", label: CATEGORY_NAMES.child[lang] },
  ];

  const prefOptions: { value: PrefComm; label: string }[] = [
    { value: "text", label: t.prefText },
    { value: "sign", label: t.prefSign },
    { value: "hearNotSpeak", label: t.prefHear },
  ];

  const updateRow = (index: number, patch: Partial<FamilyContact>) => {
    setFamilyRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const handleSave = () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors["name"] = t.errName;
    if (!landmark.trim()) nextErrors["landmark"] = t.errLandmark;

    const cleanedFamily: FamilyContact[] = [];
    familyRows.forEach((row, i) => {
      const hasName = row.name.trim().length > 0;
      const hasNumber = row.number.trim().length > 0;
      if (!hasName && !hasNumber) return;
      if (!hasName) {
        nextErrors[`familyName${i}`] = t.errContactName;
        return;
      }
      const normalized = normalizeNumber(row.number);
      if (!normalized) {
        nextErrors[`familyNumber${i}`] = t.errNumber;
        return;
      }
      cleanedFamily.push({ name: row.name.trim(), number: normalized });
    });

    const cleanedAuthority = { ...authority };
    authorityFields.forEach(({ key }) => {
      const normalized = normalizeNumber(authority[key]);
      if (!normalized) {
        nextErrors[`authority${key}`] = t.errNumber;
      } else {
        cleanedAuthority[key] = normalized;
      }
    });

    const cleanedCallNumbers: CallNumbers = { ...callNumbers };
    authorityFields.forEach(({ key }) => {
      const normalized = normalizeCallNumber(callNumbers[key]);
      if (mode === "settings" && !normalized) {
        nextErrors[`call${key}`] = t.errCallNumber;
      } else if (normalized) {
        cleanedCallNumbers[key] = normalized;
      }
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      name: name.trim(),
      prefComm,
      landmark: landmark.trim(),
      family: cleanedFamily,
      authority: cleanedAuthority,
      callNumbers: cleanedCallNumbers,
      setupDone: true,
    });
  };

  const fieldError = (key: string) =>
    errors[key] ? (
      <p className="mt-1 text-xs text-destructive">{errors[key]}</p>
    ) : null;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      noValidate
    >
      {/* Name */}
      <div>
        <Label htmlFor="echo-name" className="text-sm font-medium">
          {t.yourName}
        </Label>
        <Input
          id="echo-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.namePlaceholder}
          className="mt-1.5 bg-background"
          autoComplete="name"
        />
        {fieldError("name")}
      </div>

      {/* Language */}
      <div>
        <span className="text-sm font-medium">{t.languageLabel}</span>
        <div className="mt-1.5">
          <LangToggle lang={lang} onLangChange={onLangChange} />
        </div>
      </div>

      {/* Preferred communication */}
      <div>
        <span className="text-sm font-medium">{t.prefCommLabel}</span>
        <RadioGroup
          value={prefComm}
          onValueChange={(v) => setPrefComm(v as PrefComm)}
          className="mt-1.5 gap-2"
        >
          {prefOptions.map((option) => (
            <Label
              key={option.value}
              htmlFor={`pref-${option.value}`}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 font-normal has-[[data-state=checked]]:border-foreground"
            >
              <RadioGroupItem id={`pref-${option.value}`} value={option.value} />
              {option.label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Home location */}
      <div>
        <Label htmlFor="echo-landmark" className="text-sm font-medium">
          {t.landmarkLabel}
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{t.homeLocationHelp}</p>
        <Input
          id="echo-landmark"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          placeholder={t.landmarkPlaceholder}
          className="mt-1.5 bg-background"
        />
        {fieldError("landmark")}
      </div>

      {/* Family contacts */}
      <div>
        <span className="text-sm font-medium">{t.familyContacts}</span>
        <div className="mt-1.5 flex flex-col gap-3">
          {familyRows.map((row, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t.familyLabel} {i + 1}
                </span>
                {familyRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFamilyRows((rows) => rows.filter((_, ri) => ri !== i))
                    }
                    aria-label={t.removeContact}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Input
                value={row.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
                placeholder={t.contactNamePlaceholder}
                aria-label={`${t.contactName} ${i + 1}`}
                className="mt-2 bg-background"
              />
              {fieldError(`familyName${i}`)}
              <Input
                value={row.number}
                onChange={(e) => updateRow(i, { number: e.target.value })}
                placeholder={t.numberPlaceholder}
                aria-label={`${t.whatsappNumber} ${i + 1}`}
                type="tel"
                inputMode="tel"
                className="mt-2 bg-background"
              />
              {fieldError(`familyNumber${i}`)}
            </div>
          ))}
          {familyRows.length < 2 && (
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => setFamilyRows((rows) => [...rows, { name: "", number: "" }])}
            >
              <Plus aria-hidden className="h-4 w-4" />
              {t.addContact}
            </Button>
          )}
        </div>
      </div>

      {/* Authority numbers */}
      <div>
        <span className="text-sm font-medium">{t.authorityNumbers}</span>
        <p className="mt-0.5 text-xs text-muted-foreground">{t.demoHint}</p>
        <div className="mt-1.5 flex flex-col gap-3">
          {authorityFields.map(({ key, label }) => (
            <div key={key}>
              <Label htmlFor={`authority-${key}`} className="text-xs text-muted-foreground">
                {label}
              </Label>
              <Input
                id={`authority-${key}`}
                value={authority[key]}
                onChange={(e) =>
                  setAuthority((a) => ({ ...a, [key]: e.target.value }))
                }
                type="tel"
                inputMode="tel"
                className="mt-1 bg-background"
              />
              {fieldError(`authority${key}`)}
            </div>
          ))}
        </div>
      </div>

      {/* Call numbers (settings only) */}
      {mode === "settings" && (
        <div>
          <span className="text-sm font-medium">{t.callNumbersLabel}</span>
          <p className="mt-0.5 text-xs text-muted-foreground">{t.callNumberHint}</p>
          <div className="mt-1.5 flex flex-col gap-3">
            {authorityFields.map(({ key, label }) => (
              <div key={key}>
                <Label htmlFor={`call-${key}`} className="text-xs text-muted-foreground">
                  {label}
                </Label>
                <Input
                  id={`call-${key}`}
                  value={callNumbers[key]}
                  onChange={(e) =>
                    setCallNumbers((c) => ({
                      ...c,
                      [key]: e.target.value.replace(/\D/g, "").slice(0, 15),
                    }))
                  }
                  type="tel"
                  inputMode="tel"
                  className="mt-1 bg-background"
                />
                {fieldError(`call${key}`)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Location permission */}
      <div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" className="h-11" onClick={onEnableLocation}>
            <MapPin aria-hidden className="h-4 w-4" />
            {locStatus === "ready" ? t.locationRequested : t.enableLocation}
          </Button>
          <span className="text-xs text-muted-foreground">
            {locStatus === "ready"
              ? t.locReady
              : locStatus === "denied"
                ? t.locDenied
                : t.locLocating}
          </span>
        </div>
      </div>

      <Button type="submit" size="lg" className="h-12 text-base font-semibold">
        {mode === "setup" ? t.save : t.saveSettings}
      </Button>
    </form>
  );
}
