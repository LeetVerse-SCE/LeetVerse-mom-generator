// ==========================================================================
// LEETVERSE MINUTES OF MEETING GENERATOR
// Executive Client-Side JavaScript
// Features: Firebase Auth, Sheets API Roster Sync, In-Memory Delegations, Multi-Page PDF
// ==========================================================================

const momForm = document.getElementById("momForm");
const previewContent = document.getElementById("previewContent");
const downloadPdf = document.getElementById("downloadPdf");
const saveStatus = document.getElementById("saveStatus");
const saveDot = document.getElementById("saveDot");

// Controls & Widgets
const resetBtn = document.getElementById("resetBtn");
const printDocBtn = document.getElementById("printDocBtn");
const liveClockTime = document.getElementById("liveClockTime");
const liveClockDate = document.getElementById("liveClockDate");

// Integration Elements
const loginOverlay = document.getElementById("loginOverlay");
const googleSignInBtn = document.getElementById("googleSignInBtn");
const loginError = document.getElementById("loginError");
const forbiddenOverlay = document.getElementById("forbiddenOverlay");
const forbiddenSignOutBtn = document.getElementById("forbiddenSignOutBtn");
const forbiddenReason = document.getElementById("forbiddenReason");

const userProfileBar = document.getElementById("userProfileBar");
const userNameDisplay = document.getElementById("userNameDisplay");
const userRoleBadge = document.getElementById("userRoleBadge");
const headerSignOutBtn = document.getElementById("headerSignOutBtn");

const delegationBanner = document.getElementById("delegationBanner");
const delegationBannerText = document.getElementById("delegationBannerText");

const domainSelect = document.getElementById("domainSelect");
const meetingTypeBadge = document.getElementById("meetingTypeBadge");

const rosterChecklist = document.getElementById("rosterChecklist");
const rosterSearch = document.getElementById("rosterSearch");
const selectAllRosterBtn = document.getElementById("selectAllRosterBtn");
const clearAllRosterBtn = document.getElementById("clearAllRosterBtn");
const attendanceCountPill = document.getElementById("attendanceCountPill");
const existingMeetingWarning = document.getElementById("existingMeetingWarning");

const updateAttendanceBtn = document.getElementById("updateAttendanceBtn");
const updateAttendanceText = document.getElementById("updateAttendanceText");

// Modal Elements
const attendanceConfirmModal = document.getElementById("attendanceConfirmModal");
const closeAttendanceModalBtn = document.getElementById("closeAttendanceModalBtn");
const cancelAttendanceBtn = document.getElementById("cancelAttendanceBtn");
const confirmWriteAttendanceBtn = document.getElementById("confirmWriteAttendanceBtn");
const modalScopeSummary = document.getElementById("modalScopeSummary");
const modalDateSummary = document.getElementById("modalDateSummary");
const modalTypeSummary = document.getElementById("modalTypeSummary");
const modalCountsSummary = document.getElementById("modalCountsSummary");
const modalWarningContainer = document.getElementById("modalWarningContainer");
const modalConflictContainer = document.getElementById("modalConflictContainer");
const modalConflictList = document.getElementById("modalConflictList");
const skipConflictsLabel = document.getElementById("skipConflictsLabel");
const skipConflictsCheckbox = document.getElementById("skipConflictsCheckbox");

// Delegation Section
const delegationSection = document.getElementById("delegationSection");
const delegateRoll = document.getElementById("delegateRoll");
const delegateDomain = document.getElementById("delegateDomain");
const delegateHours = document.getElementById("delegateHours");
const grantDelegationBtn = document.getElementById("grantDelegationBtn");
const delegationErrorMsg = document.getElementById("delegationErrorMsg");
const delegationsTableBody = document.getElementById("delegationsTableBody");

const STORAGE_KEY = "leetverse_mom_data_v6";

// Form field IDs for autosave (excluding attendance checklist which is live from Sheets)
const fieldIds = [
    "meetingTitle",
    "meetingDate",
    "meetingTime",
    "meetingMode",
    "venue",
    "agenda",
    "discussion",
    "actionItems",
    "preparedBy"
];

// App State
let meetingData = null;
let currentMe = null;
let currentRoster = []; // { roll, name, domains? }
let presentRolls = new Set();
let existingMeetings = [];

// ==========================================================================
// 1. LIVE DIGITAL CLOCK
// ==========================================================================
function updateLiveClock() {
    const now = new Date();

    if (liveClockTime) {
        liveClockTime.textContent = now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        });
    }

    if (liveClockDate) {
        liveClockDate.textContent = now.toLocaleDateString("en-US", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }
}

setInterval(updateLiveClock, 1000);
updateLiveClock();

// ==========================================================================
// 2. HELPER UTILITIES
// ==========================================================================
function getValue(id) {
    const field = document.getElementById(id);
    return field ? field.value.trim() : "";
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };
        return entities[character];
    });
}

function getDocRefNumber(dateStr) {
    const d = dateStr ? new Date(dateStr) : new Date();
    const year = d.getFullYear() || 2026;
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `LV-MOM-${year}${month}${day}`;
}

