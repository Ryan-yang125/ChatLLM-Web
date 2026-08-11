import { useRef, useState } from "react";
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
import { allModels, modelSizeLabel, parseCustomManifest } from "@/features/models/catalog";
import { formatBytes, isModelCompatible } from "@/features/runtime/device";
import { useChatStore } from "@/store/chat";

type Filter = "all" | "recommended" | "compatible" | "cached" | "custom";

export function ModelsPage() {
  const { t, i18n } = useTranslation();
  const state = useChatStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [manifest, setManifest] = useState("");
  const [manifestError, setManifestError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const models = allModels(state.customModels);
  const recommended = models.find((model) => model.id === state.recommendedModelId) ?? models[0];

  const visible = (() => {
    const needle = query.trim().toLowerCase();
    return models.filter((model) => {
      if (needle && !`${model.label} ${model.bestFor} ${model.family}`.toLowerCase().includes(needle)) return false;
      if (filter === "recommended") return model.id === state.recommendedModelId;
      if (filter === "compatible") return isModelCompatible(model, state.deviceProfile);
      if (filter === "cached") return state.cacheByModel[model.id] === "cached";
      if (filter === "custom") return model.source === "custom";
      return true;
    });
  })();

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
    : "Unknown";

  return (
    <main className="models-page" id="main-content">
      <header className="models-header">
        <div>
          <span>{t("models.eyebrow")}</span>
          <h1>{t("models.title")}</h1>
        </div>
        <Link className="bui-secondary" to="/"><ArrowLeftIcon size={15} /> Back to chat</Link>
      </header>

      <section className="studio-section">
        <div className="section-heading"><span>01</span><h2>{t("models.device")}</h2></div>
        <div className="insight-grid">
          <InsightCard label={t("models.webgpu")} value={state.deviceProfile?.webGPU ? "Ready" : "Unavailable"} icon={<MonitorIcon size={17} />} />
          <InsightCard label={t("models.memory")} value={state.deviceProfile?.deviceMemoryGB ? `${state.deviceProfile.deviceMemoryGB} GB` : "Unknown"} icon={<ComponentIcon size={17} />} />
          <InsightCard label={t("models.storage")} value={storage} icon={<ShieldCheckIcon size={17} />} />
          <InsightCard label={t("models.runtime")} value="WebLLM 0.2.84" icon={<CheckCircle2Icon size={17} />} />
        </div>
      </section>

      <section className="studio-section">
        <div className="section-heading"><span>02</span><h2>{t("models.recommendation")}</h2></div>
        {state.runtimePhase === "checking" ? <div className="studio-loading bui-card"><PixelLoader label="Checking device" /></div> : (
          <RecommendationCard model={recommended} compatible={isModelCompatible(recommended, state.deviceProfile)} onUse={() => void state.requestModel(recommended.id)} />
        )}
      </section>

      <section className="studio-section model-catalog-section">
        <div className="section-heading"><span>03</span><h2>{t("models.catalog")}</h2></div>
        <div className="catalog-toolbar">
          <div className="catalog-search"><SearchIcon size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search models" aria-label="Search models" /></div>
          <div className="filter-pills" aria-label="Model filters">
            {(["all", "recommended", "compatible", "cached", "custom"] as Filter[]).map((item) => (
              <button type="button" key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>
                {item === "custom" ? t("models.customFilter") : t(`models.${item}`)}
              </button>
            ))}
          </div>
          <button className="filter-icon"><FilterIcon size={15} /></button>
        </div>

        <div className="model-table bui-card" role="table" aria-label="Local model catalog">
          <div className="model-table-head" role="row">
            <span>{t("models.model")}</span><span>{t("models.bestFor")}</span><span>{t("models.context")}</span><span>{t("models.required")}</span><span>{t("models.status")}</span><span>{t("models.action")}</span>
          </div>
          {visible.map((model) => {
            const compatible = isModelCompatible(model, state.deviceProfile);
            const active = state.activeModelId === model.id;
            const cached = state.cacheByModel[model.id] === "cached";
            const busy = active && ["downloading", "loading"].includes(state.runtimePhase);
            const status = active && state.runtimePhase === "ready" ? "ready" : busy ? "loading" : cached ? "cached" : compatible ? "available" : "incompatible";
            return (
              <div className="model-table-row" role="row" key={model.id}>
                <div className="model-name-cell"><span><ComponentIcon size={16} /></span><div><strong>{model.label}</strong><small>{model.family} · {model.source}</small></div>{model.id === state.recommendedModelId ? <i>Recommended</i> : null}</div>
                <span>{i18n.language === "zh" ? model.bestForZh : model.bestFor}</span>
                <span className="mono-label">{model.contextWindow / 1024}K</span>
                <span className="mono-label">{modelSizeLabel(model)}</span>
                <span><i className={`status-dot is-${status}`} />{status === "cached" ? t("models.cached") : t(`models.${status}`)}</span>
                <div className="model-actions">
                  {busy ? <PixelLoader label="Loading" progress={state.modelProgress} /> : (
                    <button className="table-action" type="button" disabled={!compatible} onClick={() => void state.requestModel(model.id)}>{active && state.runtimePhase === "error" ? <RefreshCwIcon size={13} /> : null}{active && state.runtimePhase === "ready" ? "Active" : cached ? t("models.use") : t("models.load")}</button>
                  )}
                  {cached ? <button className="table-icon" type="button" onClick={() => state.requestDeleteCache(model.id)} aria-label={`Delete ${model.label} cache`}><Trash2Icon size={13} /></button> : null}
                  {model.source === "custom" ? <button className="table-icon" type="button" onClick={() => state.removeCustomModel(model.id)} aria-label={`Remove ${model.label}`}><Trash2Icon size={13} /></button> : null}
                </div>
              </div>
            );
          })}
          {!visible.length ? <div className="table-empty">No matching models</div> : null}
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
            <button className="bui-secondary" type="button" onClick={() => fileRef.current?.click()}>Choose JSON</button>
            <button className="bui-primary" type="button" disabled={!manifest.trim()} onClick={() => importManifest()}>{t("models.import")}</button>
          </footer>
        </div>
      </section>
    </main>
  );
}
