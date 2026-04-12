/**
 * enhancer.ts — core logic that applies the layered reader to a single
 * assistant message element.
 *
 * Streaming architecture (two phases):
 *
 *  Phase 1 — IMMEDIATE (first time message hits threshold, even mid-stream)
 *   · Enhance right away: plan chunks, show first N, hide the rest.
 *   · Attach a streaming-overflow MutationObserver on the content root.
 *     Uses POSITION-BASED hiding (first visibleCount children shown, rest
 *     hidden) so it is immune to React/SPA element-identity churn.
 *
 *  Phase 2 — STABLE RE-PLAN (after streaming ends)
 *   · Once content hash is unchanged for RE_PLAN_STABLE_MS, re-plan IN PLACE:
 *     – Header text nodes updated (no remove/reinsert → zero layout shift).
 *     – applyVisibility re-run with new chunk boundaries.
 *     – Streaming-overflow observer disconnected (streaming is over).
 *   · User's read position (expandedChunks) is preserved across re-plans.
 *
 *  React/SPA re-render resilience:
 *   · All visibility decisions are position-based (show first N children by
 *     DOM order) rather than element-identity based.  This means that when
 *     React replaces old <p> nodes with fresh <p> nodes, the streaming
 *     observer immediately re-applies the correct visibility without needing
 *     to know the old element references.
 *   · When plan block elements are detached (isPlanStale), we skip the
 *     stability wait and re-plan immediately.
 */

import { planChunks } from "@core/chunking/chunker";
import { toSemanticBlock } from "@core/chunking/blockClassifier";
import { directElementChildren, safeText } from "@core/dom";
import { fnv1a } from "@core/hashing";
import { generateHeuristicSummary } from "@core/summary/heuristicSummary";
import { buildRevealBar, buildCollapseToggle } from "@core/ui/controls";
import { buildHeader, readTimeLabel } from "@core/ui/header";
import type { ChunkPlan, GlobalSettings, MessageState, SummaryResult, ProviderAdapter } from "@core/types";
import { saveMessageState } from "@core/state/storage";

// ── DOM attribute names ────────────────────────────────────────────
const ENHANCED_ATTR  = "data-lar-enhanced";
const HASH_ATTR      = "data-lar-hash";
const HIDDEN_ATTR    = "data-lar-hidden";
const STREAMING_ATTR = "data-lar-streaming";

// ── Timing ────────────────────────────────────────────────────────
/** How long content hash must be stable before we do a full re-plan. */
const RE_PLAN_STABLE_MS = 300;

// ── Per-message state (module-level WeakMaps, GC-safe) ────────────
interface StabilityRecord { hash: string; seenAt: number }
const stabilityMap  = new WeakMap<HTMLElement, StabilityRecord>();

/** Per-message streaming-overflow observer (disconnected after re-plan). */
const streamObsMap  = new WeakMap<HTMLElement, MutationObserver>();

/** Saved MessageState per message, so re-plan can restore read position. */
const savedStateMap = new WeakMap<HTMLElement, MessageState>();

/** Per-message action callbacks, used by keyboard shortcut handler. */
export interface ActiveCallbacks {
  onShowNext:  () => void;
  onExpandAll: () => void;
  onCollapse:  () => void;
  onStepBack:  () => void;
}
const callbackMap = new WeakMap<HTMLElement, ActiveCallbacks>();

/** Handle for in-place re-plan — avoids teardown/rebuild layout shifts. */
interface EnhancementHandle {
  /** Full re-plan: update all header cards + re-apply visibility. */
  replan(newPlan: ChunkPlan): void;
  /**
   * Returns true when the plan's block elements have been detached from the
   * document (React/framework replaced the inner DOM). In this case callers
   * should skip the stability timer and trigger an immediate replan().
   */
  isPlanStale(): boolean;
  /**
   * Immediately hide any overflow children beyond the current visible fold.
   * Position-based: hides children at index >= visibleCount.
   */
  hideOverflow(): void;
}
const handleMap = new WeakMap<HTMLElement, EnhancementHandle>();