// Estimate rendered pixel height of a section block
function estimateBlockHeight(content) {
    if (!content || !content.trim()) return 0;
    const lines = content.trim().split("\n");
    let visualLines = 0;
    lines.forEach(function (line) {
        visualLines += Math.max(1, Math.ceil(line.length / 85));
    });
    return 32 + (visualLines * 18);
}

function estimateAttendanceHeight(attendance) {
    if (!attendance || !attendance.trim()) return 0;
    const attendees = attendance.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (attendees.length === 0) return 0;
    const rows = Math.ceil(attendees.length / 4);
    return 36 + (rows * 26);
}

function estimateMetaTableHeight(data) {
    let rows = 0;
    if (data.title) rows++;
    if (data.domain || data.mode) rows++;
    if (data.date || data.time) rows++;
    if (data.venue) rows++;
    if (rows === 0) return 0;
    return 16 + (rows * 28);
}

function createSectionBlock(title, content) {
    if (!content || !content.trim()) return "";
    return `<div class="doc-block"><div class="doc-block-header"><span class="doc-block-title">${escapeHTML(title)}</span><div class="doc-block-line"></div></div><div class="doc-block-body">${escapeHTML(content.trim())}</div></div>`;
}

function createAttendanceBlock(rawAttendance) {
    if (!rawAttendance || !rawAttendance.trim()) return "";
    const attendees = rawAttendance.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (attendees.length === 0) return "";
    const pills = attendees.map(a => `<span class="attendee-pill">${escapeHTML(a)}</span>`).join("");
    return `<div class="doc-block"><div class="doc-block-header"><span class="doc-block-title">Attendance</span><div class="doc-block-line"></div></div><div class="doc-block-body attendance-body"><div class="attendees-pills-wrap">${pills}</div></div></div>`;
}

function createMetaTable(data) {
    const rows = [];
    if (data.title) {
        rows.push(`<div class="meta-row full"><span class="meta-label">Meeting Title:</span><span class="meta-val">${escapeHTML(data.title)}</span></div>`);
    }
    if (data.domain) {
        rows.push(`<div class="meta-row"><span class="meta-label">Department:</span><span class="meta-val">${escapeHTML(data.domain)}</span></div>`);
    }
    if (data.mode) {
        rows.push(`<div class="meta-row"><span class="meta-label">Mode:</span><span class="meta-val">${escapeHTML(data.mode)}</span></div>`);
    }
    if (data.date) {
        const formattedDate = new Date(data.date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
        });
        rows.push(`<div class="meta-row"><span class="meta-label">Date:</span><span class="meta-val">${escapeHTML(formattedDate)}</span></div>`);
    }
    if (data.time) {
        const formattedTime = new Date("2000-01-01T" + data.time).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
        rows.push(`<div class="meta-row"><span class="meta-label">Time:</span><span class="meta-val">${escapeHTML(formattedTime)}</span></div>`);
    }
    if (data.venue) {
        rows.push(`<div class="meta-row full"><span class="meta-label">Venue / Link:</span><span class="meta-val">${escapeHTML(data.venue)}</span></div>`);
    }
    if (rows.length === 0) return "";
    return `<div class="doc-meta-table"><div class="meta-table-grid">${rows.join("")}</div></div>`;
}

// Clean Sign-off Row Builder with Authentic Stamp
function createSignoffRow(preparedBy) {
    return `<div class="doc-signoff-row">
        <div class="signoff-box">
            <span class="signoff-label">Prepared By</span>
            <span class="signoff-name">${escapeHTML(preparedBy || "Not specified")}</span>
            <div class="signoff-line"></div>
        </div>
        <div class="signoff-box verified-box">
            <span class="signoff-label">Verified By</span>
            <span class="signoff-name">Leetverse</span>
            <div class="signoff-line"></div>
            <img src="IMAGES/stamp.png" class="doc-stamp-img" alt="Leetverse Stamp">
        </div>
    </div>`;
}

function createPageFooter(currentPage, totalPages) {
    return `<footer class="doc-footer-meta"><span>Leetverse • Minutes of Meeting</span><span>Page ${currentPage} of ${totalPages}</span></footer>`;
}

// ==========================================================================
// 3. PERSISTENCE & AUTOSAVE (WITHOUT ATTENDANCE)
// ==========================================================================
function saveFormData() {
    const data = {};
    fieldIds.forEach(function (id) {
        const field = document.getElementById(id);
        if (field) {
            data[id] = field.value;
        }
    });

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        if (saveStatus) saveStatus.textContent = "Auto-saved";
        if (saveDot) saveDot.style.background = "#10b981";
    } catch (error) {
        console.warn("Storage warning:", error);
    }
}

function restoreFormData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (!savedData) return false;
        const data = JSON.parse(savedData);
        let hasContent = false;

        fieldIds.forEach(function (id) {
            const field = document.getElementById(id);
            if (field && data[id] !== undefined) {
                field.value = data[id];
                if (data[id].trim()) hasContent = true;
            }
        });

        return hasContent;
    } catch (error) {
        console.error("Restore error:", error);
        return false;
    }
}

