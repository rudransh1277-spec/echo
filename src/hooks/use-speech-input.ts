import { useCallback, useEffect, useRef, useState } from "react";

import type { Lang } from "@/lib/echo";

type SpeechResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechResultLike>;
};

type SpeechErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function useSpeechInput(lang: Lang) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finishRef = useRef<(() => void) | null>(null);

  const speechWindow =
    typeof window === "undefined"
      ? null
      : (window as Window & {
          SpeechRecognition?: SpeechRecognitionConstructor;
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        });

  const Recognition = speechWindow?.SpeechRecognition ?? speechWindow?.webkitSpeechRecognition;

  const supported = Boolean(Recognition);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;

    try {
      recognition?.stop();
    } catch {
      // Recognition may already have stopped.
    }

    finishRef.current?.();
  }, []);

  const startListening = useCallback(
    (onFinal: (text: string) => void, onStop: (error?: string) => void) => {
      // Stop any previous recognition session.
      stopListening();

      if (!Recognition) {
        setError("unsupported");
        onStop("unsupported");
        return;
      }

      let finished = false;

      const finish = (error?: string) => {
        if (finished) return;

        finished = true;

        setError(error ?? null);
        setListening(false);

        recognitionRef.current = null;
        finishRef.current = null;

        onStop(error);
      };

      finishRef.current = finish;

      setError(null);
      setTranscript("");
      setListening(false);

      const recognition = new Recognition();

      recognition.lang = lang === "en" ? "en-IN" : "hi-IN";

      // One session per user attempt.
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        if (!finished) {
          setListening(true);
        }
      };

      recognition.onresult = (event) => {
        if (finished) return;

        let finalText = "";
        let interimText = "";

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];

          if (!result) continue;

          const text = result[0]?.transcript ?? "";

          if (result.isFinal) {
            finalText += text + " ";
          } else {
            interimText += text;
          }
        }

        const currentText = (finalText + interimText).trim();

        setTranscript(currentText);

        if (finalText.trim()) {
          const recognizedText = finalText.trim();

          finish();

          try {
            recognition.stop();
          } catch {
            // Already stopped.
          }

          onFinal(recognizedText);
        }
      };

      recognition.onerror = (event) => {
        if (finished) return;

        finish(event.error);
      };

      recognition.onend = () => {
        if (finished) return;

        // Recognition ended without a final result.
        finish();
      };

      recognitionRef.current = recognition;

      try {
        // Must be triggered directly by the user's microphone-button tap.
        recognition.start();
      } catch {
        finish("start-failed");
      }
    },
    [lang, stopListening, Recognition],
  );

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;

      recognitionRef.current = null;
      finishRef.current = null;

      try {
        recognition?.abort();
      } catch {
        // Ignore cleanup errors.
      }
    };
  }, []);

  return {
    listening,
    transcript,
    error,
    supported,
    startListening,
    stopListening,
  };
}
