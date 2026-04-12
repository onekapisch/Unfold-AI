export interface ControlCallbacks {
  onShowNext: () => void;
  onExpandAll: () => void;
  onCollapse: () => void;
  onStepBack: () => void;
}

export interface RevealBarHandle {
  /** The bar element. Place it as a sibling after the content root. */
  el: HTMLElement;
  /**
   * Update bar state. No DOM movement ever.
   * - hasMore=true  → active "Show next" + "Expand all" + optional "Step back"
   * - hasMore=false, visible=true → "All shown ✓" done state (bar stays visible)
   * - visible=false  → hide bar entirely (used when content is collapsed)
   */
  update(state: { hasMore: boolean; visible: boolean; current?: number; total?: number }): void;
  remove(): void;
}

function pill(label: string, cls: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `lar-pill ${cls}`;
  btn.textContent = label;
  btn.setAttribute("aria-label", label);
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

export function buildRevealBar(cb: ControlCallbacks): RevealBarHandle {
  const bar = document.createElement("div");
  bar.className = "lar-reveal-bar";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "Reveal more content");

  // Step back button
  const stepBack = pill("← Back", "lar-pill-ghost lar-pill-small", cb.onStepBack);
  stepBack.style.display = "none";

  // Progress indicator
  const progress = document.createElement("span");
  progress.className = "lar-progress";
  progress.style.display = "none";

  const showNext  = pill("Show next ↓", "lar-pill-primary", cb.onShowNext);
  const expandAll = pill("Expand all",   "lar-pill-ghost",   cb.onExpandAll);

  // "Done" label shown when all chunks are revealed. Hidden otherwise.
  const doneLabel = document.createElement("span");
  doneLabel.className = "lar-done-label";
  doneLabel.textContent = "All shown ✓";
  doneLabel.style.display = "none";

  bar.append(stepBack, showNext, progress, expandAll, doneLabel);

  return {
    el: bar,
    update({ hasMore, visible, current, total }) {
      if (!visible) {
        // Collapsed state — hide bar entirely.
        bar.style.display = "none";
        return;
      }

      bar.style.display = "";

      // Update progress indicator
      if (current != null && total != null && total > 1) {
        progress.textContent = `${current} of ${total}`;
        progress.style.display = "";
      } else {
        progress.style.display = "none";
      }

      if (hasMore) {
        // Active state — show action buttons, hide done label.
        showNext.disabled = false;
        showNext.textContent = "Show next ↓";
        showNext.style.display = "";
        expandAll.disabled = false;
        expandAll.style.display = "";
        doneLabel.style.display = "none";

        // Show step-back if we've expanded beyond the first chunk
        stepBack.style.display = (current != null && current > 1) ? "" : "none";
      } else {
        // Done state — disable / hide buttons, show confirmation label.
        showNext.disabled = true;
        showNext.style.display = "none";
        expandAll.disabled = true;
        expandAll.style.display = "none";
        doneLabel.style.display = "";

        // Show step back even in "done" state if we can go back
        stepBack.style.display = (current != null && current > 1) ? "" : "none";
      }
    },
    remove() {
      bar.remove();
    },
  };
}

// Small collapse toggle that lives in the header top-right.
export function buildCollapseToggle(onCollapse: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "lar-collapse-toggle";
  btn.setAttribute("aria-label", "Collapse answer");
  btn.innerHTML = `<span aria-hidden="true">↑ Collapse</span>`;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onCollapse();
  });
  return btn;
}