// ==========================================================================
// 4. API CLIENT WITH BEARER TOKEN INJECTION
// ==========================================================================
async function api(endpoint, options = {}) {
    const user = window.firebase ? firebase.auth().currentUser : null;
    if (!user) {
        throw { status: 401, message: "User is not signed in." };
    }

    const token = await user.getIdToken();
    const apiBase = window.MOM_CONFIG?.API_BASE || "http://localhost:5000/mom";
    const url = `${apiBase}${endpoint}`;

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...(options.headers || {})
    };

    const res = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const err = {
            status: res.status,
            code: data.error?.code || "ERROR",
            message: data.error?.message || `Request failed with status ${res.status}`,
            details: data.error?.details
        };

        if (res.status === 401) {
            await firebase.auth().signOut();
        }

        throw err;
    }

    return data;
}

// ==========================================================================
// 5. ATTENDANCE CHECKLIST & ROSTER SYNC
// ==========================================================================
function getDomainLabel() {
    if (!domainSelect) return "";
    const selected = domainSelect.options[domainSelect.selectedIndex];
    return selected ? selected.text : "";
}

function updateMeetingTypeIndicator() {
    const scope = domainSelect.value;
    if (scope === "ALL") {
        meetingTypeBadge.textContent = "General Meeting";
        meetingTypeBadge.className = "meeting-type-badge general";
    } else {
        meetingTypeBadge.textContent = "Domain Meeting";
        meetingTypeBadge.className = "meeting-type-badge";
    }
}

async function loadRosterForCurrentDomain() {
    const scope = domainSelect.value;
    if (!scope) {
        rosterChecklist.innerHTML = `<div class="roster-empty-notice">Select a domain above to view the student roster.</div>`;
        return;
    }

    rosterChecklist.innerHTML = `<div class="roster-empty-notice">Loading roster from Google Sheets...</div>`;

    try {
        const res = await api(`/roster?scope=${encodeURIComponent(scope)}`);
        if (scope === "ALL") {
            currentRoster = res.members || [];
            existingMeetings = [];
        } else {
            const domainData = res.domains?.[0];
            currentRoster = domainData?.members || [];
            existingMeetings = domainData?.existing || [];
        }

        // Check if meeting date matches any existing meeting
        checkExistingMeetingWarning();

        // Keep existing selections or reset
        renderRosterChecklist();
        updateAttendanceState();
    } catch (err) {
        console.error("Roster load error:", err);
        rosterChecklist.innerHTML = `<div class="roster-empty-notice" style="color: #dc2626;">Failed to load roster: ${escapeHTML(err.message)}</div>`;
    }
}

function checkExistingMeetingWarning() {
    const date = getValue("meetingDate");
    const scope = domainSelect.value;
    const type = scope === "ALL" ? "general" : "domain";

    const match = existingMeetings.find(e => e.date === date && e.type === type);
    if (match) {
        existingMeetingWarning.style.display = "block";
        existingMeetingWarning.textContent = `Notice: A ${type} meeting on ${date} is already present in this sheet tab. Re-submitting will update attendance safely.`;
    } else {
        existingMeetingWarning.style.display = "none";
    }
}

