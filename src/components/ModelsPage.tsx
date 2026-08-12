import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ComponentIcon,
  FilterIcon,
  MonitorIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UploadIcon,
} from "@/components/icons";
import { InsightCard, PixelLoader, RecommendationCard } from "@/components/beautiful-ui/Primitives";
import {
  allModels,
  CURATED_MODEL_COUNT,
  logicalModelKey,
  modelSizeLabel,
  OFFICIAL_LOGICAL_MODEL_COUNT,
  OFFICIAL_MODEL_RECORD_COUNT,
  parseCustomManifest,
} from "@/features/models/catalog";
import { formatBytes, isModelCompatible, modelFit } from "@/features/runtime/device";
import { useChatStore } from "@/store/chat";
import type { ModelCapability } from "@/types/chat";

type Filter = "all" | "recommended" | "compatible" | "cached" | "coding" | "reasoning" | "vision" | "tools" | "experimental" | "custom";

const filters: Filter[] = ["all", "recommended", "compatible", "cached", "coding", "reasoning", "vision", "tools", "experimental", "custom"];

export function ModelsPage() {
  const { t, i18n } = useTranslation();
  const state = useChatStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manifest, setManifest] = useState("");
  const [manifestError, setManifestError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const refreshCacheStatus = state.refreshCacheStatus;

  const models = useMemo(() => allModels(state.customModels, {
    includeAdvanced: showAdvanced,
    profile: state.deviceProfile,
  }), [showAdvanced, state.customModels, state.deviceProfile]);

  const recommendedKey = logicalModelKey(state.recommendedModelId);
  const recommended = models.find((model) => logicalModelKey(model.id) === recommendedKey) ?? models[0];

  useEffect(() => {
    if (showAdvanced) void refreshCacheStatus(models.map((model) => model.id));
  }, [models, refreshCacheStatus, showAdvanced]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return models
      .filter((model) => {
        const haystack = `${model.label} ${model.id} ${model.bestFor} ${model.bestForZh} ${model.family} ${model.capabilities.join(" ")}`.toLowerCase();
        if (needle && !haystack.includes(needle)) return false;
        if (filter === "recommended") return logicalModelKey(model.id) === recommendedKey;
        if (filter === "compatible") return isModelCompatible(model, state.deviceProfile);
        if (filter === "cached") return state.cacheByModel[model.id] === "cached";
        if (filter === "custom") return model.source === "custom";
        if (filter === "experimental") return model.tier === "experimental";
        if (["coding", "reasoning", "vision", "tools"].includes(filter)) return model.capabilities.includes(filter as ModelCapability);
        return true;
      })
      .sort((a, b) => {
        const recommendedDelta = Number(logicalModelKey(b.id) === recommendedKey) - Number(logicalModelKey(a.id) === recommendedKey);
        if (recommendedDelta) return recommendedDelta;
        const cachedDelta = Number(state.cacheByModel[b.id] === "cached") - Number(state.cacheByModel[a.id] === "cached");
        if (cachedDelta) return cachedDelta;
        return a.vramRequiredMB - b.vramRequiredMB || a.label.localeCompare(b.label);
      });
  }, [filter, models, query, recommendedKey, state.cacheByModel, state.deviceProfile]);

  function importManifest(raw = manifest) {
    setManifestError(null);
    try {
      const parsed = parseCustomManifest(raw, models.map((model) => model.id));
      state.requestCustomModel(parsed);
      setManifest("");
    } catch (error) {
      setManifestError(error instanceof Error ? error.message : String(error));
    }
  }

  async function readManifestFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setManifest(text);
    importManifest(text);
  }

  const storage = state.deviceProfile?.storageQuota
    ? `${formatBytes(state.deviceProfile.storageUsage)} / ${formatBytes(state.deviceProfile.storageQuota)}`
    : t("models.unknown");

  return (
    <main className="models-page" id="main-content">
      <header className="models-header">
        <div><span>{t("models.eyebrow")}</span><h1>{t("models.title")}</h1></div>
        <Link className="bui-secondary" to="/"><ArrowLeftIcon size={15} /> {t("models.back")}</Link>
      </header>

      <section className="studio-section">
        <div className="section-heading"><span>01</span><h2>{t("models.device")}</h2></div>
        <div className="insight-grid">
          <InsightCard label={t("models.webgpu")} value={state.deviceProfile?.webGPU ? t("models.ready") : t("models.unavailable")} icon={<MonitorIcon size={17} />} />
          <InsightCard label={t("models.memory")} value={state.deviceProfile?.deviceMemoryGB ? `${state.deviceProfile.deviceMemoryGB} GB` : t("models.unknown")} icon={<ComponentIcon size={17} />} />
          <InsightCard label={t("models.storage")} value={storage} icon={<ShieldCheckIcon size={17} />} />
          <InsightCard label={t("models.runtime")} value="WebLLM 0.2.84" icon={<CheckCircle2Icon size={17} />} />
        </div>
      </section>

      <section className="studio-section">
        <div className="section-heading"><span>02</span><h2>{t("models.recommendation")}</h2></div>
        {state.runtimePhase === "checking" ? <div className="studio-loading bui-card"><PixelLoader label={t("models.checkingDevice")} /></div> : (
          <RecommendationCard model={recommended} compatible={isModelCompatible(recommended, state.deviceProfile)} onUse={() => void state.requestModel(recommended.id)} />
        )}
      </section>

      <section className="studio-section model-catalog-section">
        <div className="section-heading">
          <span>03</span><h2>{t("models.catalog")}</h2>
          <i className="catalog-count">{showAdvanced ? OFFICIAL_LOGICAL_MODEL_COUNT : CURATED_MODEL_COUNT} {t("models.logicalModels")}</i>
        </div>
        <div className="catalog-toolbar">
          <div className="catalog-search"><SearchIcon size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("models.search")} aria-label={t("models.search")} /></div>
          <div className="filter-pills" aria-label={t("models.filters")}>
            {filters.map((item) => (
              <button type="button" key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>
                {item === "custom" ? t("models.customFilter") : t(`models.${item}`)}
              </button>
            ))}
          </div>
          <button className={`advanced-toggle${showAdvanced ? " is-active" : ""}`} type="button" aria-pressed={showAdvanced} onClick={() => setShowAdvanced((value) => !value)}>
            <FilterIcon size={15} /><span>{t("models.advanced")}</span><i title={`${OFFICIAL_MODEL_RECORD_COUNT} WebLLM runtime records`}>{OFFICIAL_LOGICAL_MODEL_COUNT}</i>
          </button>
        </div>

        <div className="model-table bui-card" role="table" aria-label={t("models.catalog")}>
          <div className="model-table-head" role="row">
            <span>{t("models.model")}</span><span>{t("models.bestFor")}</span><span>{t("models.context")}</span><span>{t("models.required")}</span><span>{t("models.status")}</span><span>{t("models.action")}</span>
          </div>
          {visible.map((model) => {
            const fit = modelFit(model, state.deviceProfile);
            const compatible = fit !== "incompatible";
            const active = state.activeModelId === model.id;
            const cached = state.cacheByModel[model.id] === "cached";
            const busy = active && ["downloading", "loading"].includes(state.runtimePhase);
            const status = active && state.runtimePhase === "ready" ? "ready" : busy ? "loading" : cached ? "cached" : fit === "high-memory" ? "highMemory" : compatible ? "available" : "incompatible";
            const capabilityLabels = model.capabilities.filter((capability) => capability !== "chat").slice(0, 3);
            return (
              <div className="model-table-row" role="row" key={model.id}>
                <div className="model-name-cell">
                  <span><ComponentIcon size={16} /></span>
                  <div><strong>{model.label}</strong><small>{model.family} · {t(`models.tier.${model.tier}`)}</small></div>
                  {logicalModelKey(model.id) === recommendedKey ? <i>{t("models.recommended")}</i> : null}
                </div>
                <div className="model-purpose-cell">
                  <span>{i18n.language === "zh" ? model.bestForZh : model.bestFor}</span>
                  <div>{(capabilityLabels.length ? capabilityLabels : ["chat"]).map((capability) => <i key={capability}>{t(`models.capability.${capability}`)}</i>)}</div>
                </div>
                <span className="mono-label">{model.contextWindow / 1024}K</span>
                <span className="mono-label">{modelSizeLabel(model)}</span>
                <span><i className={`status-dot is-${status === "highMemory" ? "high-memory" : status}`} />{t(`models.${status}`)}</span>
                <div className="model-actions">
                  {busy ? <PixelLoader label={t("models.loading")} progress={state.modelProgress} /> : (
                    <button className="table-action" type="button" disabled={!compatible} onClick={() => void state.requestModel(model.id)}>
                      {active && state.runtimePhase === "error" ? <RefreshCwIcon size={13} /> : null}
                      {active && state.runtimePhase === "ready" ? t("models.active") : cached ? t("models.use") : t("models.load")}
                    </button>
                  )}
                  {cached ? <button className="table-icon" type="button" onClick={() => state.requestDeleteCache(model.id)} aria-label={`${t("models.deleteCache")} ${model.label}`}><Trash2Icon size={13} /></button> : null}
                  {model.source === "custom" ? <button className="table-icon" type="button" onClick={() => state.removeCustomModel(model.id)} aria-label={`${t("models.remove")} ${model.label}`}><Trash2Icon size={13} /></button> : null}
                </div>
              </div>
            );
          })}
          {!visible.length ? <div className="table-empty">{t("models.noMatches")}</div> : null}
        </div>
      </section>

      <section className="studio-section custom-model-section">
        <div className="section-heading"><span>04</span><h2>{t("models.custom")}</h2></div>
        <div className="custom-model-card bui-card">
          <div className="custom-model-copy"><div><UploadIcon size={17} /></div><h3>{t("models.import")}</h3><p>MLC ModelRecord · HTTPS · 4K context</p></div>
          <textarea value={manifest} onChange={(event) => setManifest(event.target.value)} placeholder={t("models.paste")} aria-label={t("models.paste")} rows={7} />
          {manifestError ? <p className="manifest-error" role="alert">{manifestError}</p> : null}
          <footer>
            <input ref={fileRef} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void readManifestFile(event.target.files?.[0])} />
            <button className="bui-secondary" type="button" onClick={() => fileRef.current?.click()}>{t("models.chooseJson")}</button>
            <button className="bui-primary" type="button" disabled={!manifest.trim()} onClick={() => importManifest()}>{t("models.import")}</button>
          </footer>
        </div>
      </section>
    </main>
  );
}
