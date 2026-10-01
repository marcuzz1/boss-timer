import { vi } from "vitest";

/** jsdom 沒有 Web Audio，補一個空殼讓音效程式碼走得過去 */
class FakeAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  resume = vi.fn();
  createOscillator() {
    return {
      type: "sine",
      frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }
}

Object.defineProperty(window, "AudioContext", {
  writable: true,
  value: FakeAudioContext,
});

/** jsdom 的 HTMLMediaElement.play 沒有實作 */
Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

window.alert = vi.fn();
window.confirm = vi.fn(() => true);

/** jsdom 沒有實作捲動 */
window.scrollTo = vi.fn();