function renderRosterChecklist() {
    const query = (rosterSearch?.value || "").trim().toLowerCase();
    const filtered = currentRoster.filter(m => {
        if (!query) return true;
        return m.name.toLowerCase().includes(query) || m.roll.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
        rosterChecklist.innerHTML = `<div class="roster-empty-notice">No roster members match "${escapeHTML(query)}".</div>`;
        return;
    }

    let html = "";
    filtered.forEach(m => {
        const isChecked = presentRolls.has(m.roll);
        html += `
            <label class="roster-item-label">
                <input type="checkbox" data-roll="${escapeHTML(m.roll)}" ${isChecked ? "checked" : ""}>
                <div class="roster-student-info">
                    <span class="roster-student-name" title="${escapeHTML(m.name)}">${escapeHTML(m.name)}</span>
                    <span class="roster-student-roll">${escapeHTML(m.roll)}</span>
                </div>
            </label>
        `;
    });

    rosterChecklist.innerHTML = html;

    // Attach checkbox handlers
    rosterChecklist.querySelectorAll("input[type='checkbox']").forEach(cb => {
        cb.addEventListener("change", function () {
            const roll = this.getAttribute("data-roll");
            if (this.checked) {
                presentRolls.add(roll);
            } else {
                presentRolls.delete(roll);
            }
            updateAttendanceState();
        });
    });
}

function updateAttendanceState() {
    const presentCount = presentRolls.size;
    const totalCount = currentRoster.length;
    attendanceCountPill.textContent = `${presentCount} / ${totalCount} Present`;

    // Rebuild meetingData.attendance with present student names (one per line)
    const presentNames = [];
    currentRoster.forEach(m => {
        if (presentRolls.has(m.roll)) {
            presentNames.push(m.name);
        }
    });

    if (meetingData) {
        meetingData.attendance = presentNames.join("\n");
    }

    resetAttendanceButtonState();
    generatePreview();
}

function resetAttendanceButtonState() {
    updateAttendanceBtn.className = "header-btn header-btn-outline update-attendance-btn";
    updateAttendanceBtn.disabled = !domainSelect.value || !getValue("meetingDate") || currentRoster.length === 0;
    updateAttendanceText.textContent = "Update Attendance";
}

// Checklist Toolbar Buttons
if (selectAllRosterBtn) {
    selectAllRosterBtn.addEventListener("click", function () {
        currentRoster.forEach(m => presentRolls.add(m.roll));
        renderRosterChecklist();
        updateAttendanceState();
    });
}

if (clearAllRosterBtn) {
    clearAllRosterBtn.addEventListener("click", function () {
        presentRolls.clear();
        renderRosterChecklist();
        updateAttendanceState();
    });
}

if (rosterSearch) {
    rosterSearch.addEventListener("input", function () {
        renderRosterChecklist();
    });
}

// ==========================================================================
// 6. ATTENDANCE SUBMISSION (DRY RUN -> CONFIRM MODAL -> REAL WRITE)
// ==========================================================================
if (updateAttendanceBtn) {
    updateAttendanceBtn.addEventListener("click", async function () {
        const scope = domainSelect.value;
        const date = getValue("meetingDate");
        const type = scope === "ALL" ? "general" : "domain";

        if (!scope || !date) {
            alert("Please select a domain and meeting date first.");
            return;
        }

        if (currentRoster.length === 0) {
            alert("The member roster has not loaded yet. Please wait.");
            return;
        }

        // Build records payload
        const records = currentRoster.map(m => ({
            roll: m.roll,
            status: presentRolls.has(m.roll) ? "P" : "A"
        }));

        updateAttendanceBtn.disabled = true;
        updateAttendanceBtn.className = "header-btn update-attendance-btn updating";
        updateAttendanceText.textContent = "Simulating...";

        try {
            // Step 1: Pre-flight dry run
            const dryRunRes = await api("/attendance", {
                method: "POST",
                body: {
                    date,
                    type,
                    scope,
                    records,
                    dryRun: true
                }
            });

            // Populate Modal
            modalScopeSummary.textContent = scope === "ALL" ? "General (Whole Society - 9 Tabs)" : getDomainLabel();
            modalDateSummary.textContent = date;
            modalTypeSummary.textContent = type.toUpperCase();
            modalCountsSummary.textContent = `${presentRolls.size} Present, ${currentRoster.length - presentRolls.size} Absent`;

            // Check duplicate / already_recorded warning
            const hasAlreadyRecorded = dryRunRes.results?.some(r => r.status === "already_recorded");
            if (hasAlreadyRecorded) {
                modalWarningContainer.style.display = "block";
                modalWarningContainer.innerHTML = `
                    <div class="modal-warning-box">
                        <strong>Notice:</strong> This meeting was already recorded by you with identical details. Submitting again will succeed safely with no duplicate columns created.
                    </div>
                `;
            } else {
                modalWarningContainer.style.display = "none";
            }

            modalConflictContainer.style.display = "none";
            confirmWriteAttendanceBtn.disabled = false;

            // Open Modal
            attendanceConfirmModal.classList.remove("hidden");
            resetAttendanceButtonState();
        } catch (err) {
            console.error("Dry run error:", err);
            updateAttendanceBtn.className = "header-btn update-attendance-btn error";
            updateAttendanceText.textContent = "Pre-flight Error";

            // If conflict occurred during dry-run
            if (err.status === 409 && err.details?.problems) {
                attendanceConfirmModal.classList.remove("hidden");
                modalScopeSummary.textContent = scope === "ALL" ? "General (9 Tabs)" : getDomainLabel();
                modalDateSummary.textContent = date;
                modalTypeSummary.textContent = type.toUpperCase();
                modalCountsSummary.textContent = `${presentRolls.size} Present, ${currentRoster.length - presentRolls.size} Absent`;

                modalWarningContainer.style.display = "none";
                modalConflictContainer.style.display = "block";
                modalConflictList.innerHTML = err.details.problems.map(p => `<li><strong>${escapeHTML(p.tab)}:</strong> ${escapeHTML(p.message)}</li>`).join("");

                if (currentMe?.role === "executive" && type === "general") {
                    skipConflictsLabel.style.display = "block";
                    skipConflictsCheckbox.checked = false;
                    confirmWriteAttendanceBtn.disabled = true;

                    skipConflictsCheckbox.onchange = function () {
                        confirmWriteAttendanceBtn.disabled = !this.checked;
                    };
                } else {
                    skipConflictsLabel.style.display = "none";
                    confirmWriteAttendanceBtn.disabled = true;
                }
            } else {
                alert(`Cannot record attendance:\n${err.message}`);
                setTimeout(resetAttendanceButtonState, 3000);
            }
        }
    });
}

function closeAttendanceModal() {
    attendanceConfirmModal.classList.add("hidden");
    resetAttendanceButtonState();
}

if (closeAttendanceModalBtn) closeAttendanceModalBtn.addEventListener("click", closeAttendanceModal);
if (cancelAttendanceBtn) cancelAttendanceBtn.addEventListener("click", closeAttendanceModal);

if (confirmWriteAttendanceBtn) {
    confirmWriteAttendanceBtn.addEventListener("click", async function () {
        const scope = domainSelect.value;
        const date = getValue("meetingDate");
        const type = scope === "ALL" ? "general" : "domain";
        const skipConflicts = skipConflictsCheckbox?.checked || false;

        const records = currentRoster.map(m => ({
            roll: m.roll,
            status: presentRolls.has(m.roll) ? "P" : "A"
        }));

        confirmWriteAttendanceBtn.disabled = true;
        confirmWriteAttendanceBtn.textContent = "Writing to Google Sheets...";

        try {
            const writeRes = await api("/attendance", {
                method: "POST",
                body: {
                    date,
                    type,
                    scope,
                    records,
                    skipConflicts,
                    dryRun: false
                }
            });

            closeAttendanceModal();
            updateAttendanceBtn.className = "header-btn update-attendance-btn success";
            updateAttendanceText.textContent = "Updated ✓";

            alert("✅ Attendance successfully written to Google Sheets!");
            // Refresh roster to load newly created attendance column into existing meetings list
            await loadRosterForCurrentDomain();
        } catch (err) {
            console.error("Write error:", err);
            alert(`Failed to write attendance:\n${err.message}`);
            confirmWriteAttendanceBtn.disabled = false;
            confirmWriteAttendanceBtn.textContent = "Confirm & Submit";
        }
    });
}

// ==========================================================================
// 7. IN-MEMORY DELEGATION MANAGEMENT
// ==========================================================================
async function loadDelegations() {
    if (!currentMe?.canDelegate) return;
    try {
        const res = await api("/delegations");
        const delegations = res.delegations || [];

        if (delegations.length === 0) {
            delegationsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">No active delegations.</td></tr>`;
            return;
        }

        let html = "";
        delegations.forEach(d => {
            const expDate = new Date(d.expiresAt);
            const timeStr = expDate.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });

            html += `
                <tr>
                    <td><strong>${escapeHTML(d.domain)}</strong></td>
                    <td><code>${escapeHTML(d.roll)}</code></td>
                    <td>${escapeHTML(d.name || "Member")}</td>
                    <td>${timeStr}</td>
                    <td>
                        <button type="button" class="revoke-btn" data-domain="${escapeHTML(d.domain)}" data-roll="${escapeHTML(d.roll)}">Revoke</button>
                    </td>
                </tr>
            `;
        });

        delegationsTableBody.innerHTML = html;

        // Attach revoke handlers
        delegationsTableBody.querySelectorAll(".revoke-btn").forEach(btn => {
            btn.addEventListener("click", async function () {
                const domain = this.getAttribute("data-domain");
                const roll = this.getAttribute("data-roll");
                if (confirm(`Revoke delegation for roll ${roll} on domain ${domain}?`)) {
                    try {
                        await api(`/delegations/${encodeURIComponent(domain)}/${encodeURIComponent(roll)}`, {
                            method: "DELETE"
                        });
                        await loadDelegations();
                    } catch (err) {
                        alert(`Failed to revoke delegation: ${err.message}`);
                    }
                }
            });
        });
    } catch (err) {
        console.error("Delegations load error:", err);
    }
}

