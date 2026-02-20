/* rr-ui.js */

(function () {
  const CSS_HREF = "./rr-ui.css";
  const DARK_CLASS = "rr-dark";
  const THEME_ATTR = "data-rr-theme";
  const DEFAULT_THEME = "ableton-dark";
  const IS_TOP = (() => {
    try { return window.top === window; } catch { return false; }
  })();

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function dispatch(el, type) {
    el.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function ensureCss(doc) {
    const already = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
      .some(l => (l.getAttribute("href") || "").includes("rr-ui.css"));
    if (already) return;

    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_HREF;
    doc.head.appendChild(link);
  }

  function readTopThemeId() {
    try {
      return window.top.document.documentElement.getAttribute(THEME_ATTR) || DEFAULT_THEME;
    } catch {
      return document.documentElement.getAttribute(THEME_ATTR) || DEFAULT_THEME;
    }
  }

  function syncThemeClass(doc) {
    const theme = readTopThemeId();
    const dark = theme !== "flat-light";
    const root = doc.documentElement;
    if (!root) return;

    if (root.getAttribute(THEME_ATTR) !== theme) {
      root.setAttribute(THEME_ATTR, theme);
    }
    if (root.classList.contains(DARK_CLASS) !== dark) {
      root.classList.toggle(DARK_CLASS, dark);
    }
  }

  function makeButton(doc, label, isOn, groupName, value, range) {
    const wrap = doc.createElement("label");
    wrap.className = "rr-radio-option";

    const input = doc.createElement("input");
    input.type = "radio";
    input.name = groupName;
    input.value = String(value);
    input.checked = !!isOn;

    const span = doc.createElement("span");
    span.textContent = label;

    wrap.addEventListener("change", () => {
      if (!input.checked) return;
      range.value = String(value);
      dispatch(range, "input");
      dispatch(range, "change");
    });

    wrap.appendChild(input);
    wrap.appendChild(span);
    return wrap;
  }

  function stackCheckboxLabels(doc) {
    const labels = Array.from(doc.querySelectorAll("label"));

    function shouldStack(text) {
      const t = String(text || "").trim();
      if (!t) return false;
      if (/^CC\s*\d+$/i.test(t)) return true;
      if (t.length <= 4) return true; // S, M, etc.
      return false;
    }

    labels.forEach((label) => {
      if (label.classList.contains("rr-chkcol")) return;

      const cb = label.querySelector(':scope > input[type="checkbox"]');
      if (!cb) return;

      const textNodes = Array.from(label.childNodes).filter(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent && n.textContent.trim()
      );
      if (!textNodes.length) return;

      const t = textNodes.map((n) => n.textContent).join(" ").trim();
      if (!shouldStack(t)) return;

      textNodes.forEach((n) => n.parentNode && n.parentNode.removeChild(n));

      const span = doc.createElement("span");
      span.textContent = t;
      label.classList.add("rr-chkcol");
      label.appendChild(span);
    });
  }

  function formatLabel(v, range) {
    const min = Number(range.min || 0);
    const max = Number(range.max || 100);
    if (min === 0 && max === 100) return `${Math.round(v)}%`;
    if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
    return String(v);
  }

  function normalizeButtons(doc) {
    const buttons = Array.from(doc.querySelectorAll("button"));
    buttons.forEach((btn) => {
      if (btn.dataset.rrBtn === "1") return;
      btn.dataset.rrBtn = "1";

      const raw = (btn.textContent || "").trim();
      const t = raw.toLowerCase();

      if (t === "randomize pattern" || t === "randomize all" || t === "randomize") {
        btn.textContent = "⟳";
        btn.classList.add("rr-icon-btn");
        btn.classList.add("rand-btn");
        if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", raw || "Randomize");
        btn.title = raw || "Randomize";
        return;
      }

      if (t === "simplify") {
        btn.textContent = "Simp";
        return;
      }
    });
  }

  function hideUnneededTextBlocks(doc) {
    const status = Array.from(doc.querySelectorAll(".status"));
    status.forEach((el) => {
      if (el.dataset.rrHide === "1") return;
      el.dataset.rrHide = "1";
      el.classList.add("rr-hidden");
    });
  }

  function replaceRangeWithRadios(doc, range) {
    if (range.dataset.rrProcessed === "1") return;
    range.dataset.rrProcessed = "1";

    const min = Number(range.min || 0);
    const max = Number(range.max || 100);
    const step = Number(range.step || 1);
    let current = Number(range.value);

    const container = doc.createElement("div");
    container.className = "rr-radio";
    container.setAttribute("role", "slider");
    container.setAttribute("aria-valuemin", min);
    container.setAttribute("aria-valuemax", max);
    container.setAttribute("aria-valuenow", current);

    const knob = doc.createElement("div");
    knob.className = "rr-knob-circle";

    const indicator = doc.createElement("div");
    indicator.className = "rr-knob-indicator";
    knob.appendChild(indicator);

    const valueDisplay = doc.createElement("div");
    valueDisplay.className = "rr-knob-value";
    valueDisplay.textContent = formatLabel(current, range);

    container.appendChild(knob);
    container.appendChild(valueDisplay);

    range.style.display = "none";
    range.insertAdjacentElement("afterend", container);

    const MIN_ANGLE = -135;
    const MAX_ANGLE = 135;

    function valueToAngle(val) {
      const normalized = (val - min) / (max - min);
      return MIN_ANGLE + normalized * (MAX_ANGLE - MIN_ANGLE);
    }

    function updateKnob(val) {
      const angle = valueToAngle(val);
      indicator.style.transform = `translateX(-50%) rotate(${angle}deg)`;
      valueDisplay.textContent = formatLabel(val, range);
      container.setAttribute("aria-valuenow", val);
    }

    updateKnob(current);

    const syncFromRange = () => {
      const v = Number(range.value);
      if (!Number.isFinite(v)) return;
      current = v;
      updateKnob(current);
    };
    range.addEventListener("input", syncFromRange);
    range.addEventListener("change", syncFromRange);

    let isDragging = false;
    let startY = 0;
    let startValue = current;

    function onStart(e) {
      isDragging = true;
      const pt = e.touches ? e.touches[0] : e;
      startY = pt.clientY;
      startValue = current;
      e.preventDefault();
    }

    function onMove(e) {
      if (!isDragging) return;
      
      const pt = e.touches ? e.touches[0] : e;
      const deltaY = startY - pt.clientY;
      
      const sensitivity = 0.5;
      let newValue = startValue + deltaY * sensitivity;
      
      newValue = Math.round(newValue / step) * step;
      newValue = clamp(newValue, min, max);
      
      if (newValue !== current) {
        current = newValue;
        updateKnob(current);
        range.value = String(current);
        dispatch(range, "input");
      }
      
      e.preventDefault();
    }

    function onEnd(e) {
      if (!isDragging) return;
      isDragging = false;
      knob.style.cursor = "pointer";
      dispatch(range, "change");
      e.preventDefault();
    }

    knob.addEventListener("mousedown", onStart);
    doc.addEventListener("mousemove", onMove);
    doc.addEventListener("mouseup", onEnd);

    knob.addEventListener("touchstart", onStart, { passive: false });
    doc.addEventListener("touchmove", onMove, { passive: false });
    doc.addEventListener("touchend", onEnd, { passive: false });
    doc.addEventListener("touchcancel", onEnd, { passive: false });
  }

  function improveEmptySelects(doc) {
    const selects = Array.from(doc.querySelectorAll("select"));
    selects.forEach((sel) => {
      if (sel.dataset.rrSelect === "1") return;
      sel.dataset.rrSelect = "1";
      sel.classList.add("rr-select");
      if (sel.id === "themeSwitcher") return;

      const hasEmptyOption = Array.from(sel.options).some(o => (o.value ?? "") === "");
      if (!hasEmptyOption) {
        const opt = doc.createElement("option");
        opt.value = "";
        opt.textContent = "— Select —";
        opt.disabled = true;
        opt.selected = true;
        sel.insertBefore(opt, sel.firstChild);
      }

      if (sel.value === "" || sel.selectedIndex === -1) {
        const first = sel.options[0];
        if (first && first.value === "") first.selected = true;
      }
    });
  }

  function runInDocument(doc) {
    ensureCss(doc);
    syncThemeClass(doc);

    const ranges = Array.from(doc.querySelectorAll('input[type="range"]'));
    ranges.forEach(r => replaceRangeWithRadios(doc, r));

    stackCheckboxLabels(doc);

    improveEmptySelects(doc);

    normalizeButtons(doc);
    hideUnneededTextBlocks(doc);

    const stop = doc.querySelector('#stopBtn');
    if (stop) stop.style.display = 'none';
  }

  function hookDocument(doc) {
    runInDocument(doc);

    const mo = new MutationObserver(() => runInDocument(doc));
    mo.observe(doc.documentElement, { childList: true, subtree: true });
  }

  function hookIframes() {
    const iframes = Array.from(document.querySelectorAll("iframe"));
    iframes.forEach((iframe) => {
      iframe.addEventListener("load", () => {
        try {
          const doc = iframe.contentDocument;
          if (!doc) return;
          syncThemeClass(doc);
          hookDocument(doc);
        } catch (e) {}
      });
    });
  }

  function watchThemeChanges() {
    if (!IS_TOP) return;
    const root = document.documentElement;
    if (!root) return;
    const mo = new MutationObserver(() => {
      const iframes = Array.from(document.querySelectorAll("iframe"));
      iframes.forEach((iframe) => {
        try {
          const doc = iframe.contentDocument;
          if (!doc) return;
          syncThemeClass(doc);
        } catch (e) {}
      });
    });
    mo.observe(root, { attributes: true, attributeFilter: ["class", THEME_ATTR] });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      hookDocument(document);
      hookIframes();
      watchThemeChanges();
    });
  } else {
    hookDocument(document);
    hookIframes();
    watchThemeChanges();
  }
})();