/** Stored ref to the reveal bar element for clean teardown. */
const revealBarMap = new WeakMap<HTMLElement, HTMLElement>();

export function getCallbacks(el: HTMLElement): ActiveCallbacks | undefined {
  return callbackMap.get(el);
}

// ── Quick content hash (cheap enough for every tick) ──────────────
function quickHash(el: HTMLElement): string {
  const t = el.textContent ?? "";
  return fnv1a(`${t.length}:${t.slice(0, 2048)}`);
}

// ── How many children should be visible given current plan + state ─
function visibleChildCount(plan: ChunkPlan, state: MessageState): number {
  if (state.isCollapsed) return 0;
  const chunks = plan.chunks.slice(0, state.expandedChunks);
  return chunks.reduce((sum, chunk) => sum + chunk.blocks.length, 0);
}

// ── Public interface ───────────────────────────────────────────────
export interface EnhancementContext {
  adapter: ProviderAdapter;
  settings: GlobalSettings;
  messageEl: HTMLElement;
  messageId: string;
  conversationId: string | null;
}

export function enhanceMessage(ctx: EnhancementContext, restore?: MessageState): boolean {
  const { adapter, settings, messageEl } = ctx;

  const contentRoot = adapter.getRenderableContentRoot(messageEl);
  if (!contentRoot) return false;

  const approxWords = (contentRoot.textContent ?? "").trim().split(/\s+/).length;
  if (approxWords < settings.lengthThreshold) return false;

  const alreadyEnhanced = messageEl.getAttribute(ENHANCED_ATTR) === "1";

  if (alreadyEnhanced) {
    // ── RE-PLAN path ───────────────────────────────────────────────
    const handle = handleMap.get(messageEl);

    // Fast path: plan block elements are detached — React/SPA replaced the
    // inner DOM. Skip the stability timer and re-plan immediately.
    if (handle && handle.isPlanStale()) {
      const savedState = savedStateMap.get(messageEl);
      const plan = planChunks(contentRoot, settings.defaultPreset, settings.revealWords);
      handle.replan(plan);
      if (savedState) savedStateMap.set(messageEl, savedState);
      return true;
    }

    const h   = quickHash(contentRoot);
    const now = performance.now();
    const prev = stabilityMap.get(messageEl);

    if (!prev || prev.hash !== h) {
      stabilityMap.set(messageEl, { hash: h, seenAt: now });
      // Hide any new overflow elements while we wait for stability.
      if (handle) handle.hideOverflow();
      return false;
    }
    if (now - prev.seenAt < RE_PLAN_STABLE_MS) {
      if (handle) handle.hideOverflow();
      return false;
    }

    const plan = planChunks(contentRoot, settings.defaultPreset, settings.revealWords);
    if (messageEl.getAttribute(HASH_ATTR) === plan.contentHash) return false;

    // Content is now stable — re-plan in-place (no layout shift).
    if (handle) {
      handle.replan(plan);
      return true;
    }

    // Safety fallback: handle missing (shouldn't happen). Full rebuild.
    const savedState = savedStateMap.get(messageEl);
    teardown(messageEl, contentRoot);
    return applyEnhancement(ctx, plan, savedState);
  }

  // ── FIRST ENHANCEMENT — no stability wait ──────────────────────
  const plan = planChunks(contentRoot, settings.defaultPreset, settings.revealWords);
  return applyEnhancement(ctx, plan, restore);
}