if (grantDelegationBtn) {
    grantDelegationBtn.addEventListener("click", async function () {
        const roll = (delegateRoll?.value || "").trim();
        const domain = delegateDomain?.value;
        const hours = Number(delegateHours?.value || 24);

        delegationErrorMsg.style.display = "none";

        if (!roll || !domain) {
            delegationErrorMsg.textContent = "Please enter target member roll and select a domain.";
            delegationErrorMsg.style.display = "block";
            return;
        }

        grantDelegationBtn.disabled = true;
        grantDelegationBtn.textContent = "Granting...";

        try {
            await api("/delegations", {
                method: "POST",
                body: { roll, domain, hours }
            });

            delegateRoll.value = "";
            await loadDelegations();
        } catch (err) {
            delegationErrorMsg.textContent = err.message || "Failed to grant delegation.";
            delegationErrorMsg.style.display = "block";
        } finally {
            grantDelegationBtn.disabled = false;
            grantDelegationBtn.textContent = "Grant";
        }
    });
}

// ==========================================================================
// 8. FIREBASE AUTH INTEGRATION FLOW
// ==========================================================================
async function initFirebaseAuth() {
    if (!window.firebase || !window.MOM_CONFIG?.FIREBASE_CONFIG) {
        console.warn("Firebase configuration not found. Running in standalone preview mode.");
        loginOverlay.classList.add("hidden");
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(window.MOM_CONFIG.FIREBASE_CONFIG);
        }
    } catch (e) {
        console.error("Firebase init error:", e);
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            loginOverlay.classList.add("hidden");
            try {
                const me = await api("/me");
                currentMe = me;

                // Update Header User Profile
                userProfileBar.classList.remove("hidden");
                userNameDisplay.textContent = me.name || user.displayName || me.email;
                userRoleBadge.textContent = me.role;
                userRoleBadge.className = `user-role-badge ${me.role}`;

                // Set Readonly Prepared By
                const prepField = document.getElementById("preparedBy");
                if (prepField) {
                    prepField.value = me.name || user.displayName || "";
                }

                // Check Delegation Banner
                if (me.role === "delegate" && me.delegatedUntil) {
                    const domains = Object.keys(me.delegatedUntil);
                    delegationBanner.classList.remove("hidden");
                    delegationBannerText.textContent = `Delegated access active for ${domains.join(", ")} until ${new Date(Object.values(me.delegatedUntil)[0]).toLocaleTimeString()}`;
                } else {
                    delegationBanner.classList.add("hidden");
                }

                // Populate Domain Select
                domainSelect.innerHTML = "";
                if (me.canGeneral) {
                    const optAll = document.createElement("option");
                    optAll.value = "ALL";
                    optAll.textContent = "★ General (Whole Society - 9 Domains)";
                    domainSelect.appendChild(optAll);
                }

                me.domains.forEach(d => {
                    const opt = document.createElement("option");
                    opt.value = d.key;
                    opt.textContent = d.label;
                    domainSelect.appendChild(opt);
                });

                updateMeetingTypeIndicator();

                // Setup Delegation Panel if Authorized
                if (me.canDelegate) {
                    delegationSection.style.display = "block";
                    delegateDomain.innerHTML = "";
                    me.domains.forEach(d => {
                        const opt = document.createElement("option");
                        opt.value = d.key;
                        opt.textContent = d.label;
                        delegateDomain.appendChild(opt);
                    });
                    loadDelegations();
                } else {
                    delegationSection.style.display = "none";
                }

                // Initial Roster Load
                await loadRosterForCurrentDomain();
            } catch (err) {
                console.error("/me evaluation error:", err);
                if (err.status === 403) {
                    forbiddenOverlay.classList.remove("hidden");
                    loginOverlay.classList.add("hidden");
                    forbiddenReason.textContent = err.message || "You do not have an active Lead, Executive, or Delegated role.";
                } else if (err.status === 401) {
                    await firebase.auth().signOut();
                }
            }
        } else {
            // Signed out
            currentMe = null;
            userProfileBar.classList.add("hidden");
            forbiddenOverlay.classList.add("hidden");
            loginOverlay.classList.remove("hidden");
            delegationSection.style.display = "none";
            delegationBanner.classList.add("hidden");

            // Clear draft from localStorage on signout
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) {}

            momForm?.reset();
            currentRoster = [];
            presentRolls.clear();
            meetingData = null;
            generatePreview();
        }
    });

    if (googleSignInBtn) {
        googleSignInBtn.addEventListener("click", async () => {
            loginError.style.display = "none";
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                provider.setCustomParameters({ prompt: "select_account" });
                await firebase.auth().signInWithPopup(provider);
            } catch (err) {
                console.error("Sign-in error:", err);
                loginError.textContent = err.message || "Google sign-in failed.";
                loginError.style.display = "block";
            }
        });
    }

    const signOutHandler = async () => {
        if (window.firebase) {
            await firebase.auth().signOut();
        }
    };

    if (headerSignOutBtn) headerSignOutBtn.addEventListener("click", signOutHandler);
    if (forbiddenSignOutBtn) forbiddenSignOutBtn.addEventListener("click", signOutHandler);
}

