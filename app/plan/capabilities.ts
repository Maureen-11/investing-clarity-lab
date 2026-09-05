import type { EtfPackEntry, HistorySeries, Security } from "./engine";

export type AnalysisMode = "etf-replay" | "index-context" | "stock-facts" | "catalog-only";
export type CapabilityStatus = "history-available" | "index-context" | "facts-only" | "pack-pending" | "catalog-only";

export type AnalysisCapability = {
  mode: AnalysisMode;
  status: CapabilityStatus;
  label: string;
  description: string;
};

export function isFundLike(security: Security | null | undefined) {
  if (!security) return false;
  const value = `${security.assetType} ${security.name}`.toLowerCase();
  return value.includes("etf") || value.includes("基金") || value.includes("reit") || value.includes("exchange traded");
}

export function isIndex(security: Security | null | undefined, packEntry?: EtfPackEntry) {
  return security?.instrumentKind === "index" || packEntry?.instrumentKind === "index";
}

/**
 * A security can be searchable without having a licensed, verifiable history.
 * This intentionally keeps that distinction explicit instead of treating every
 * directory entry as an ETF-style long-term conclusion candidate.
 */
export function capabilityFor(security: Security | null, history?: HistorySeries, packEntry?: EtfPackEntry): AnalysisCapability {
  if (isIndex(security, packEntry) && history) {
    return {
      mode: "index-context",
      status: "index-context",
      label: "指数市场参照",
      description: "这是不可直接购买的指数，只展示年度表现和回撤，并引导到对应ETF；不会生成指数定投结果。",
    };
  }
  if (history && isFundLike(security)) {
    return {
      mode: "etf-replay",
      status: "history-available",
      label: "可进行历史回放",
      description: history.licenseStatus === "not-confirmed"
        ? "已接入供应商复权历史，可计算定投路径和回撤；公开展示许可尚未确认。"
        : "已接入复权历史，可计算定投路径、滚动窗口和回撤。",
    };
  }
  if (history && !isFundLike(security)) {
    return {
      mode: "stock-facts",
      status: "facts-only",
      label: "可做事实统计",
      description: "个股按价格、股息和回撤等事实展示，不套用 ETF 式长期结论。",
    };
  }
  if (packEntry?.historyPath && packEntry.dataStatus === "history-available" && isFundLike(security)) {
    return {
      mode: "etf-replay",
      status: "history-available",
      label: "可进行历史回放",
      description: "历史文件已就绪；选择后按需加载并计算定投路径和回撤。公开展示许可尚未确认。",
    };
  }
  if (packEntry && isFundLike(security)) {
    return {
      mode: "catalog-only",
      status: "pack-pending",
      label: "主流ETF清单 · 暂无历史",
      description: `已纳入300只主流ETF清单（${packEntry.category}），但暂无可核验的复权历史，因此不生成收益范围。`,
    };
  }
  return {
    mode: "catalog-only",
    status: "catalog-only",
    label: "历史数据不足",
    description: isFundLike(security)
      ? "已找到证券目录资料，但暂时没有可核验的公开历史。"
      : "已找到个股目录资料，但暂时没有可核验的价格或股息历史。",
  };
}

export function packEntryFor(entries: EtfPackEntry[], security: Security | null | undefined) {
  if (!security) return undefined;
  return entries.find((entry) => entry.id === security.id);
}

export function historyFor(library: Record<string, HistorySeries>, security: Security | null | undefined) {
  if (!security) return undefined;
  return library[security.id] ?? library[security.symbol];
}
