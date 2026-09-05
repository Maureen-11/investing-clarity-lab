/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");
const fs = require("node:fs/promises");

const cache = new Map();
const requestLog = new Map();
const MAX_REQUESTS_PER_MINUTE = 60;

function response(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": process.env.ALLOWED_ORIGIN || "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function requestPath(event) {
  const raw = event?.path || event?.requestContext?.path || event?.httpPath || "/";
  return raw.replace(/^\/api/, "") || "/";
}

function query(event) {
  if (event?.queryStringParameters) return event.queryStringParameters;
  const raw = event?.queryString || event?.query || "";
  return Object.fromEntries(new URLSearchParams(raw));
}

async function readData(name) {
  const hit = cache.get(name);
  if (hit && hit.expires > Date.now()) return hit.value;
  const root = process.env.MARKET_DATA_DIR || path.resolve(__dirname, "../../../public/data");
  const value = JSON.parse(await fs.readFile(path.join(root, name), "utf8"));
  cache.set(name, { value, expires: Date.now() + 5 * 60 * 1000 });
  return value;
}

function clientId(event) {
  return event?.headers?.["x-forwarded-for"] || event?.headers?.["x-real-ip"] || "anonymous";
}

function allowed(event) {
  const now = Date.now();
  const key = clientId(event);
  const recent = (requestLog.get(key) || []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= MAX_REQUESTS_PER_MINUTE) return false;
  recent.push(now);
  requestLog.set(key, recent);
  return true;
}

function looksLikeFund(item) {
  return /etf|基金|reit|exchange traded/i.test(`${item?.assetType || ""} ${item?.name || ""}`);
}

function manifestEntryFor(manifest, id) {
  return [...(manifest.entries || []), ...(manifest.indices || [])].find((entry) => entry.id === id);
}

async function main(event) {
  if (event?.httpMethod === "OPTIONS") return response(204, null);
  if (!allowed(event)) return response(429, { error: "rate_limited", message: "内测接口请求过于频繁，请稍后再试。" });

  try {
    const pathname = requestPath(event);
    if (pathname === "/v1/directory") return response(200, await readData("securities.json"));
    if (pathname === "/v1/manifest") return response(200, await readData("etf-pack-manifest.json"));
    if (pathname === "/v1/history") {
      const id = String(query(event).id || "");
      if (!id) return response(400, { error: "missing_id", message: "请选择一个ETF后再加载历史。" });
      const manifest = await readData("etf-pack-manifest.json");
      const entry = manifestEntryFor(manifest, id);
      if (!entry) return response(404, { error: "not_in_pack", message: "该证券不在300只主流ETF或15个参照指数清单中。" });
      if (!entry.historyPath) return response(404, { error: "history_pending", message: "清单已核验，但历史数据和公开展示权限仍待补齐。" });
      const relativePath = entry.historyPath.replace(/^data\//, "");
      if (!/^[A-Za-z0-9_./-]+$/.test(relativePath) || relativePath.includes("..")) return response(400, { error: "invalid_path" });
      return response(200, await readData(relativePath));
    }
    if (pathname === "/v1/macro") return response(200, await readData("macro-history.json"));
    if (pathname === "/v1/search") {
      const params = query(event);
      const needle = String(params.q || "").trim().toLowerCase();
      const market = String(params.market || "ALL");
      if (!needle) return response(200, []);
      const directory = await readData("securities.json");
      const results = directory.filter((item) => {
        if (market !== "ALL" && item.market !== market) return false;
        return `${item.symbol} ${item.name} ${item.aliases}`.toLowerCase().includes(needle);
      }).slice(0, 20);
      return response(200, results);
    }
    if (pathname === "/v1/capabilities") {
      const directory = await readData("securities.json");
      const manifest = await readData("etf-pack-manifest.json");
      const manifestById = new Map([...(manifest.entries || []), ...(manifest.indices || [])].map((entry) => [entry.id, entry]));
      const indices = (manifest.indices || []).map((item) => ({ ...item, assetType: "指数" }));
      return response(200, [...directory, ...indices].map((item) => ({
        id: item.id,
        mode: item.instrumentKind === "index" ? "index-context" : manifestById.get(item.id)?.historyPath && looksLikeFund(item) ? "etf-replay" : "catalog-only",
        status: item.instrumentKind === "index" ? "index-context" : manifestById.get(item.id)?.historyPath && looksLikeFund(item) ? "history-available" : manifestById.has(item.id) ? "pack-pending" : "catalog-only",
      })));
    }
    return response(404, { error: "not_found", message: "内测接口路径不存在。" });
  } catch (error) {
    console.error("market-api error", error);
    return response(503, { error: "data_unavailable", message: "内测数据暂时不可用，请稍后再试。" });
  }
}

exports.main = main;