if (domainSelect) {
    domainSelect.addEventListener("change", async () => {
        updateMeetingTypeIndicator();
        await loadRosterForCurrentDomain();
        generatePreview();
    });
}

const meetingDateField = document.getElementById("meetingDate");
if (meetingDateField) {
    meetingDateField.addEventListener("change", () => {
        checkExistingMeetingWarning();
        resetAttendanceButtonState();
        generatePreview();
    });
}

// ==========================================================================
// 9. LIVE DOCUMENT PREVIEW (ZERO OVERLAPPING, EXACT MULTI-PAGE FLOW)
// ==========================================================================
function generatePreview() {
    const presentNames = [];
    currentRoster.forEach(m => {
        if (presentRolls.has(m.roll)) {
            presentNames.push(m.name);
        }
    });

    meetingData = {
        title: getValue("meetingTitle"),
        domain: getDomainLabel(),
        date: getValue("meetingDate"),
        time: getValue("meetingTime"),
        mode: getValue("meetingMode"),
        venue: getValue("venue"),
        attendance: presentNames.join("\n"),
        agenda: getValue("agenda"),
        discussion: getValue("discussion"),
        actionItems: getValue("actionItems"),
        preparedBy: getValue("preparedBy")
    };

    const isEmpty = !meetingData.title &&
                    !meetingData.domain &&
                    !meetingData.date &&
                    !meetingData.time &&
                    !meetingData.venue &&
                    !meetingData.attendance &&
                    !meetingData.agenda &&
                    !meetingData.discussion &&
                    !meetingData.actionItems;

    if (isEmpty) {
        previewContent.innerHTML = `
            <div class="a4-page first-page">
                <div class="empty-preview-placeholder">
                    <div class="empty-logo-preview">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                    </div>
                    <h3>Meeting Preview</h3>
                    <p>Enter meeting details above to populate the document.</p>
                </div>
            </div>
        `;
        return;
    }

    const metaTableHTML = createMetaTable(meetingData);
    const attendanceBlockHTML = createAttendanceBlock(meetingData.attendance);
    const agendaBlockHTML = createSectionBlock("Agenda", meetingData.agenda);
    const discussionBlockHTML = createSectionBlock("Discussed Points & Outcomes", meetingData.discussion);
    const actionItemsBlockHTML = createSectionBlock("Action Items", meetingData.actionItems);
    const signoffHTML = createSignoffRow(meetingData.preparedBy);

    const metaTableHeight = estimateMetaTableHeight(meetingData);
    const attendanceHeight = estimateAttendanceHeight(meetingData.attendance);
    const agendaHeight = estimateBlockHeight(meetingData.agenda);
    const discussionHeight = estimateBlockHeight(meetingData.discussion);
    const actionItemsHeight = estimateBlockHeight(meetingData.actionItems);

    const titleBarHTML = `<div class="doc-title-bar"><h1 class="doc-main-title">MINUTES OF THE MEETING</h1></div>`;
    const titleBarHeight = 40;
    const signoffHeight = 75;
    const footerHeight = 25;

    const PAGE_1_CAPACITY = 820;
    const PAGE_OTHER_CAPACITY = 920;

    const totalEstimatedHeight = titleBarHeight +
                                 metaTableHeight +
                                 attendanceHeight +
                                 agendaHeight +
                                 discussionHeight +
                                 actionItemsHeight +
                                 signoffHeight +
                                 footerHeight;

    if (totalEstimatedHeight <= PAGE_1_CAPACITY) {
        previewContent.innerHTML = `
            <div class="a4-page first-page">
                ${titleBarHTML}
                ${metaTableHTML}
                ${attendanceBlockHTML}
                ${agendaBlockHTML}
                ${discussionBlockHTML}
                ${actionItemsBlockHTML}
                ${signoffHTML}
                ${createPageFooter(1, 1)}
            </div>
        `;
    } else {
        let p1ContentHeight = titleBarHeight + metaTableHeight + attendanceHeight + agendaHeight + footerHeight;
        let p1HasDiscussion = false;

        if (discussionHeight > 0 && (p1ContentHeight + discussionHeight <= PAGE_1_CAPACITY - 40)) {
            p1HasDiscussion = true;
            p1ContentHeight += discussionHeight;
        }

        const p2ContentHeight = (p1HasDiscussion ? 0 : discussionHeight) + actionItemsHeight + signoffHeight + footerHeight;
        const needsPage3 = p2ContentHeight > PAGE_OTHER_CAPACITY;

        if (!needsPage3) {
            previewContent.innerHTML = `
                <div class="a4-page first-page">
                    ${titleBarHTML}
                    ${metaTableHTML}
                    ${attendanceBlockHTML}
                    ${agendaBlockHTML}
                    ${p1HasDiscussion ? discussionBlockHTML : ""}
                    ${createPageFooter(1, 2)}
                </div>
                <div class="a4-page other-page">
                    ${!p1HasDiscussion ? discussionBlockHTML : ""}
                    ${actionItemsBlockHTML}
                    ${signoffHTML}
                    ${createPageFooter(2, 2)}
                </div>
            `;
        } else {
            previewContent.innerHTML = `
                <div class="a4-page first-page">
                    ${titleBarHTML}
                    ${metaTableHTML}
                    ${attendanceBlockHTML}
                    ${agendaBlockHTML}
                    ${createPageFooter(1, 3)}
                </div>
                <div class="a4-page other-page">
                    ${discussionBlockHTML}
                    ${createPageFooter(2, 3)}
                </div>
                <div class="a4-page other-page">
                    ${actionItemsBlockHTML}
                    ${signoffHTML}
                    ${createPageFooter(3, 3)}
                </div>
            `;
        }
    }
}

