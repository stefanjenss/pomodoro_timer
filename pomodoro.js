(function () {
    // --- Constants ---

    var SETTINGS_KEY = "pomodoro.v1.settings";
    var STATS_KEY = "pomodoro.v1.stats";
    var THEME_KEY = "pomodoro.v1.theme";
    var CUSTOM_KEY = "pomodoro.v1.custom";
    var SOUND_KEY = "pomodoro.v1.sound";
    var LONGBREAK_KEY = "pomodoro.v1.longbreak";
    var HISTORY_KEY = "pomodoro.v1.history";

    var PRESETS = {
        "25_5": {work: 25 * 60, break: 5 * 60, label: "25 / 5"},
        "50_10": {work: 50 * 60, break: 10 * 60, label: "50 / 10"},
        "custom": {work: 25 * 60, break: 5 * 60, label: "Custom"}
    };

    // --- UI references ---

    var ui = {
        timerShell: document.getElementById("timerShell"),
        phaseLabel: document.getElementById("phaseLabel"),
        timeDisplay: document.getElementById("timeDisplay"),
        phaseNote: document.getElementById("phaseNote"),
        progressFill: document.getElementById("progressFill"),
        liveAnnounce: document.getElementById("liveAnnounce"),
        startPauseBtn: document.getElementById("startPauseBtn"),
        resetBtn: document.getElementById("resetBtn"),
        switchPhaseBtn: document.getElementById("switchPhaseBtn"),
        enableNotifyBtn: document.getElementById("enableNotifyBtn"),
        workCount: document.getElementById("workCount"),
        breakCount: document.getElementById("breakCount"),
        notifyStatus: document.getElementById("notifyStatus"),
        presetButtons: Array.from(document.querySelectorAll(".preset-btn")),
        favicon: document.getElementById("favicon"),
        darkModeBtn: document.getElementById("darkModeBtn"),
        customPresetUI: document.getElementById("customPresetUI"),
        customWorkMin: document.getElementById("customWorkMin"),
        customBreakMin: document.getElementById("customBreakMin"),
        applyCustomBtn: document.getElementById("applyCustomBtn"),
        soundSelect: document.getElementById("soundSelect"),
        volumeSlider: document.getElementById("volumeSlider"),
        volumeDisplay: document.getElementById("volumeDisplay"),
        previewSoundBtn: document.getElementById("previewSoundBtn"),
        longBreakInterval: document.getElementById("longBreakInterval"),
        longBreakDuration: document.getElementById("longBreakDuration"),
        todaySummary: document.getElementById("todaySummary"),
        weeklySummary: document.getElementById("weeklySummary"),
        exportBtn: document.getElementById("exportBtn"),
        importBtn: document.getElementById("importBtn"),
        importFile: document.getElementById("importFile")
    };

    // --- State ---

    var state = {
        preset: "25_5",
        phase: "work",
        isRunning: false,
        remainingSeconds: PRESETS["25_5"].work,
        workDurationSeconds: PRESETS["25_5"].work,
        breakDurationSeconds: PRESETS["25_5"].break,
        workCompleted: 0,
        breakCompleted: 0,
        lastTickEpochMs: null,
        timerId: null,
        audioContext: null,
        unlockedAudio: false,
        notificationAttempted: false,
        // Dark mode
        darkMode: "system",
        // Sound
        soundType: "beep",
        volume: 50,
        // Long break
        consecutiveWorkSessions: 0,
        longBreakInterval: 4,
        longBreakDurationSeconds: 15 * 60,
        isLongBreak: false,
        // Session history
        sessionHistory: [],
        currentSessionStart: null
    };

    // --- Utilities ---

    function parseJson(value, fallback) {
        if (!value) return fallback;
        try {
            return JSON.parse(value);
        } catch (_) {
            return fallback;
        }
    }

    function safeGetItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function safeSetItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            return false;
        }
    }

    function formatTime(seconds) {
        var safe = Math.max(0, seconds);
        var mins = String(Math.floor(safe / 60)).padStart(2, "0");
        var secs = String(safe % 60).padStart(2, "0");
        return mins + ":" + secs;
    }

    function todayDateStr() {
        return new Date().toISOString().split("T")[0];
    }

    // --- Dark mode ---

    function getSystemPrefersDark() {
        return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    function applyTheme(mode) {
        state.darkMode = mode;
        var isDark = mode === "dark" || (mode === "system" && getSystemPrefersDark());
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.classList.toggle("light", !isDark);
    }

    function toggleDarkMode() {
        var modes = ["system", "light", "dark"];
        var idx = modes.indexOf(state.darkMode);
        var next = modes[(idx + 1) % modes.length];
        applyTheme(next);
        safeSetItem(THEME_KEY, next);
        render();
    }

    // --- Custom preset ---

    function loadCustomPreset() {
        var saved = parseJson(safeGetItem(CUSTOM_KEY), null);
        if (saved) {
            var workMin = Math.max(1, Math.min(120, Number(saved.workMin) || 25));
            var breakMin = Math.max(1, Math.min(60, Number(saved.breakMin) || 5));
            PRESETS.custom.work = workMin * 60;
            PRESETS.custom.break = breakMin * 60;
            PRESETS.custom.label = workMin + " / " + breakMin;
            if (ui.customWorkMin) ui.customWorkMin.value = workMin;
            if (ui.customBreakMin) ui.customBreakMin.value = breakMin;
        }
    }

    function applyCustomPreset() {
        var workMin = Math.max(1, Math.min(120, parseInt(ui.customWorkMin.value, 10) || 25));
        var breakMin = Math.max(1, Math.min(60, parseInt(ui.customBreakMin.value, 10) || 5));
        ui.customWorkMin.value = workMin;
        ui.customBreakMin.value = breakMin;
        PRESETS.custom.work = workMin * 60;
        PRESETS.custom.break = breakMin * 60;
        PRESETS.custom.label = workMin + " / " + breakMin;
        safeSetItem(CUSTOM_KEY, JSON.stringify({workMin: workMin, breakMin: breakMin}));
        applyPreset("custom", {resetPhase: true, persist: true});
    }

    // --- Sound ---

    function loadSoundSettings() {
        var saved = parseJson(safeGetItem(SOUND_KEY), null);
        if (saved) {
            if (saved.soundType) state.soundType = saved.soundType;
            if (Number.isFinite(saved.volume)) state.volume = Math.max(0, Math.min(100, saved.volume));
        }
        if (ui.soundSelect) ui.soundSelect.value = state.soundType;
        if (ui.volumeSlider) ui.volumeSlider.value = state.volume;
        if (ui.volumeDisplay) ui.volumeDisplay.textContent = state.volume + "%";
    }

    function saveSoundSettings() {
        safeSetItem(SOUND_KEY, JSON.stringify({soundType: state.soundType, volume: state.volume}));
    }

    function playSingleBeep(ctx, freq, peakGain) {
        var gain = ctx.createGain();
        var osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peakGain), ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.26);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
    }

    function playGentleChime(ctx, peakGain) {
        var freqs = [523.25, 659.25, 783.99];
        freqs.forEach(function (freq, i) {
            setTimeout(function () {
                if (ctx.state !== "running") return;
                var gain = ctx.createGain();
                var osc = ctx.createOscillator();
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                gain.gain.setValueAtTime(0.0001, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peakGain * 0.7), ctx.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.55);
            }, i * 180);
        });
    }

    function playSound(type, volume) {
        if (type === "none") return;
        if (!state.audioContext || state.audioContext.state !== "running") return;
        var ctx = state.audioContext;
        var vol = (volume / 100) * 0.15;

        if (type === "beep") {
            playSingleBeep(ctx, 880, vol);
        } else if (type === "gentle") {
            playGentleChime(ctx, vol);
        } else if (type === "double") {
            playSingleBeep(ctx, 880, vol);
            setTimeout(function () { if (ctx.state === "running") playSingleBeep(ctx, 880, vol); }, 300);
        } else if (type === "descending") {
            playSingleBeep(ctx, 880, vol);
            setTimeout(function () { if (ctx.state === "running") playSingleBeep(ctx, 660, vol); }, 200);
            setTimeout(function () { if (ctx.state === "running") playSingleBeep(ctx, 440, vol); }, 400);
        }
    }

    // --- Long break ---

    function loadLongBreakSettings() {
        var saved = parseJson(safeGetItem(LONGBREAK_KEY), null);
        if (saved) {
            if (Number.isFinite(saved.interval)) state.longBreakInterval = Math.max(2, Math.min(10, saved.interval));
            if (Number.isFinite(saved.duration)) state.longBreakDurationSeconds = Math.max(5, Math.min(60, saved.duration)) * 60;
        }
        if (ui.longBreakInterval) ui.longBreakInterval.value = state.longBreakInterval;
        if (ui.longBreakDuration) ui.longBreakDuration.value = Math.round(state.longBreakDurationSeconds / 60);
    }

    function saveLongBreakSettings() {
        safeSetItem(LONGBREAK_KEY, JSON.stringify({
            interval: state.longBreakInterval,
            duration: Math.round(state.longBreakDurationSeconds / 60)
        }));
    }

    // --- Session history ---

    function loadHistory() {
        var saved = parseJson(safeGetItem(HISTORY_KEY), []);
        state.sessionHistory = Array.isArray(saved) ? saved : [];
    }

    function saveHistory() {
        var toSave = state.sessionHistory.slice(-500);
        safeSetItem(HISTORY_KEY, JSON.stringify(toSave));
    }

    function getSessionsForDate(dateStr) {
        return state.sessionHistory.filter(function (s) {
            return s.startTime && s.startTime.substring(0, 10) === dateStr;
        });
    }

    function getDailySummary(dateStr) {
        var sessions = getSessionsForDate(dateStr);
        var workSessions = sessions.filter(function (s) { return s.phase === "work" && s.completed; });
        var totalFocusMinutes = workSessions.reduce(function (sum, s) { return sum + (s.durationSeconds / 60); }, 0);
        return {
            date: dateStr,
            workCount: workSessions.length,
            breakCount: sessions.filter(function (s) { return s.phase === "break" && s.completed; }).length,
            totalFocusMinutes: Math.round(totalFocusMinutes)
        };
    }

    function getWeeklySummary() {
        var now = new Date();
        var days = [];
        for (var i = 6; i >= 0; i--) {
            var d = new Date(now);
            d.setDate(d.getDate() - i);
            days.push(getDailySummary(d.toISOString().split("T")[0]));
        }
        return days;
    }

    function renderHistory() {
        if (!ui.todaySummary) return;

        var today = getDailySummary(todayDateStr());
        ui.todaySummary.innerHTML =
            "<span><strong>" + today.workCount + "</strong> work</span>" +
            "<span><strong>" + today.breakCount + "</strong> break</span>" +
            "<span><strong>" + today.totalFocusMinutes + "</strong> focus min</span>";

        if (!ui.weeklySummary) return;
        var weekly = getWeeklySummary();
        var rows = "";
        var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        weekly.forEach(function (day) {
            var d = new Date(day.date + "T12:00:00");
            var label = dayNames[d.getDay()] + " " + day.date.substring(5);
            rows += '<div class="day-row"><span>' + label + "</span><span>" +
                day.workCount + " work, " + day.totalFocusMinutes + " min</span></div>";
        });
        ui.weeklySummary.innerHTML = rows;
    }

    // --- Persistence ---

    function loadState() {
        // Load custom preset values first
        loadCustomPreset();

        var savedSettings = parseJson(safeGetItem(SETTINGS_KEY), null);
        if (savedSettings && PRESETS[savedSettings.preset]) {
            state.preset = savedSettings.preset;
        }

        var savedStats = parseJson(safeGetItem(STATS_KEY), null);
        if (savedStats) {
            state.workCompleted = Number.isFinite(savedStats.workCompleted) ? Math.max(0, savedStats.workCompleted) : 0;
            state.breakCompleted = Number.isFinite(savedStats.breakCompleted) ? Math.max(0, savedStats.breakCompleted) : 0;
            if (Number.isFinite(savedStats.consecutiveWorkSessions)) {
                state.consecutiveWorkSessions = Math.max(0, savedStats.consecutiveWorkSessions);
            }
        }

        // Load theme
        var savedTheme = safeGetItem(THEME_KEY);
        if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
            applyTheme(savedTheme);
        } else {
            applyTheme("system");
        }

        // Load sound, long break, history
        loadSoundSettings();
        loadLongBreakSettings();
        loadHistory();

        applyPreset(state.preset, {resetPhase: true, persist: false});
    }

    function saveSettings() {
        safeSetItem(SETTINGS_KEY, JSON.stringify({preset: state.preset}));
    }

    function saveStats() {
        safeSetItem(STATS_KEY, JSON.stringify({
            workCompleted: state.workCompleted,
            breakCompleted: state.breakCompleted,
            consecutiveWorkSessions: state.consecutiveWorkSessions
        }));
    }

    // --- Phase helpers ---

    function getPhaseDuration(phase) {
        if (phase === "break" && state.isLongBreak) return state.longBreakDurationSeconds;
        return phase === "work" ? state.workDurationSeconds : state.breakDurationSeconds;
    }

    // --- Favicon ---

    function updateFavicon(phase) {
        if (!ui.favicon) return;
        var color = phase === "work" ? "%23c44536" : "%232f855a";
        ui.favicon.href = "data:image/svg+xml," +
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
            "<circle cx='50' cy='55' r='42' fill='" + color + "'/>" +
            "<rect x='38' y='8' width='24' height='14' rx='4' fill='" + color + "'/>" +
            "<rect x='46' y='2' width='8' height='12' rx='3' fill='%23388e3c'/>" +
            "</svg>";
    }

    // --- Notification status ---

    function updateNotificationStatus(options) {
        if (!options) options = {};
        var permissionOverride = options.permissionOverride || null;
        var attemptedRequest = options.attemptedRequest !== undefined ? options.attemptedRequest : state.notificationAttempted;

        if (!("Notification" in window)) {
            ui.notifyStatus.textContent = "Unsupported in this browser";
            ui.enableNotifyBtn.disabled = true;
            return;
        }

        var permission = permissionOverride || Notification.permission;
        if (permission === "granted") {
            ui.notifyStatus.textContent = "Enabled";
            ui.enableNotifyBtn.disabled = true;
        } else if (permission === "denied") {
            ui.notifyStatus.textContent = "Blocked (browser setting)";
            ui.enableNotifyBtn.disabled = true;
        } else {
            if (attemptedRequest && window.location.protocol === "file:") {
                ui.notifyStatus.textContent = "Unavailable for local file context";
            } else if (attemptedRequest) {
                ui.notifyStatus.textContent = "Permission not granted";
            } else {
                ui.notifyStatus.textContent = "Not requested";
            }
            ui.enableNotifyBtn.disabled = false;
        }
    }

    // --- Rendering ---

    function render() {
        var phaseLabel = state.phase === "work" ? "Work" : (state.isLongBreak ? "Long Break" : "Break");
        ui.phaseLabel.textContent = phaseLabel;
        ui.timeDisplay.textContent = formatTime(state.remainingSeconds);
        ui.workCount.textContent = String(state.workCompleted);
        ui.breakCount.textContent = String(state.breakCompleted);
        ui.startPauseBtn.textContent = state.isRunning ? "Pause" : "Start";
        document.title = "Pomodoro Timer (" + formatTime(state.remainingSeconds) + ")";

        var presetText = PRESETS[state.preset].label;
        if (state.remainingSeconds === 0) {
            ui.phaseNote.textContent = phaseLabel + " phase complete. Switch phase when ready.";
        } else if (state.isRunning) {
            ui.phaseNote.textContent = (state.phase === "work" ? "Focus" : "Recover") + " in progress (" + presetText + ").";
        } else {
            ui.phaseNote.textContent = phaseLabel + " ready (" + presetText + ").";
        }

        ui.timerShell.classList.remove("phase-work", "phase-break");
        ui.timerShell.classList.add(state.phase === "work" ? "phase-work" : "phase-break");

        var phaseDuration = getPhaseDuration(state.phase);
        var elapsed = Math.max(0, phaseDuration - state.remainingSeconds);
        var percent = phaseDuration > 0 ? Math.min(100, Math.max(0, (elapsed / phaseDuration) * 100)) : 0;
        ui.progressFill.style.width = percent + "%";
        ui.progressFill.classList.toggle("break", state.phase === "break");

        ui.presetButtons.forEach(function (btn) {
            var isActive = btn.dataset.preset === state.preset;
            btn.setAttribute("aria-pressed", String(isActive));
        });

        // Custom preset UI visibility
        if (ui.customPresetUI) {
            ui.customPresetUI.style.display = state.preset === "custom" ? "flex" : "none";
        }

        // Dark mode button
        if (ui.darkModeBtn) {
            var icons = {system: "\u25D1", light: "\u2600", dark: "\u263D"};
            ui.darkModeBtn.textContent = icons[state.darkMode] || "\u25D1";
            ui.darkModeBtn.title = "Theme: " + state.darkMode;
        }

        updateFavicon(state.phase);
        updateNotificationStatus();
        renderHistory();
    }

    // --- Timer control ---

    function stopTimer() {
        state.isRunning = false;
        state.lastTickEpochMs = null;
        if (state.timerId !== null) {
            clearInterval(state.timerId);
            state.timerId = null;
        }
    }

    function announce(message) {
        ui.liveAnnounce.textContent = message;
    }

    function ensureAudioContext() {
        if (!state.audioContext) {
            var AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                state.audioContext = new AudioCtx();
            }
        }

        if (state.audioContext && state.audioContext.state === "suspended") {
            state.audioContext.resume().catch(function () { });
        }

        state.unlockedAudio = !!state.audioContext;
    }

    // --- Notifications ---

    function notify(phaseEnded) {
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted") return;

        var nextPhase = phaseEnded === "work" ? "break" : "work";
        var title = (phaseEnded === "work" ? "Work" : "Break") + " complete";
        var body = "Time for " + (nextPhase === "work" ? "focus" : "a break") + ".";

        try {
            new Notification(title, {body: body, tag: "pomodoro-phase-change"});
        } catch (_) {
            // Notification failures should never break timer behavior.
        }
    }

    function flashCompleteState() {
        ui.timerShell.classList.add("phase-complete");
        window.setTimeout(function () {
            ui.timerShell.classList.remove("phase-complete");
        }, 1800);
    }

    // --- Phase transitions ---

    function completePhase() {
        var endedPhase = state.phase;
        var wasLongBreak = state.isLongBreak;
        stopTimer();

        // Update counters
        if (endedPhase === "work") {
            state.workCompleted += 1;
            state.consecutiveWorkSessions += 1;
        } else {
            state.breakCompleted += 1;
        }

        // Record session history
        var sessionRecord = {
            phase: endedPhase,
            isLongBreak: endedPhase === "break" && wasLongBreak,
            durationSeconds: getPhaseDuration(endedPhase),
            startTime: state.currentSessionStart || new Date().toISOString(),
            endTime: new Date().toISOString(),
            preset: state.preset,
            completed: true
        };
        state.sessionHistory.push(sessionRecord);
        state.currentSessionStart = null;
        saveHistory();

        // Determine next phase
        var nextPhase = endedPhase === "work" ? "break" : "work";
        state.phase = nextPhase;

        // Check for long break
        state.isLongBreak = false;
        if (nextPhase === "break" && state.consecutiveWorkSessions >= state.longBreakInterval) {
            state.isLongBreak = true;
            state.consecutiveWorkSessions = 0;
            state.remainingSeconds = state.longBreakDurationSeconds;
        } else {
            state.remainingSeconds = getPhaseDuration(state.phase);
        }

        saveStats();
        flashCompleteState();
        playSound(state.soundType, state.volume);
        notify(endedPhase);

        var breakLabel = state.isLongBreak ? "Long break" : "Break";
        var nextLabel = nextPhase === "work" ? "Work" : breakLabel;
        announce((endedPhase === "work" ? "Work" : "Break") + " complete. " + nextLabel + " is ready.");
        render();
    }

    function tick() {
        if (!state.isRunning) return;

        var now = Date.now();
        if (state.lastTickEpochMs === null) {
            state.lastTickEpochMs = now;
            return;
        }

        var elapsedMs = now - state.lastTickEpochMs;
        var elapsedWholeSeconds = Math.floor(elapsedMs / 1000);

        if (elapsedWholeSeconds <= 0) return;

        state.remainingSeconds -= elapsedWholeSeconds;
        state.lastTickEpochMs += elapsedWholeSeconds * 1000;

        if (state.remainingSeconds <= 0) {
            completePhase();
            return;
        }

        render();
    }

    function startTimer() {
        if (state.isRunning) return;
        if (state.remainingSeconds <= 0) {
            state.remainingSeconds = getPhaseDuration(state.phase);
        }

        ensureAudioContext();
        state.isRunning = true;
        state.lastTickEpochMs = Date.now();
        if (state.currentSessionStart === null) {
            state.currentSessionStart = new Date().toISOString();
        }
        if (state.timerId === null) {
            state.timerId = window.setInterval(tick, 1000);
        }
        render();
    }

    function pauseTimer() {
        if (!state.isRunning) return;
        stopTimer();
        render();
    }

    function resetCurrentPhase() {
        stopTimer();
        state.currentSessionStart = null;
        state.remainingSeconds = getPhaseDuration(state.phase);
        announce((state.phase === "work" ? "Work" : "Break") + " timer reset.");
        render();
    }

    function switchPhase() {
        stopTimer();
        state.currentSessionStart = null;
        state.isLongBreak = false;
        state.phase = state.phase === "work" ? "break" : "work";
        state.remainingSeconds = getPhaseDuration(state.phase);
        announce("Switched to " + state.phase + " phase.");
        render();
    }

    function applyPreset(nextPreset, options) {
        var resetPhase = options.resetPhase;
        var persist = options.persist;
        if (!PRESETS[nextPreset]) return;

        state.preset = nextPreset;
        state.workDurationSeconds = PRESETS[nextPreset].work;
        state.breakDurationSeconds = PRESETS[nextPreset].break;

        if (resetPhase) {
            stopTimer();
            state.currentSessionStart = null;
            state.isLongBreak = false;
            state.phase = "work";
            state.remainingSeconds = state.workDurationSeconds;
        } else {
            state.remainingSeconds = getPhaseDuration(state.phase);
        }

        if (persist) {
            saveSettings();
        }

        announce("Preset changed to " + PRESETS[nextPreset].label + ".");
        render();
    }

    // --- Notification permission ---

    function requestNotificationPermission() {
        ensureAudioContext();
        state.notificationAttempted = true;

        if (!("Notification" in window)) {
            updateNotificationStatus();
            return;
        }

        var applyPermissionResult = function (permission) {
            updateNotificationStatus({
                permissionOverride: permission || Notification.permission,
                attemptedRequest: true
            });
            render();
        };

        try {
            var maybePromise = Notification.requestPermission(function (legacyPermission) {
                applyPermissionResult(legacyPermission);
            });

            if (maybePromise && typeof maybePromise.then === "function") {
                maybePromise.then(applyPermissionResult).catch(function () {
                    applyPermissionResult(null);
                });
            } else {
                applyPermissionResult(null);
            }
        } catch (_) {
            applyPermissionResult(null);
        }
    }

    // --- Data export/import ---

    function exportData() {
        var data = {
            version: 1,
            exportedAt: new Date().toISOString(),
            settings: parseJson(safeGetItem(SETTINGS_KEY), {}),
            stats: parseJson(safeGetItem(STATS_KEY), {}),
            custom: parseJson(safeGetItem(CUSTOM_KEY), null),
            theme: safeGetItem(THEME_KEY),
            sound: parseJson(safeGetItem(SOUND_KEY), null),
            longBreak: parseJson(safeGetItem(LONGBREAK_KEY), null),
            history: parseJson(safeGetItem(HISTORY_KEY), [])
        };
        var blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "pomodoro-backup-" + todayDateStr() + ".json";
        a.click();
        URL.revokeObjectURL(url);
    }

    function importData(file) {
        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                var data = JSON.parse(e.target.result);
                if (!data || typeof data !== "object") {
                    announce("Import failed: invalid file format.");
                    return;
                }
                if (data.settings) safeSetItem(SETTINGS_KEY, JSON.stringify(data.settings));
                if (data.stats) safeSetItem(STATS_KEY, JSON.stringify(data.stats));
                if (data.custom) safeSetItem(CUSTOM_KEY, JSON.stringify(data.custom));
                if (data.theme) safeSetItem(THEME_KEY, data.theme);
                if (data.sound) safeSetItem(SOUND_KEY, JSON.stringify(data.sound));
                if (data.longBreak) safeSetItem(LONGBREAK_KEY, JSON.stringify(data.longBreak));
                if (Array.isArray(data.history)) safeSetItem(HISTORY_KEY, JSON.stringify(data.history));

                stopTimer();
                loadState();
                render();
                announce("Data imported successfully.");
            } catch (err) {
                announce("Import failed: " + err.message);
            }
        };
        reader.readAsText(file);
    }

    // --- Keyboard shortcuts ---

    function handleKeyboardShortcuts(event) {
        var activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
        if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
            return;
        }

        if (event.code === "Space") {
            event.preventDefault();
            state.isRunning ? pauseTimer() : startTimer();
        } else if (event.key.toLowerCase() === "r") {
            event.preventDefault();
            resetCurrentPhase();
        } else if (event.key.toLowerCase() === "s") {
            event.preventDefault();
            switchPhase();
        }
    }

    // --- Event binding ---

    function attachEvents() {
        ui.startPauseBtn.addEventListener("click", function () {
            ensureAudioContext();
            state.isRunning ? pauseTimer() : startTimer();
        });

        ui.resetBtn.addEventListener("click", function () {
            ensureAudioContext();
            resetCurrentPhase();
        });

        ui.switchPhaseBtn.addEventListener("click", function () {
            ensureAudioContext();
            switchPhase();
        });

        ui.enableNotifyBtn.addEventListener("click", requestNotificationPermission);

        ui.presetButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                var nextPreset = button.dataset.preset;
                if (nextPreset === "custom") {
                    // For custom, just show the UI and select it — don't reset until Apply
                    state.preset = "custom";
                    state.workDurationSeconds = PRESETS.custom.work;
                    state.breakDurationSeconds = PRESETS.custom.break;
                    saveSettings();
                    render();
                } else {
                    applyPreset(nextPreset, {resetPhase: true, persist: true});
                }
            });
        });

        // Dark mode
        if (ui.darkModeBtn) {
            ui.darkModeBtn.addEventListener("click", function () {
                toggleDarkMode();
            });
        }

        // Custom preset
        if (ui.applyCustomBtn) {
            ui.applyCustomBtn.addEventListener("click", function () {
                ensureAudioContext();
                applyCustomPreset();
            });
        }

        // Sound settings
        if (ui.soundSelect) {
            ui.soundSelect.addEventListener("change", function () {
                state.soundType = ui.soundSelect.value;
                saveSoundSettings();
            });
        }
        if (ui.volumeSlider) {
            ui.volumeSlider.addEventListener("input", function () {
                state.volume = parseInt(ui.volumeSlider.value, 10);
                if (ui.volumeDisplay) ui.volumeDisplay.textContent = state.volume + "%";
                saveSoundSettings();
            });
        }
        if (ui.previewSoundBtn) {
            ui.previewSoundBtn.addEventListener("click", function () {
                ensureAudioContext();
                playSound(state.soundType, state.volume);
            });
        }

        // Long break settings
        if (ui.longBreakInterval) {
            ui.longBreakInterval.addEventListener("change", function () {
                state.longBreakInterval = Math.max(2, Math.min(10, parseInt(ui.longBreakInterval.value, 10) || 4));
                ui.longBreakInterval.value = state.longBreakInterval;
                saveLongBreakSettings();
            });
        }
        if (ui.longBreakDuration) {
            ui.longBreakDuration.addEventListener("change", function () {
                var mins = Math.max(5, Math.min(60, parseInt(ui.longBreakDuration.value, 10) || 15));
                state.longBreakDurationSeconds = mins * 60;
                ui.longBreakDuration.value = mins;
                saveLongBreakSettings();
            });
        }

        // Export/Import
        if (ui.exportBtn) {
            ui.exportBtn.addEventListener("click", exportData);
        }
        if (ui.importBtn) {
            ui.importBtn.addEventListener("click", function () {
                ui.importFile.click();
            });
        }
        if (ui.importFile) {
            ui.importFile.addEventListener("change", function (e) {
                if (e.target.files.length > 0) {
                    importData(e.target.files[0]);
                    e.target.value = "";
                }
            });
        }

        // System theme change listener
        if (window.matchMedia) {
            window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
                if (state.darkMode === "system") {
                    applyTheme("system");
                }
            });
        }

        document.addEventListener("keydown", handleKeyboardShortcuts);
    }

    // --- Test export ---

    if (typeof window.__POMODORO_TEST_HARNESS__ !== "undefined") {
        window.__pomodoro = {
            state: state,
            PRESETS: PRESETS,
            formatTime: formatTime,
            parseJson: parseJson,
            safeGetItem: safeGetItem,
            safeSetItem: safeSetItem,
            getPhaseDuration: getPhaseDuration,
            tick: tick,
            completePhase: completePhase,
            startTimer: startTimer,
            stopTimer: stopTimer,
            pauseTimer: pauseTimer,
            resetCurrentPhase: resetCurrentPhase,
            switchPhase: switchPhase,
            applyPreset: applyPreset,
            getDailySummary: getDailySummary,
            getWeeklySummary: getWeeklySummary,
            render: render,
            playSound: playSound,
            loadState: loadState
        };
    }

    // --- Bootstrap ---

    loadState();
    attachEvents();
    render();
})();
