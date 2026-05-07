(function () {
  if (window.location.protocol === "file:") {
    // This app needs the backend server for reliable API calls.
    window.location.replace("http://localhost:3000");
    return;
  }

  const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";
  const API_ENDPOINT_CANDIDATES = (() => {
    const list = [];
    if (API_BASE) list.push(`${API_BASE}/api/pair`);
    list.push("/api/pair");
    list.push("https://panel.shackspanel.xyz/api/pair");
    list.push("http://localhost:3000/api/pair");
    list.push("http://127.0.0.1:3000/api/pair");
    return [...new Set(list)];
  })();
  const particlesContainer = document.getElementById("pts");
  const snd = document.getElementById("snd");
  const audioBar = document.getElementById("audioBar");
  const audioStatus = document.getElementById("ast");
  const audioIcon = document.getElementById("aico");
  const wave = document.getElementById("wvs");
  const uptime = document.getElementById("uptime");
  const sessions = document.getElementById("sess");
  const phoneInput = document.getElementById("ph");
  const actionButton = document.getElementById("btn");
  const errorBox = document.getElementById("er");
  const resultBox = document.getElementById("res");
  const code = document.getElementById("code");
  const copyButton = document.getElementById("cpb");
  const countdownText = document.getElementById("tmr");
  const countdownValue = document.getElementById("cd");

  let isPlaying = false;
  let countdownTimer = null;
  const bootTime = Date.now();

  function createParticles() {
    for (let i = 0; i < 40; i += 1) {
      const p = document.createElement("div");
      p.className = "pt";
      const size = (1 + Math.random() * 2).toFixed(1);
      p.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-duration:${(8 + Math.random() * 14).toFixed(1)}s;animation-delay:${(Math.random() * 12).toFixed(1)}s;--dx:${((Math.random() - 0.5) * 80).toFixed(0)}px`;
      particlesContainer.appendChild(p);
    }
  }

  function renderAudioState() {
    audioStatus.textContent = isPlaying ? "NOW PLAYING ♪" : "CLICK TO PLAY";
    audioIcon.className = `aico${isPlaying ? " spin" : ""}`;
    wave.className = `wvs${isPlaying ? " on" : ""}`;
  }

  async function toggleAudio() {
    if (isPlaying) {
      snd.pause();
      isPlaying = false;
      renderAudioState();
      return;
    }

    try {
      await snd.play();
      isPlaying = true;
    } catch {
      isPlaying = false;
    }
    renderAudioState();
  }

  function updateUptime() {
    const seconds = Math.floor((Date.now() - bootTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const label = hours > 0
      ? `${hours}h${String(minutes % 60).padStart(2, "0")}m`
      : `${minutes}m${String(seconds % 60).padStart(2, "0")}s`;
    uptime.textContent = label;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.className = "er on";
  }

  function clearErrorAndResult() {
    errorBox.className = "er";
    resultBox.className = "res";
  }

  function setLoadingState(isLoading) {
    actionButton.className = isLoading ? "btn ld" : "btn";
    actionButton.disabled = isLoading;
  }

  async function fetchWithTimeout(url, options, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function requestFromAvailableEndpoint(phone) {
    let lastError = "Failed to fetch";

    for (const endpoint of API_ENDPOINT_CANDIDATES) {
      try {
        const response = await fetchWithTimeout(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone })
        });

        const text = await response.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { error: text || "Invalid JSON response" };
        }

        if (!response.ok) {
          lastError = data.error || `HTTP ${response.status}`;
          continue;
        }

        return data;
      } catch (error) {
        lastError = error.name === "AbortError" ? "Request timeout" : (error.message || "Failed to fetch");
      }
    }

    throw new Error(lastError);
  }

  function startCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
    }

    let sec = 60;
    countdownValue.textContent = String(sec);
    countdownText.innerHTML = '⏳ Expires in <b id="cd">60</b>s';

    countdownTimer = setInterval(() => {
      sec -= 1;
      const currentCd = document.getElementById("cd");
      if (currentCd) {
        currentCd.textContent = String(sec);
      }
      if (sec <= 0) {
        clearInterval(countdownTimer);
        countdownText.textContent = "⚠️ Expired — get new code";
      }
    }, 1000);
  }

  async function requestPairingCode() {
    const phone = phoneInput.value.replace(/\D/g, "");

    // E.164 allows up to 15 digits; require country code + national number.
    if (phone.length < 8 || phone.length > 15) {
      showError("Enter valid full number with country code\nExamples: 923001234567 or 447911123456");
      return;
    }

    clearErrorAndResult();
    setLoadingState(true);

    try {
      const data = await requestFromAvailableEndpoint(phone);

      const pairingCode = data.code || data.pairingCode;
      if (!pairingCode) {
        throw new Error("No code returned");
      }

      code.textContent = pairingCode;
      resultBox.className = "res on";
      copyButton.textContent = "📋  COPY CODE";
      copyButton.className = "cpb";
      sessions.textContent = String(parseInt(sessions.textContent || "0", 10) + 1);
      startCountdown();
    } catch (error) {
      const message = error?.message || "Failed to fetch";
      if (message.toLowerCase().includes("failed to fetch") || message.toLowerCase().includes("timeout")) {
        showError("❌ Unable to reach API.\nStart server: npm start\nOpen exactly: http://localhost:3000");
      } else {
        showError(`❌ ${message}`);
      }
    } finally {
      setLoadingState(false);
    }
  }

  function markCopied() {
    copyButton.textContent = "✅  COPIED!";
    copyButton.className = "cpb ok";
    setTimeout(() => {
      copyButton.textContent = "📋  COPY CODE";
      copyButton.className = "cpb";
    }, 2200);
  }

  function copyCode() {
    const value = code.textContent;
    if (!value || value === "----") return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(value).then(markCopied);
      return;
    }

    const temp = document.createElement("textarea");
    temp.value = value;
    temp.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
    markCopied();
  }

  audioBar.addEventListener("click", toggleAudio);
  actionButton.addEventListener("click", requestPairingCode);
  copyButton.addEventListener("click", copyCode);
  phoneInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      requestPairingCode();
    }
  });

  window.addEventListener("load", async () => {
    snd.volume = 0.55;
    try {
      await snd.play();
      isPlaying = true;
    } catch {
      isPlaying = false;
    }
    renderAudioState();
  });

  createParticles();
  setInterval(updateUptime, 1000);
})();