// Event Listeners for autosave
fieldIds.forEach(function (id) {
    const field = document.getElementById(id);
    if (field) {
        field.addEventListener("input", function () {
            saveFormData();
            resetAttendanceButtonState();
            generatePreview();
        });
        field.addEventListener("change", function () {
            saveFormData();
            resetAttendanceButtonState();
            generatePreview();
        });
    }
});

momForm.addEventListener("submit", function (e) {
    e.preventDefault();
    saveFormData();
    generatePreview();
    document.getElementById("previewSection")?.scrollIntoView({ behavior: "smooth" });
});

function clearAllFields() {
    if (confirm("Clear all meeting form fields?")) {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}

        momForm.reset();
        presentRolls.clear();
        meetingData = null;
        renderRosterChecklist();
        updateAttendanceState();
        generatePreview();

        if (saveStatus) saveStatus.textContent = "Cleared";
    }
}

momForm.addEventListener("reset", function (e) {
    e.preventDefault();
    clearAllFields();
});

if (resetBtn) resetBtn.addEventListener("click", clearAllFields);

if (printDocBtn) {
    printDocBtn.addEventListener("click", function () {
        saveFormData();
        generatePreview();
        setTimeout(function () {
            window.print();
        }, 80);
    });
}

// ==========================================================================
// 10. PDF EXPORT (PRESERVED HIGH-FIDELITY IMPLEMENTATION)
// ==========================================================================
function loadExternalScript(src) {
    return new Promise(function (resolve, reject) {
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Unable to load: " + src));
        document.head.appendChild(script);
    });
}

