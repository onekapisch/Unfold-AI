import { createSummaryEngine } from "../core/summary/summaryEngine";

const status = document.getElementById("model-status");
const prepare = document.getElementById("prepare-model") as HTMLButtonElement | null;
const finish = document.getElementById("finish") as HTMLButtonElement | null;

prepare?.addEventListener("click", () => {
  prepare.disabled = true;
  prepare.textContent = "Checking…";
  const engine = createSummaryEngine({ preferBuiltIn: true });
  void engine.requestModelDownload(true).then((result) => {
    if (status) {
      status.textContent = result === "ready"
        ? "Chrome’s on-device model is ready. Future eligible answers will use it automatically."
        : "The built-in model is not available in this browser. Unfold will keep using its private extractive summary.";
    }
    prepare.textContent = result === "ready" ? "Model ready" : "Use local fallback";
    engine.destroy();
  });
});

finish?.addEventListener("click", () => window.close());
