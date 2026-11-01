import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeechInput } from "@/hooks/use-speech-input";

type FakeSpeechResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type FakeSpeechEvent = {
  resultIndex?: number;
  results: ArrayLike<FakeSpeechResult>;
};

class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];

  lang = "";
  continuous = false;
  interimResults = false;

  onstart: (() => void) | null = null;
  onresult: ((event: FakeSpeechEvent) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  start = vi.fn(() => {
    this.onstart?.();
  });

  stop = vi.fn();

  abort = vi.fn();

  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }
}

describe("useSpeechInput", () => {
  beforeEach(() => {
    FakeSpeechRecognition.instances = [];
    vi.useFakeTimers();

    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      writable: true,
      value: FakeSpeechRecognition,
    });

    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();

    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  it("detects browser speech recognition support", () => {
    const { result } = renderHook(() => useSpeechInput("en"));

    expect(result.current.supported).toBe(true);
    expect(result.current.listening).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("starts speech recognition with the correct language", () => {
    const { result } = renderHook(() => useSpeechInput("en"));

    act(() => {
      result.current.startListening(vi.fn(), vi.fn());
    });

    const recognition = FakeSpeechRecognition.instances[0];

    expect(recognition).toBeDefined();
    expect(recognition?.lang).toBe("en-IN");
    expect(recognition?.continuous).toBe(false);
    expect(recognition?.interimResults).toBe(true);
    expect(recognition?.start).toHaveBeenCalledOnce();
    expect(result.current.listening).toBe(true);
  });

  it("uses Hindi recognition when Hindi is selected", () => {
    const { result } = renderHook(() => useSpeechInput("hi"));

    act(() => {
      result.current.startListening(vi.fn(), vi.fn());
    });

    const recognition = FakeSpeechRecognition.instances[0];

    expect(recognition?.lang).toBe("hi-IN");
  });

  it("stops cleanly when no speech is detected", () => {
    const onStop = vi.fn();

    const { result } = renderHook(() => useSpeechInput("en"));

    act(() => {
      result.current.startListening(vi.fn(), onStop);
    });

    const recognition = FakeSpeechRecognition.instances[0];

    act(() => {
      recognition?.onerror?.({ error: "no-speech" });
    });

    expect(result.current.listening).toBe(false);
    expect(result.current.error).toBe("no-speech");
    expect(onStop).toHaveBeenCalledWith("no-speech");

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(FakeSpeechRecognition.instances).toHaveLength(1);
  });

  it("stops immediately and reports network errors", () => {
    const onStop = vi.fn();

    const { result } = renderHook(() => useSpeechInput("en"));

    act(() => {
      result.current.startListening(vi.fn(), onStop);
    });

    const recognition = FakeSpeechRecognition.instances[0];

    act(() => {
      recognition?.onerror?.({ error: "network" });
    });

    expect(result.current.listening).toBe(false);
    expect(result.current.error).toBe("network");
    expect(onStop).toHaveBeenCalledWith("network");

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(FakeSpeechRecognition.instances).toHaveLength(1);
  });

  it("does not restart when the browser ends recognition", () => {
    const onStop = vi.fn();

    const { result } = renderHook(() => useSpeechInput("en"));

    act(() => {
      result.current.startListening(vi.fn(), onStop);
    });

    const recognition = FakeSpeechRecognition.instances[0];

    act(() => {
      recognition?.onend?.();
    });

    expect(result.current.listening).toBe(false);
    expect(onStop).toHaveBeenCalledOnce();
    expect(FakeSpeechRecognition.instances).toHaveLength(1);
  });

  it("reports microphone permission errors", () => {
    const onStop = vi.fn();

    const { result } = renderHook(() => useSpeechInput("en"));

    act(() => {
      result.current.startListening(vi.fn(), onStop);
    });

    const recognition = FakeSpeechRecognition.instances[0];

    act(() => {
      recognition?.onerror?.({ error: "not-allowed" });
    });

    expect(result.current.listening).toBe(false);
    expect(result.current.error).toBe("not-allowed");
    expect(onStop).toHaveBeenCalledWith("not-allowed");
  });

  it("returns captured speech and stops recognition", () => {
    const onFinal = vi.fn();
    const onStop = vi.fn();

    const { result } = renderHook(() => useSpeechInput("en"));

    act(() => {
      result.current.startListening(onFinal, onStop);
    });

    const recognition = FakeSpeechRecognition.instances[0];

    act(() => {
      recognition?.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            0: { transcript: "I need emergency help" },
          },
        ],
      });
    });

    expect(onFinal).toHaveBeenCalledWith("I need emergency help");
    expect(onStop).toHaveBeenCalledOnce();
    expect(result.current.listening).toBe(false);
    expect(recognition?.stop).toHaveBeenCalled();
  });

  it("stops the previous recognition session before starting another", () => {
    const { result } = renderHook(() => useSpeechInput("en"));

    act(() => {
      result.current.startListening(vi.fn(), vi.fn());
    });

    const firstRecognition = FakeSpeechRecognition.instances[0];

    act(() => {
      result.current.startListening(vi.fn(), vi.fn());
    });

    expect(firstRecognition?.stop).toHaveBeenCalled();
    expect(FakeSpeechRecognition.instances).toHaveLength(2);
  });

  it("aborts recognition when the hook unmounts", () => {
    const { result, unmount } = renderHook(() => useSpeechInput("en"));

    act(() => {
      result.current.startListening(vi.fn(), vi.fn());
    });

    const recognition = FakeSpeechRecognition.instances[0];

    unmount();

    expect(recognition?.abort).toHaveBeenCalled();
  });
});