// ── Core enhancement logic ─────────────────────────────────────────
function applyEnhancement(
  ctx: EnhancementContext,
  plan: ChunkPlan,
  restore?: MessageState,
): boolean {
  const { adapter, settings, messageEl, messageId, conversationId } = ctx;
  const contentRoot = adapter.getRenderableContentRoot(messageEl)!;

  const blocks  = Array.from(directElementChildren(contentRoot)).map(toSemanticBlock);
  const summary = generateHeuristicSummary({ blocks, chunks: plan.chunks });
  const header  = buildHeader(summary, readTimeLabel(summary.readTimeSec));
  header.setAttribute("data-lar-header", "1");

  const state: MessageState = restore ?? {
    expandedChunks: initialExpandedChunks(settings, plan.chunks.length),
    isFullyExpanded: false,
    isCollapsed: false,
  };

  // Mutable plan ref — re-plan closure can swap it without rebuilding closures.
  let activePlan = plan;

  // Mutable content root ref — updated by replan() when React/SPA replaces
  // the inner element so that sync() always operates on the live DOM node.
  let activeContentRoot = contentRoot;

  // Must declare revealBar before closures that reference it.
  let revealBar: ReturnType<typeof buildRevealBar>;

  // Save state to WeakMap after every action so re-plan can restore it.
  const saveState = () => savedStateMap.set(messageEl, { ...state });

  /** Smooth-scroll the newly revealed chunk into view. */
  const scrollToNewContent = () => {
    try {
      const children = Array.from(directElementChildren(activeContentRoot));
      const showCount = visibleChildCount(activePlan, state);
      // Find the first element of the newly revealed chunk
      const target = children[showCount - 1] ?? revealBar?.el;
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } catch { /* non-critical */ }
  };

  // ── Actions ─────────────────────────────────────────────────────
  const doShowNext = () => {
    if (state.isCollapsed) state.isCollapsed = false;
    if (state.expandedChunks < activePlan.chunks.length) {
      state.expandedChunks += 1;
      if (state.expandedChunks >= activePlan.chunks.length) state.isFullyExpanded = true;
    }
    sync(); saveState(); persist();
    requestAnimationFrame(scrollToNewContent);
  };

  const doExpandAll = () => {
    state.expandedChunks = activePlan.chunks.length;
    state.isFullyExpanded = true;
    state.isCollapsed = false;
    sync(); saveState(); persist();
  };

  const doCollapse = () => {
    state.isCollapsed = !state.isCollapsed;
    if (!state.isCollapsed && state.expandedChunks === 0) {
      state.expandedChunks = initialExpandedChunks(settings, activePlan.chunks.length);
    }
    collapseToggle.querySelector("span")!.textContent =
      state.isCollapsed ? "↓ Reopen" : "↑ Collapse";
    sync(); saveState(); persist();
    if (state.isCollapsed) {
      // Scroll header into view when collapsing
      requestAnimationFrame(() => {
        try { header.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch { /* */ }
      });
    }
  };

  const doStepBack = () => {
    if (state.expandedChunks > 1) {
      state.expandedChunks -= 1;
      state.isFullyExpanded = false;
      sync(); saveState(); persist();
    }
  };

  // ── Collapse toggle (header top-right) ──────────────────────────
  const collapseToggle = buildCollapseToggle(doCollapse);
  header.querySelector(".lar-header-top")!.appendChild(collapseToggle);

  // Insert header immediately before contentRoot (no flicker: single insert).
  contentRoot.parentElement?.insertBefore(header, contentRoot);

  // ── Reveal bar ──────────────────────────────────────────────────
  // Placed as a sibling AFTER contentRoot — never inside it.
  revealBar = buildRevealBar({ onShowNext: doShowNext, onExpandAll: doExpandAll, onCollapse: doCollapse, onStepBack: doStepBack });
  contentRoot.after(revealBar.el);
  revealBarMap.set(messageEl, revealBar.el);

  // ── Register callbacks for keyboard shortcuts ────────────────────
  callbackMap.set(messageEl, { onShowNext: doShowNext, onExpandAll: doExpandAll, onCollapse: doCollapse, onStepBack: doStepBack });

  // ── Apply initial visibility ─────────────────────────────────────
  function sync() {
    applyVisibility(activePlan, state, activeContentRoot, revealBar);
  }
  sync();

  // ── Streaming overflow watcher ───────────────────────────────────
  // Uses POSITION-BASED hiding: the first `visibleChildCount` direct children
  // of activeContentRoot are shown; the rest are hidden.
  //
  // This approach is immune to React element-identity churn — when React
  // replaces old <p> nodes with fresh ones, the observer re-applies correct
  // visibility immediately without needing the old element references.
  function attachStreamObs() {
    streamObsMap.get(messageEl)?.disconnect();
    const obs = new MutationObserver(() => {
      applyPositionVisibility(activePlan, state, activeContentRoot);
    });
    obs.observe(activeContentRoot, { childList: true });
    streamObsMap.set(messageEl, obs);
  }
  attachStreamObs();

  // ── In-place re-plan handle ──────────────────────────────────────
  handleMap.set(messageEl, {
    isPlanStale() {
      if (!activeContentRoot.isConnected) return true;
      const firstChunk = activePlan.chunks[0];
      return (
        firstChunk != null &&
        firstChunk.blocks.length > 0 &&
        !firstChunk.blocks[0].el.isConnected
      );
    },

    hideOverflow() {
      // Hide children at or beyond the current visible fold (position-based).
      applyPositionVisibility(activePlan, state, activeContentRoot);
    },

    replan(newPlan: ChunkPlan) {
      // Re-query contentRoot in case React replaced it mid-stream.
      const freshRoot = adapter.getRenderableContentRoot(messageEl);
      const rootReplaced = !!(freshRoot && freshRoot !== activeContentRoot);
      if (rootReplaced) {
        activeContentRoot = freshRoot!;
        activeContentRoot.after(revealBar.el);
        attachStreamObs(); // reattach to the new live element
      }

      // Disconnect the streaming overflow watcher ONLY when streaming has
      // actually finished. If React just replaced the content root while the
      // response is still generating, keep watching the new root so we can
      // continue hiding overflow as new paragraphs stream in.
      const stillStreaming = adapter.isMessageStreaming(messageEl);
      if (!stillStreaming && !rootReplaced) {
        // Stable replan (content hash unchanged for RE_PLAN_STABLE_MS) and
        // streaming is done — safe to disconnect.
        streamObsMap.get(messageEl)?.disconnect();
        streamObsMap.delete(messageEl);
      }

      // Swap active plan.
      activePlan = newPlan;

      // Update the header cards (text only — no remove/reinsert).
      const newBlocks  = Array.from(directElementChildren(activeContentRoot)).map(toSemanticBlock);
      const newSummary = generateHeuristicSummary({ blocks: newBlocks, chunks: newPlan.chunks });
      updateHeaderInPlace(header, newSummary);

      sync();

      messageEl.setAttribute(HASH_ATTR, newPlan.contentHash);
    },
  });

  // Mark as enhanced.
  messageEl.setAttribute(STREAMING_ATTR, "1");
  messageEl.setAttribute(ENHANCED_ATTR, "1");
  messageEl.setAttribute(HASH_ATTR, plan.contentHash);

  function persist() {
    if (!conversationId) return;
    void saveMessageState(adapter.id, conversationId, messageId, state);
  }
  persist();
  return true;
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Position-based visibility pass: shows the first `visibleChildCount(plan,state)`
 * direct children of contentRoot; hides everything else.
 *
 * This is immune to element-identity churn from React/SPA re-renders because
 * it only uses DOM order, not object references.
 */
function applyPositionVisibility(
  plan: ChunkPlan,
  state: MessageState,
  contentRoot: HTMLElement,
) {
  const showCount = visibleChildCount(plan, state);
  let idx = 0;
  for (const child of directElementChildren(contentRoot)) {
    // Never touch our own injected UI elements.
    if (child.getAttribute("data-lar-header") || child.classList.contains("lar-reveal-bar")) {
      continue;
    }
    if (idx < showCount) {
      const wasHidden = child.hasAttribute(HIDDEN_ATTR);
      child.removeAttribute(HIDDEN_ATTR);
      child.style.display = "";
      // Animate newly revealed content with a subtle fade-in
      if (wasHidden && !child.classList.contains("lar-fade-in")) {
        child.classList.add("lar-fade-in");
        child.addEventListener("animationend", () => child.classList.remove("lar-fade-in"), { once: true });
      }
    } else {
      child.setAttribute(HIDDEN_ATTR, "1");
      child.style.display = "none";
    }
    idx++;
  }
}

/**
 * Update the already-injected header element in-place.
 * Only textContent of child nodes is mutated — the header element itself
 * is never removed from the DOM, so there is zero layout shift.
 */
function updateHeaderInPlace(header: HTMLElement, summary: SummaryResult) {
  const rt = header.querySelector<HTMLElement>(".lar-readtime");
  if (rt) rt.textContent = readTimeLabel(summary.readTimeSec);

  const bl = header.querySelector<HTMLElement>(".lar-bottom-line");
  if (bl) bl.textContent = safeText(summary.bottomLine || "(no summary available)", 280);

  // Replace key-points list (small subtree, no scroll-affecting elements).
  header.querySelector(".lar-keypoints")?.remove();
  if (summary.keyPoints.length > 0) {
    const keys = document.createElement("ul");
    keys.className = "lar-keypoints";
    for (const kp of summary.keyPoints) {
      const li = document.createElement("li");
      li.textContent = safeText(kp, 160);
      keys.appendChild(li);
    }
    const existingBadges = header.querySelector(".lar-badges");
    existingBadges
      ? header.insertBefore(keys, existingBadges)
      : header.appendChild(keys);
  }

  // Replace badges row.
  header.querySelector(".lar-badges")?.remove();
  const badges = document.createElement("div");
  badges.className = "lar-badges";
  const addBadge = (label: string, n: number) => {
    if (n <= 0) return;
    const b = document.createElement("span");
    b.className = "lar-badge";
    b.textContent = `${label} \u00B7 ${n}`;
    badges.appendChild(b);
  };
  addBadge("code",  summary.badges.code);
  addBadge("table", summary.badges.table);
  addBadge("list",  summary.badges.list);
  if (badges.childElementCount > 0) header.appendChild(badges);
}

function initialExpandedChunks(settings: GlobalSettings, totalChunks?: number): number {
  if (!settings.autoCollapse) return totalChunks ?? 9999;
  return 1;
}

function applyVisibility(
  plan: ChunkPlan,
  state: MessageState,
  contentRoot: HTMLElement,
  revealBar: ReturnType<typeof buildRevealBar>,
) {
  const hasMore    = !state.isCollapsed && state.expandedChunks < plan.chunks.length;
  const barVisible = !state.isCollapsed;

  // Position-based show/hide — immune to element-identity churn.
  applyPositionVisibility(plan, state, contentRoot);

  revealBar.update({
    hasMore,
    visible: barVisible,
    current: state.expandedChunks,
    total: plan.chunks.length,
  });
}

function teardown(el: HTMLElement, contentRoot: HTMLElement) {
  streamObsMap.get(el)?.disconnect();
  streamObsMap.delete(el);
  handleMap.delete(el);

  contentRoot.parentElement
    ?.querySelector("[data-lar-header='1']")
    ?.remove();

  contentRoot.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}]`).forEach((child) => {
    child.removeAttribute(HIDDEN_ATTR);
    child.style.display = "";
  });

  revealBarMap.get(el)?.remove();
  revealBarMap.delete(el);

  el.removeAttribute(ENHANCED_ATTR);
  el.removeAttribute(STREAMING_ATTR);
  el.removeAttribute(HASH_ATTR);
  callbackMap.delete(el);
  savedStateMap.delete(el);
}
