import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      common: { recommended: "Recommended", compatible: "Compatible", checkDevice: "Check device", memory: "Memory", context: "Context", privacy: "Privacy", onDevice: "On-device", cancel: "Cancel", confirm: "Confirm" },
      nav: { newChat: "New chat", conversations: "Conversations", models: "Models", github: "GitHub", theme: "Theme", language: "Language" },
      chat: {
        title: "Local AI, ready when you are.",
        private: "Private by default",
        placeholder: "Ask anything…",
        send: "Send message",
        stop: "Stop generation",
        addContext: "Add local files",
        context: "Context",
        commands: "Commands",
        suggestions: { explain: "Explain WebGPU", write: "Write clearly", summarize: "Summarize notes", review: "Review code" },
      },
      runtime: {
        idle: "On demand", checking: "Checking", approval: "Needs approval", downloading: "Downloading",
        loading: "Loading", ready: "Ready", generating: "Generating", interrupted: "Stopped", error: "Error", unsupported: "Unsupported",
      },
      models: {
        eyebrow: "LOCAL MODEL STUDIO", title: "Models", device: "Device", recommendation: "Recommended for this device",
        catalog: "Model catalog", custom: "Custom MLC model", import: "Import manifest", paste: "Paste model manifest JSON",
        all: "All", compatible: "Compatible", cached: "Cached", customFilter: "Custom", recommended: "Recommended",
        coding: "Coding", reasoning: "Reasoning", vision: "Vision", tools: "Tools", experimental: "Experimental",
        webgpu: "WebGPU", memory: "Device memory", storage: "Browser storage", runtime: "Runtime",
        model: "Model", bestFor: "Best for", context: "Context", required: "Required memory", source: "Source", status: "Status", action: "Action",
        load: "Load", use: "Use in chat", remove: "Remove", deleteCache: "Delete cache", retry: "Retry", unavailable: "Unavailable", available: "Available", ready: "Ready", loading: "Loading", incompatible: "Incompatible",
        highMemory: "High memory", active: "Active", unknown: "Unknown", back: "Back to chat", checkingDevice: "Checking device", logicalModels: "logical models",
        search: "Search models", filters: "Model filters", advanced: "Advanced", noMatches: "No matching models", chooseJson: "Choose JSON",
        tier: { stable: "Stable", experimental: "Experimental", advanced: "Advanced", custom: "Custom" },
        capability: { chat: "Chat", coding: "Coding", reasoning: "Reasoning", vision: "Vision", tools: "Tools", base: "Base" },
      },
      approval: { cancel: "Cancel", confirm: "Confirm", downloadTitle: "Download local model?", deleteTitle: "Delete model cache?", customTitle: "Trust this model source?", fallbackTitle: "Load the lighter model?" },
    },
  },
  zh: {
    translation: {
      common: { recommended: "推荐", compatible: "兼容", checkDevice: "检查设备", memory: "内存", context: "上下文", privacy: "隐私", onDevice: "本地运行", cancel: "取消", confirm: "确认" },
      nav: { newChat: "新建对话", conversations: "对话", models: "模型", github: "GitHub", theme: "主题", language: "语言" },
      chat: {
        title: "本地 AI，随时开始。", private: "默认隐私", placeholder: "输入问题…", send: "发送消息", stop: "停止生成",
        addContext: "添加本地文件", context: "上下文", commands: "命令",
        suggestions: { explain: "解释 WebGPU", write: "优化表达", summarize: "总结笔记", review: "审查代码" },
      },
      runtime: {
        idle: "按需加载", checking: "检测中", approval: "等待确认", downloading: "下载中", loading: "加载中",
        ready: "已就绪", generating: "生成中", interrupted: "已停止", error: "错误", unsupported: "不支持",
      },
      models: {
        eyebrow: "本地模型工作台", title: "模型", device: "设备", recommendation: "适合当前设备",
        catalog: "模型目录", custom: "自定义 MLC 模型", import: "导入清单", paste: "粘贴模型清单 JSON",
        all: "全部", compatible: "兼容", cached: "已缓存", customFilter: "自定义", recommended: "推荐",
        coding: "编程", reasoning: "推理", vision: "视觉", tools: "工具", experimental: "实验",
        webgpu: "WebGPU", memory: "设备内存", storage: "浏览器存储", runtime: "运行时",
        model: "模型", bestFor: "适用场景", context: "上下文", required: "内存需求", source: "来源", status: "状态", action: "操作",
        load: "加载", use: "用于对话", remove: "移除", deleteCache: "删除缓存", retry: "重试", unavailable: "不可用", available: "可用", ready: "已就绪", loading: "加载中", incompatible: "不兼容",
        highMemory: "高内存", active: "使用中", unknown: "未知", back: "返回对话", checkingDevice: "正在检查设备", logicalModels: "个逻辑模型",
        search: "搜索模型", filters: "模型筛选", advanced: "高级目录", noMatches: "没有匹配模型", chooseJson: "选择 JSON",
        tier: { stable: "稳定", experimental: "实验", advanced: "高级", custom: "自定义" },
        capability: { chat: "对话", coding: "编程", reasoning: "推理", vision: "视觉", tools: "工具", base: "基础" },
      },
      approval: { cancel: "取消", confirm: "确认", downloadTitle: "下载本地模型？", deleteTitle: "删除模型缓存？", customTitle: "信任此模型来源？", fallbackTitle: "加载轻量模型？" },
    },
  },
};

const initialLanguage = typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export { i18n };
