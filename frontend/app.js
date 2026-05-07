(function () {
  "use strict";

  const globalConfig = window.APP_CONFIG || {};
  const config = {
    apiUrl: globalConfig.API_URL || (typeof API_URL !== "undefined" ? API_URL : ""),
    batchSize: globalConfig.BATCH_SIZE || (typeof BATCH_SIZE !== "undefined" ? BATCH_SIZE : 10),
    flushIntervalMs: globalConfig.AUTO_FLUSH_INTERVAL_MS || (typeof AUTO_FLUSH_INTERVAL_MS !== "undefined" ? AUTO_FLUSH_INTERVAL_MS : 5000),
    mouseIntervalMs: globalConfig.MOUSEMOVE_SAMPLE_INTERVAL_MS || (typeof MOUSEMOVE_SAMPLE_INTERVAL_MS !== "undefined" ? MOUSEMOVE_SAMPLE_INTERVAL_MS : 120),
    collectRawKeys: globalConfig.COLLECT_RAW_KEYS !== undefined ? globalConfig.COLLECT_RAW_KEYS : (typeof COLLECT_RAW_KEYS !== "undefined" ? COLLECT_RAW_KEYS : true),
  };

  const state = {
    sessionId: getOrCreateSessionId(),
    queue: [],
    lastMouseAt: 0,
    flushing: false,
  };

  const page = document.body.dataset.page || window.location.pathname.split("/").pop() || "index.html";

  init();

  function init() {
    bindPageActions();
    bindRawEventCollectors();
    logRawEvent("page_view", {});
    window.setInterval(flushEvents, config.flushIntervalMs);
    window.addEventListener("beforeunload", flushWithBeacon);
  }

  function bindPageActions() {
    const consentCheck = document.getElementById("consentCheck");
    const startBtn = document.getElementById("startBtn");
    const loginForm = document.getElementById("loginForm");
    const searchForm = document.getElementById("searchForm");
    const finishBtn = document.getElementById("finishBtn");

    if (consentCheck && startBtn) {
      startBtn.disabled = !consentCheck.checked;

      consentCheck.addEventListener("change", () => {
        startBtn.disabled = !consentCheck.checked;
        logRawEvent("consent_toggle", {
          element: "consentCheck",
          target_value: String(consentCheck.checked),
        });
      });

      startBtn.addEventListener("click", async () => {
        localStorage.setItem("behaviorStudyConsent", "true");
        logRawEvent("session_start", {
          element: "startBtn",
          target_value: "consented",
        });
        await flushEvents();
        window.location.href = "login.html";
      });
    }

    if (loginForm) {
      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        logRawEvent("login_submit", {
          element: "loginForm",
          target_value: "submitted",
        });
        await flushEvents();
        window.location.href = "dashboard.html";
      });
    }

    if (searchForm) {
      searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const searchBox = document.getElementById("searchBox");
        logRawEvent("search_submit", {
          element: "searchBox",
          target_value: searchBox ? searchBox.value : "",
        });
        const results = document.getElementById("results");
        if (results) results.hidden = false;
        setStatus("Search submitted. Continue interacting or finish the session.");
      });
    }

    if (finishBtn) {
      finishBtn.addEventListener("click", async () => {
        logRawEvent("session_finish", {
          element: "finishBtn",
          target_value: "finished",
        });
        await flushEvents();
        setStatus("Session finished. Thank you.");
      });
    }
  }

  function bindRawEventCollectors() {
    document.addEventListener("mousemove", (event) => {
      const now = Date.now();
      if (now - state.lastMouseAt < config.mouseIntervalMs) return;
      state.lastMouseAt = now;
      logRawEvent("mousemove", {
        x: event.clientX,
        y: event.clientY,
        element: getElementName(event.target),
      });
    });

    document.addEventListener("click", (event) => {
      logRawEvent("click", {
        x: event.clientX,
        y: event.clientY,
        element: getElementName(event.target),
        target_value: getSafeTargetValue(event.target),
      });
    });

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const isPassword = target && target.type === "password";
      logRawEvent("keydown", {
        key: config.collectRawKeys && !isPassword ? event.key : "REDACTED",
        element: getElementName(target),
        target_value: isPassword ? "REDACTED" : getSafeTargetValue(target),
      });
    });

    document.addEventListener("scroll", () => {
      logRawEvent("scroll", {
        x: window.scrollX,
        y: window.scrollY,
        element: "window",
      });
    }, { passive: true });

    document.addEventListener("input", (event) => {
      const target = event.target;
      if (!target || !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const isPassword = target.type === "password";
      logRawEvent("input", {
        element: getElementName(target),
        target_value: isPassword ? "REDACTED" : getSafeTargetValue(target),
      });
    });
  }

  function logRawEvent(eventType, data) {
    const event = {
      session_id: state.sessionId,
      event_type: eventType,
      timestamp: Date.now(),
      x: data.x ?? "",
      y: data.y ?? "",
      key: data.key ?? "",
      element: data.element ?? "",
      target_value: data.target_value ?? "",
      page,
    };

    state.queue.push(event);
    if (state.queue.length >= config.batchSize) flushEvents();
  }

  async function flushEvents() {
    if (state.flushing || state.queue.length === 0) return;

    if (!config.apiUrl || config.apiUrl.includes("PASTE_YOUR")) {
      setStatus("Add your Google Apps Script Web App URL in frontend/config.js.", true);
      return;
    }

    const payload = state.queue.splice(0, state.queue.length);
    state.flushing = true;

    try {
      await fetch(config.apiUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      setStatus(`Saved ${payload.length} raw event(s).`);
    } catch (error) {
      state.queue.unshift(...payload);
      setStatus("Could not save events. They will retry while the page remains open.", true);
    } finally {
      state.flushing = false;
    }
  }

  function flushWithBeacon() {
    if (!navigator.sendBeacon || !config.apiUrl || config.apiUrl.includes("PASTE_YOUR") || state.queue.length === 0) return;
    const payload = JSON.stringify(state.queue.splice(0, state.queue.length));
    navigator.sendBeacon(config.apiUrl, new Blob([payload], { type: "text/plain;charset=utf-8" }));
  }

  function getElementName(target) {
    if (!target) return "";
    if (target.id) return target.id;
    if (target.name) return target.name;
    return String(target.tagName || "").toLowerCase();
  }

  function getSafeTargetValue(target) {
    if (!target || !("value" in target)) return "";
    if (target.type === "password") return "REDACTED";
    return String(target.value || "");
  }

  function getOrCreateSessionId() {
    const existing = localStorage.getItem("behaviorStudySessionId");
    if (existing) return existing;
    const id = `sess-${randomString(12)}`;
    localStorage.setItem("behaviorStudySessionId", id);
    return id;
  }

  function randomString(length) {
    if (window.crypto && window.crypto.getRandomValues) {
      const values = new Uint8Array(length);
      window.crypto.getRandomValues(values);
      return Array.from(values, (value) => (value % 36).toString(36)).join("");
    }
    return Math.random().toString(36).slice(2, 2 + length);
  }

  function setStatus(message, isError = false) {
    const status = document.getElementById("status");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("error", isError);
  }
})();
