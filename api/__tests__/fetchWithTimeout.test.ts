import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchWithTimeout } from "../_server/infrastructure/fetchWithTimeout";

describe("fetchWithTimeout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves with the response when fetch completes before the timeout", async () => {
    const response = new Response("ok", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithTimeout("https://example.com", {}, 1_000);

    expect(res).toBe(response);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal.aborted).toBe(false);
  });

  it("aborts the request once the timeout elapses", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchWithTimeout("https://example.com", {}, 50);
    const assertion = expect(pending).rejects.toThrow("Aborted");
    await vi.advanceTimersByTimeAsync(60);
    await assertion;

    vi.useRealTimers();
  });

  it("propagates rejection from the underlying fetch call", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(fetchWithTimeout("https://example.com")).rejects.toThrow("network down");
  });

  it("defaults the timeout to 15000ms when not provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    await fetchWithTimeout("https://example.com");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
