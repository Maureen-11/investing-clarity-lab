import type { EtfPackEntry, EtfPackManifest, HistoryLibrary, HistorySeries, MacroHistory, Security } from "./engine";

export type MarketDataBundle = {
  directory: Security[];
  historyLibrary: HistoryLibrary;
  etfManifest: EtfPackManifest;
  macroHistory: MacroHistory | null;
  source: "cloudbase" | "static";
};

const json = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Market data request failed: ${response.status}`);
  return response.json() as Promise<T>;
};

/**
 * Prefer a same-origin/CloudBase API when configured, while retaining a
 * deterministic static fallback for the free beta and GitHub Pages build.
 * No provider key is ever read by this browser-side module.
 */
export async function loadMarketData(basePath = ""): Promise<MarketDataBundle> {
  const apiOrigin = (process.env.NEXT_PUBLIC_MARKET_API_URL ?? "").replace(/\/$/, "");
  if (apiOrigin) {
    try {
      const [directory, etfManifest, macroHistory] = await Promise.all([
        json<Security[]>(`${apiOrigin}/v1/directory`),
        json<EtfPackManifest>(`${apiOrigin}/v1/manifest`),
        json<MacroHistory>(`${apiOrigin}/v1/macro`),
      ]);
      return { directory, historyLibrary: {}, etfManifest, macroHistory, source: "cloudbase" };
    } catch {
      // The beta remains usable if the API is sleeping, not deployed yet, or
      // temporarily rate-limited. The UI will state that it is using a snapshot.
    }
  }

  const [directory, etfManifest, macroHistory] = await Promise.all([
    json<Security[]>(`${basePath}/data/securities.json`),
    json<EtfPackManifest>(`${basePath}/data/etf-pack-manifest.json`),
    json<MacroHistory>(`${basePath}/data/macro-history.json`),
  ]);
  return { directory, historyLibrary: {}, etfManifest, macroHistory, source: "static" };
}

export async function loadSecurityHistory(entry: EtfPackEntry | undefined, basePath = ""): Promise<HistorySeries | undefined> {
  if (!entry?.historyPath) return undefined;
  const apiOrigin = (process.env.NEXT_PUBLIC_MARKET_API_URL ?? "").replace(/\/$/, "");
  if (apiOrigin) {
    try { return await json<HistorySeries>(`${apiOrigin}/v1/history?id=${encodeURIComponent(entry.id)}`); }
    catch { /* Fall through to the static snapshot. */ }
  }
  return json<HistorySeries>(`${basePath}/${entry.historyPath}`);
}