async function ensureJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    const backupCDNs = [
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
        "https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js"
    ];
    for (const url of backupCDNs) {
        try {
            await loadExternalScript(url);
            if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
        } catch (e) {}
    }
    throw new Error("Unable to load jsPDF library.");
}

async function ensureHtml2Canvas() {
    if (window.html2canvas) return window.html2canvas;
    const backupCDNs = [
        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
        "https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.js"
    ];
    for (const url of backupCDNs) {
        try {
            await loadExternalScript(url);
            if (window.html2canvas) return window.html2canvas;
        } catch (e) {}
    }
    return null;
}

let cachedFirstPageData = null;
let cachedOtherPagesData = null;

function loadOptimizedBackgroundImage(src, maxWidth = 1488, quality = 0.82) {
    return new Promise(function (resolve) {
        const image = new Image();
        image.crossOrigin = "Anonymous";
        image.onload = function () {
            try {
                const scale = Math.min(1, maxWidth / image.naturalWidth);
                const targetW = Math.round(image.naturalWidth * scale);
                const targetH = Math.round(image.naturalHeight * scale);

                const canvas = document.createElement("canvas");
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext("2d");

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, targetW, targetH);
                ctx.drawImage(image, 0, 0, targetW, targetH);

                resolve(canvas.toDataURL("image/jpeg", quality));
            } catch (err) {
                resolve(src);
            }
        };
        image.onerror = () => resolve(null);
        image.src = src;
    });
}

downloadPdf.addEventListener("click", async function () {
    saveFormData();
    generatePreview();

    if (!meetingData || (!meetingData.title && !meetingData.agenda && !meetingData.discussion)) {
        alert("Please fill in the meeting details before exporting the PDF.");
        return;
    }

    const originalText = downloadPdf.innerHTML;
    downloadPdf.disabled = true;
    downloadPdf.innerHTML = `
        <svg class="btn-icon" style="animation: spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        <span>Exporting...</span>
    `;

    try {
        const jsPDF = await ensureJsPDF();
        const html2canvasLib = await ensureHtml2Canvas();

        const pages = previewContent.querySelectorAll(".a4-page");
        const sanitizedTitle = (meetingData.title || "Meeting-Minutes")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .slice(0, 30);

        if (html2canvasLib && pages.length > 0) {
            const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });

            for (let i = 0; i < pages.length; i++) {
                if (i > 0) pdf.addPage("a4", "p");
                const canvas = await html2canvasLib(pages[i], {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: "#ffffff",
                    logging: false
                });
                const imgData = canvas.toDataURL("image/jpeg", 0.84);
                pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
            }

            pdf.save(`Leetverse-MOM-${sanitizedTitle}.pdf`);
            return;
        }

        // Vector Fallback if html2canvas not available
        if (!cachedFirstPageData) cachedFirstPageData = await loadOptimizedBackgroundImage("IMAGES/first-page.png");
        if (!cachedOtherPagesData) cachedOtherPagesData = await loadOptimizedBackgroundImage("IMAGES/other-pages.png");

        const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 16;
        const contentWidth = pageWidth - margin * 2;
        let y = cachedFirstPageData ? 38 : 32;

        if (cachedFirstPageData) pdf.addImage(cachedFirstPageData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(5, 46, 36);
        pdf.text("MINUTES OF THE MEETING", margin, y);
        y += 8;

        const totalPages = pdf.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            pdf.setPage(p);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
            pdf.setTextColor(148, 163, 184);
            pdf.text("Leetverse • Minutes of Meeting", margin, pageHeight - 7);
            pdf.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
        }

        pdf.save(`Leetverse-MOM-${sanitizedTitle}.pdf`);
    } catch (err) {
        console.error("PDF export error:", err);
        alert("Unable to generate PDF:\n" + err.message);
    } finally {
        downloadPdf.disabled = false;
        downloadPdf.innerHTML = originalText;
    }
});

// ==========================================================================
// 11. APP BOOTSTRAP
// ==========================================================================
window.addEventListener("DOMContentLoaded", function () {
    restoreFormData();
    generatePreview();
    initFirebaseAuth();
});
