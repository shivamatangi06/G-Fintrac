/**
 * ============================================================================
 * MoneyFlow — Personal Finance Tracker (v2.4.0)
 * Modern, Offline-First Web Application | EmailJS Real Email OTP Delivery
 * ============================================================================
 * 
 * Features:
 * - Real Email OTP Delivery via EmailJS SDK (delivers 6-digit OTP directly to inbox)
 * - Automatic on-screen fallback toast so login is never blocked if keys are unconfigured
 * - EmailJS Key Configuration Manager in Settings
 * - Session state persistence (user email & login status saved to localStorage)
 * - Net Balance calculation with instant privacy blur/unblur toggle
 * - Income, expense, lending, borrowing, and goal tracking
 * - Dynamic Analytics with Chart.js & SVG Progress Rings
 * - Bank statement CSV/Excel parser with auto-categorization & date extraction
 * - Data Export (CSV & PDF with autoTable formatting)
 * - Auto-migration from legacy G-Fintrac data to MoneyFlow
 */

// ============================================================================
// 1. CONSTANTS & CONFIGURATION
// ============================================================================

/** Target savings goal across all months (in ₹) */
const SAVINGS_TARGET = 500000;

/** Target emergency fund goal across all months (in ₹) */
const EMERGENCY_TARGET = 200000;

/** Key used for browser localStorage */
const LOCAL_STORAGE_KEY = 'moneyflow_state';
const LEGACY_STORAGE_KEY = 'gfintrac_state';

/** Default application state */
const DEFAULT_STATE = {
    transactions: [],
    theme: 'dark',
    activeTab: 'dashboard',
    userEmail: null,
    isLoggedIn: false,
    emailJsConfig: {
        serviceId: '',
        templateId: '',
        publicKey: ''
    }
};

/** Month names and short abbreviations */
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTH_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/** SVG Ring circumference (radius = 52px, 2 * pi * 52 ≈ 326.73) */
const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

// ============================================================================
// 2. DATA LAYER (localStorage & Auto-Migration)
// ============================================================================

/**
 * Generates a unique UUID v4 identifier for transactions.
 * @returns {string} Unique UUID
 */
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Persists application state object to localStorage.
 * @param {Object} state - Application state object
 */
function saveState(state) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save state to localStorage:', e);
    }
}

/**
 * Retrieves application state from localStorage or migrates legacy data.
 * @returns {Object} Application state
 */
function loadState() {
    let saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) {
        saved = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved) {
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, saved);
            } catch (e) {
                console.error('Migration error:', e);
            }
        }
    }
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return { ...DEFAULT_STATE, ...parsed };
        } catch (e) {
            console.error('Failed to parse saved state:', e);
            return { ...DEFAULT_STATE };
        }
    }
    return { ...DEFAULT_STATE };
}

/** Global Application State Instance */
let APP = loadState();

// ============================================================================
// 3. DOM ELEMENT REFERENCES
// ============================================================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Navigation Elements
const navItems = $$('.nav-item');
const bottomNavItems = $$('.bottom-nav-item');
const tabContents = $$('.tab-content');

// Sidebar Elements
const sidebar = $('#sidebar');
const sidebarBackdrop = $('#sidebarBackdrop');
const hamburgerBtn = $('#hamburgerBtn');
const sidebarToggleBtn = $('#sidebarToggleBtn');

// Dashboard Summary & Goals
const totalIncomeEl = $('#totalIncome');
const totalExpensesEl = $('#totalExpenses');
const totalLentEl = $('#totalLent');
const totalBorrowedEl = $('#totalBorrowed');
const totalNetBalanceEl = $('#totalNetBalance');
const netBalanceCard = $('#netBalanceCard');
const netBalanceUnlockBtn = $('#netBalanceUnlockBtn');
const netBalanceEyeIcon = $('#netBalanceEyeIcon');
const savingsRing = $('#savingsRing');
const savingsPctEl = $('#savingsPct');
const emergencyRing = $('#emergencyRing');
const emergencyPctEl = $('#emergencyPct');

// Dashboard Month Switcher
const dashMonthLabel = $('#dashMonthLabel');
const dashPrevMonth = $('#dashPrevMonth');
const dashNextMonth = $('#dashNextMonth');
const dashAllMonths = $('#dashAllMonths');

// Insights Month Switcher & Summary
const insightMonthLabel = $('#insightMonthLabel');
const insightPrevMonth = $('#insightPrevMonth');
const insightNextMonth = $('#insightNextMonth');
const insightAllMonths = $('#insightAllMonths');
const insightsIncome = $('#insightsIncome');
const insightsExpenses = $('#insightsExpenses');
const insightsSavingsPct = $('#insightsSavingsPct');
const insightsEmergencyPct = $('#insightsEmergencyPct');
const insightsLent = $('#insightsLent');
const insightsBorrowed = $('#insightsBorrowed');
const categoryBars = $('#categoryBars');

// Transaction Form & Table
const transactionForm = $('#transactionForm');
const txnAmountInput = $('#txnAmount');
const txnDateInput = $('#txnDate');
const txnNotesInput = $('#txnNotes');
const txnCustomCategoryGroup = $('#customCategoryGroup');
const txnCustomCategoryInput = $('#txnCustomCategory');
const txnTableBody = $('#txnTableBody');
const emptyState = $('#emptyState');
const txnFormCard = $('#txnFormCard');
const txnTypeChips = $('#txnTypeChips');
const txnCategoryChips = $('#txnCategoryChips');

// Statement Upload
const uploadArea = $('#uploadArea');
const fileInput = $('#fileInput');
const uploadPreview = $('#uploadPreview');
const parsedTableBody = $('#parsedTableBody');
const parsedCount = $('#parsedCount');
const importParsedBtn = $('#importParsedBtn');
const cancelParsedBtn = $('#cancelParsedBtn');

// Settings & Account
const themeToggle = $('#themeToggle');
const accountEmailEl = $('#accountEmail');
const logoutBtn = $('#logoutBtn');
const exportCSVBtn = $('#exportCSV');
const exportPDFBtn = $('#exportPDF');
const clearDataBtn = $('#clearDataBtn');
const configEmailJsBtn = $('#configEmailJsBtn');

// Modals
const exportModal = $('#exportModal');
const exportMonthInput = $('#exportMonthInput');
const confirmExportBtn = $('#confirmExportBtn');
const cancelExportBtn = $('#cancelExportBtn');

const confirmModal = $('#confirmModal');
const confirmClearBtn = $('#confirmClearBtn');
const cancelClearBtn = $('#cancelClearBtn');
const confirmMonthInput = $('#confirmMonthInput');

const deleteTxnModal = $('#deleteTxnModal');
const confirmDeleteTxnBtn = $('#confirmDeleteTxnBtn');
const cancelDeleteTxnBtn = $('#cancelDeleteTxnBtn');

const emailJsModal = $('#emailJsModal');
const emailJsServiceId = $('#emailJsServiceId');
const emailJsTemplateId = $('#emailJsTemplateId');
const emailJsPublicKey = $('#emailJsPublicKey');
const saveEmailJsBtn = $('#saveEmailJsBtn');
const cancelEmailJsBtn = $('#cancelEmailJsBtn');

// Email OTP Elements
const otpLoginScreen = $('#otpLoginScreen');
const otpEmailStep = $('#otpEmailStep');
const otpCodeStep = $('#otpCodeStep');
const otpEmailInput = $('#otpEmailInput');
const sendOtpBtn = $('#sendOtpBtn');
const otpSentEmail = $('#otpSentEmail');
const otpInputsContainer = $('#otpInputsContainer');
const otpError = $('#otpError');
const verifyOtpBtn = $('#verifyOtpBtn');
const resendOtpBtn = $('#resendOtpBtn');
const resendTimer = $('#resendTimer');
const changeEmailBtn = $('#changeEmailBtn');

// UI Components
const fabAddTxn = $('#fabAddTxn');
const toast = $('#toast');
const toastMessage = $('#toastMessage');

// ============================================================================
// 4. MONTH STATE & SYNCHRONIZATION
// ============================================================================

let dashMonthIndex = new Date().getMonth();
let dashYear = new Date().getFullYear();
let dashShowAll = false;

let insightMonthIndex = dashMonthIndex;
let insightYear = dashYear;
let insightShowAll = false;

/**
 * Updates the month display label text.
 * @param {HTMLElement} labelEl - Element to update
 * @param {number} monthIndex - Month (0-11)
 * @param {number} year - Year (YYYY)
 * @param {boolean} showAll - Whether 'All Months' mode is active
 */
function updateMonthLabel(labelEl, monthIndex, year, showAll) {
    if (!labelEl) return;
    labelEl.textContent = showAll ? 'All Months' : `${MONTH_NAMES[monthIndex]} ${year}`;
}

/**
 * Changes month index and keeps Dashboard and Insights tab in sync.
 * @param {number} direction - -1 for previous, +1 for next
 * @param {string} context - 'dash' or 'insight'
 */
function changeMonth(direction, context) {
    if (context === 'dash') {
        dashShowAll = false;
        if (dashAllMonths) dashAllMonths.classList.remove('active');
        dashMonthIndex += direction;
        if (dashMonthIndex > 11) { dashMonthIndex = 0; dashYear++; }
        if (dashMonthIndex < 0) { dashMonthIndex = 11; dashYear--; }
        updateMonthLabel(dashMonthLabel, dashMonthIndex, dashYear, false);

        insightShowAll = false;
        if (insightAllMonths) insightAllMonths.classList.remove('active');
        insightMonthIndex = dashMonthIndex;
        insightYear = dashYear;
        updateMonthLabel(insightMonthLabel, insightMonthIndex, insightYear, false);

        refreshDashboard();
        refreshInsights();
    } else {
        insightShowAll = false;
        if (insightAllMonths) insightAllMonths.classList.remove('active');
        insightMonthIndex += direction;
        if (insightMonthIndex > 11) { insightMonthIndex = 0; insightYear++; }
        if (insightMonthIndex < 0) { insightMonthIndex = 11; insightYear--; }
        updateMonthLabel(insightMonthLabel, insightMonthIndex, insightYear, false);

        dashShowAll = false;
        if (dashAllMonths) dashAllMonths.classList.remove('active');
        dashMonthIndex = insightMonthIndex;
        dashYear = insightYear;
        updateMonthLabel(dashMonthLabel, dashMonthIndex, dashYear, false);

        refreshDashboard();
        refreshInsights();
    }
}

dashPrevMonth.addEventListener('click', () => changeMonth(-1, 'dash'));
dashNextMonth.addEventListener('click', () => changeMonth(1, 'dash'));
dashAllMonths.addEventListener('click', () => {
    dashShowAll = !dashShowAll;
    dashAllMonths.classList.toggle('active', dashShowAll);
    updateMonthLabel(dashMonthLabel, dashMonthIndex, dashYear, dashShowAll);

    insightShowAll = dashShowAll;
    if (insightAllMonths) insightAllMonths.classList.toggle('active', insightShowAll);
    updateMonthLabel(insightMonthLabel, insightMonthIndex, insightYear, insightShowAll);

    refreshDashboard();
    refreshInsights();
});

dashMonthLabel.addEventListener('click', () => {
    const now = new Date();
    dashMonthIndex = now.getMonth();
    dashYear = now.getFullYear();
    dashShowAll = false;
    dashAllMonths.classList.remove('active');
    updateMonthLabel(dashMonthLabel, dashMonthIndex, dashYear, false);

    insightMonthIndex = dashMonthIndex;
    insightYear = dashYear;
    insightShowAll = false;
    if (insightAllMonths) insightAllMonths.classList.remove('active');
    updateMonthLabel(insightMonthLabel, insightMonthIndex, insightYear, false);

    refreshDashboard();
    refreshInsights();
    showToast(`Switched to current month (${MONTH_NAMES[dashMonthIndex]} ${dashYear})`);
});

if (insightPrevMonth) insightPrevMonth.addEventListener('click', () => changeMonth(-1, 'insight'));
if (insightNextMonth) insightNextMonth.addEventListener('click', () => changeMonth(1, 'insight'));
if (insightAllMonths) {
    insightAllMonths.addEventListener('click', () => {
        insightShowAll = !insightShowAll;
        insightAllMonths.classList.toggle('active', insightShowAll);
        updateMonthLabel(insightMonthLabel, insightMonthIndex, insightYear, insightShowAll);

        dashShowAll = insightShowAll;
        if (dashAllMonths) dashAllMonths.classList.toggle('active', dashShowAll);
        updateMonthLabel(dashMonthLabel, dashMonthIndex, dashYear, dashShowAll);

        refreshDashboard();
        refreshInsights();
    });
}

// ============================================================================
// 5. NAVIGATION & SIDEBAR CONTROLLER
// ============================================================================

/**
 * Switches the visible tab (Dashboard, Insights, Settings).
 * @param {string} tabId - Tab name ('dashboard' | 'insights' | 'settings')
 */
function switchTab(tabId) {
    navItems.forEach(item => item.classList.toggle('active', item.dataset.tab === tabId));
    bottomNavItems.forEach(item => item.classList.toggle('active', item.dataset.tab === tabId));
    tabContents.forEach(tc => tc.classList.toggle('active', tc.id === `tab-${tabId}`));

    APP.activeTab = tabId;
    saveState(APP);

    if (tabId === 'dashboard') refreshDashboard();
    if (tabId === 'insights') refreshInsights();
}

/** Checks if current screen is mobile size (<= 768px) */
function isMobile() {
    return window.innerWidth <= 768;
}

/** Toggles side navigation drawer */
function toggleSidebar() {
    if (otpLoginScreen && otpLoginScreen.style.display !== 'none') return;
    const isOpen = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', isOpen);
    sidebarBackdrop.classList.toggle('show', isOpen);
    setHamburgerActive(isOpen);
}

/** Closes side navigation drawer */
function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('show');
    setHamburgerActive(false);
}

/** Animates hamburger button icon lines */
function setHamburgerActive(isActive) {
    [hamburgerBtn, sidebarToggleBtn].forEach(btn => {
        if (btn) btn.classList.toggle('active', isActive);
    });
}

hamburgerBtn.addEventListener('click', toggleSidebar);
if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', toggleSidebar);
sidebarBackdrop.addEventListener('click', closeSidebar);

navItems.forEach(item => {
    item.addEventListener('click', () => {
        switchTab(item.dataset.tab);
        if (isMobile()) closeSidebar();
    });
});

bottomNavItems.forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
});

fabAddTxn.addEventListener('click', () => {
    switchTab('insights');
    setTimeout(() => {
        if (txnFormCard) txnFormCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
});

// ============================================================================
// 6. THEME SYSTEM & TOAST NOTIFICATIONS
// ============================================================================

/**
 * Applies dark or light theme attribute on document root.
 * @param {string} theme - 'dark' | 'light'
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeToggle) themeToggle.checked = theme === 'dark';
    APP.theme = theme;
    saveState(APP);

    initCharts();
    updateCharts();
}

if (themeToggle) {
    themeToggle.addEventListener('change', () => {
        applyTheme(themeToggle.checked ? 'dark' : 'light');
    });
}

/**
 * Displays a toast notification message.
 * @param {string} message - Text message to show
 */
function showToast(message) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// ============================================================================
// 7. EMAIL OTP AUTHENTICATION ENGINE (With EmailJS Support)
// ============================================================================

let activeOtp = null;
let otpTargetEmail = '';
let resendTimerInterval = null;

/** Validates email string format */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Displays Email OTP login screen */
function showOtpScreen() {
    if (!otpLoginScreen) return;
    otpLoginScreen.style.display = 'flex';
    if (otpEmailStep) otpEmailStep.classList.remove('hidden-element');
    if (otpCodeStep) otpCodeStep.classList.add('hidden-element');
    if (otpError) otpError.textContent = '';
    clearOtpInputBoxes();
}

/** Clears all 6 OTP input box values */
function clearOtpInputBoxes() {
    if (!otpInputsContainer) return;
    const boxes = otpInputsContainer.querySelectorAll('.otp-input-box');
    boxes.forEach(box => { box.value = ''; box.classList.remove('error'); });
}

/** Gets combined string from the 6 OTP input boxes */
function getEnteredOtp() {
    if (!otpInputsContainer) return '';
    const boxes = otpInputsContainer.querySelectorAll('.otp-input-box');
    let code = '';
    boxes.forEach(b => code += b.value.trim());
    return code;
}

/** Starts 60-second countdown for Resend OTP link */
function startResendTimer() {
    if (!resendOtpBtn || !resendTimer) return;
    let secondsLeft = 60;
    resendOtpBtn.disabled = true;
    resendTimer.textContent = secondsLeft;

    if (resendTimerInterval) clearInterval(resendTimerInterval);

    resendTimerInterval = setInterval(() => {
        secondsLeft--;
        resendTimer.textContent = secondsLeft;
        if (secondsLeft <= 0) {
            clearInterval(resendTimerInterval);
            resendOtpBtn.disabled = false;
            resendOtpBtn.innerHTML = 'Resend OTP';
        }
    }, 1000);
}

/** Generates and dispatches a 6-digit OTP with on-screen display & email delivery */
function generateAndSendOtp(email) {
    activeOtp = String(Math.floor(100000 + Math.random() * 900000));
    otpTargetEmail = email;

    if (otpSentEmail) otpSentEmail.textContent = email;
    const otpDisplayCode = $('#otpDisplayCode');
    if (otpDisplayCode) otpDisplayCode.textContent = activeOtp;

    if (otpEmailStep) otpEmailStep.classList.add('hidden-element');
    if (otpCodeStep) otpCodeStep.classList.remove('hidden-element');
    if (otpError) otpError.textContent = '';

    clearOtpInputBoxes();
    const firstBox = otpInputsContainer ? otpInputsContainer.querySelector('.otp-input-box[data-index="0"]') : null;
    if (firstBox) firstBox.focus();

    startResendTimer();

    // Dispatch real email via FormSubmit AJAX endpoint (zero config required)
    fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            _subject: 'Your MoneyFlow OTP Login Code',
            message: `Your MoneyFlow login OTP is: ${activeOtp}. Enter this 6-digit code to log in.`
        })
    }).then(res => res.json()).then(data => {
        console.log('FormSubmit delivery status:', data);
    }).catch(err => {
        console.log('FormSubmit notice:', err);
    });

    // Also send via EmailJS if custom keys are configured in Settings
    const config = APP.emailJsConfig || {};
    const hasEmailJsKeys = config.serviceId && config.templateId && config.publicKey;

    if (typeof emailjs !== 'undefined' && hasEmailJsKeys) {
        emailjs.send(
            config.serviceId,
            config.templateId,
            {
                to_email: email,
                otp_code: activeOtp,
                pass_code: activeOtp,
                app_name: 'MoneyFlow'
            },
            config.publicKey
        ).catch(err => console.error('EmailJS send error:', err));
    }

    showToast(`✉️ Sending OTP to ${email}! Check inbox or use code above.`);
}

// Send OTP Button Click Handler
if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', () => {
        const email = otpEmailInput.value.trim();
        if (!email || !isValidEmail(email)) {
            showToast('Please enter a valid email address');
            otpEmailInput.focus();
            return;
        }
        generateAndSendOtp(email);
    });
}

// Resend OTP Button Click Handler
if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', () => {
        if (!otpTargetEmail) return;
        generateAndSendOtp(otpTargetEmail);
        showToast('Resending OTP...');
    });
}

// Change Email Link Handler
if (changeEmailBtn) {
    changeEmailBtn.addEventListener('click', () => {
        if (otpEmailStep) otpEmailStep.classList.remove('hidden-element');
        if (otpCodeStep) otpCodeStep.classList.add('hidden-element');
        if (resendTimerInterval) clearInterval(resendTimerInterval);
        if (otpEmailInput) otpEmailInput.focus();
    });
}

// Setup input navigation for 6 OTP boxes
if (otpInputsContainer) {
    const boxes = otpInputsContainer.querySelectorAll('.otp-input-box');
    boxes.forEach((box, index) => {
        box.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.length >= 1) {
                box.value = val.slice(-1);
                if (index < boxes.length - 1) {
                    boxes[index + 1].focus();
                }
            }
            if (getEnteredOtp().length === 6) {
                verifyUserOtp();
            }
        });

        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !box.value && index > 0) {
                boxes[index - 1].focus();
            }
        });

        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text').trim();
            if (/^\d{6}$/.test(pasted)) {
                pasted.split('').forEach((char, i) => {
                    if (boxes[i]) boxes[i].value = char;
                });
                verifyUserOtp();
            }
        });
    });
}

/** Verifies entered 6-digit OTP */
function verifyUserOtp() {
    const entered = getEnteredOtp();
    if (entered.length < 6) {
        if (otpError) otpError.textContent = 'Please enter all 6 digits of the OTP';
        return;
    }

    if (entered === activeOtp) {
        APP.userEmail = otpTargetEmail;
        APP.isLoggedIn = true;
        saveState(APP);

        if (otpLoginScreen) otpLoginScreen.style.display = 'none';
        initApp();
        showToast(`Welcome back, ${APP.userEmail}!`);
    } else {
        if (otpError) {
            otpError.textContent = 'Incorrect OTP code. Please check and try again.';
            otpError.classList.remove('shake');
            void otpError.offsetWidth;
            otpError.classList.add('shake');
        }
        if ("vibrate" in navigator) navigator.vibrate(100);
        clearOtpInputBoxes();
        const firstBox = otpInputsContainer.querySelector('.otp-input-box[data-index="0"]');
        if (firstBox) firstBox.focus();
    }
}

if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', verifyUserOtp);
}

// EmailJS Setup Modal Listeners
if (configEmailJsBtn) {
    configEmailJsBtn.addEventListener('click', () => {
        const config = APP.emailJsConfig || {};
        if (emailJsServiceId) emailJsServiceId.value = config.serviceId || '';
        if (emailJsTemplateId) emailJsTemplateId.value = config.templateId || '';
        if (emailJsPublicKey) emailJsPublicKey.value = config.publicKey || '';
        if (emailJsModal) emailJsModal.classList.add('show');
    });
}

if (saveEmailJsBtn) {
    saveEmailJsBtn.addEventListener('click', () => {
        const sId = emailJsServiceId.value.trim();
        const tId = emailJsTemplateId.value.trim();
        const pKey = emailJsPublicKey.value.trim();

        APP.emailJsConfig = { serviceId: sId, templateId: tId, publicKey: pKey };
        saveState(APP);

        if (pKey && typeof emailjs !== 'undefined') {
            emailjs.init(pKey);
        }

        if (emailJsModal) emailJsModal.classList.remove('show');
        showToast('EmailJS keys saved successfully!');
    });
}

if (cancelEmailJsBtn) {
    cancelEmailJsBtn.addEventListener('click', () => {
        if (emailJsModal) emailJsModal.classList.remove('show');
    });
}

// Net Balance Privacy Blur Toggle
let netBalanceRevealed = false;

function revealNetBalance() {
    if (totalNetBalanceEl) totalNetBalanceEl.classList.remove('net-balance-blurred');
    if (netBalanceEyeIcon) netBalanceEyeIcon.className = 'fas fa-eye';
    if (netBalanceUnlockBtn) netBalanceUnlockBtn.title = 'Tap to hide';
    netBalanceRevealed = true;
}

function hideNetBalance() {
    if (totalNetBalanceEl) totalNetBalanceEl.classList.add('net-balance-blurred');
    if (netBalanceEyeIcon) netBalanceEyeIcon.className = 'fas fa-eye-slash';
    if (netBalanceUnlockBtn) netBalanceUnlockBtn.title = 'Tap to reveal';
    netBalanceRevealed = false;
}

if (netBalanceUnlockBtn) {
    netBalanceUnlockBtn.addEventListener('click', () => {
        if (netBalanceRevealed) {
            hideNetBalance();
        } else {
            revealNetBalance();
        }
    });
}

// Logout Handler
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        APP.isLoggedIn = false;
        saveState(APP);
        hideNetBalance();
        showOtpScreen();
        showToast('Logged out successfully');
    });
}

// ============================================================================
// 8. FINANCIAL CALCULATIONS & ANIMATED COUNTERS
// ============================================================================

function animateCounter(el, target) {
    if (!el) return;
    const duration = 600;
    const start = performance.now();

    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(target * ease);
        el.textContent = '₹' + current.toLocaleString('en-IN');
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function animateSignedCounter(el, target) {
    if (!el) return;
    const duration = 600;
    const start = performance.now();
    const abs = Math.abs(target);
    const sign = target < 0 ? '-' : '';

    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = sign + '₹' + Math.round(abs * ease).toLocaleString('en-IN');
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function getFilteredTxns(monthIndex, year, showAll) {
    if (showAll) return APP.transactions;
    return APP.transactions.filter(t => {
        const d = new Date(t.date);
        return !Number.isNaN(d.getTime()) && d.getMonth() === monthIndex && d.getFullYear() === year;
    });
}

function computeTotals(txns) {
    let income = 0, expenses = 0, lent = 0, borrowed = 0;
    let savingsContrib = 0, emergencyContrib = 0;

    txns.forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        switch (t.type) {
            case 'income': income += amt; break;
            case 'expense': expenses += amt; break;
            case 'lent': lent += amt; break;
            case 'borrowed': borrowed += amt; break;
            case 'savings': savingsContrib += amt; break;
            case 'emergency': emergencyContrib += amt; break;
        }
    });

    return { income, expenses, lent, borrowed, savingsContrib, emergencyContrib };
}

function setRingProgress(ringEl, pctEl, current, target) {
    const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
    const offset = RING_CIRCUMFERENCE - (Math.max(pct, 0) / 100) * RING_CIRCUMFERENCE;
    if (ringEl) ringEl.style.strokeDashoffset = offset;
    if (pctEl) pctEl.textContent = Math.max(pct, 0) + '%';
}

function refreshDashboard() {
    const monthTxns = getFilteredTxns(dashMonthIndex, dashYear, dashShowAll);
    const monthTotals = computeTotals(monthTxns);
    const allTotals = computeTotals(APP.transactions);

    const yearTxns = dashShowAll
        ? APP.transactions
        : APP.transactions.filter(t => {
            const d = new Date(t.date);
            return !Number.isNaN(d.getTime()) && d.getFullYear() === dashYear;
        });
    const yearTotals = computeTotals(yearTxns);

    animateCounter(totalIncomeEl, monthTotals.income);
    animateCounter(totalExpensesEl, monthTotals.expenses);
    animateCounter(totalLentEl, yearTotals.lent);
    animateCounter(totalBorrowedEl, yearTotals.borrowed);

    const netBal = monthTotals.income - monthTotals.expenses
        - monthTotals.emergencyContrib - monthTotals.savingsContrib - monthTotals.lent;

    animateSignedCounter(totalNetBalanceEl, netBal);

    if (netBalanceCard) {
        netBalanceCard.style.borderColor = netBal >= 0 ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)';
        netBalanceCard.style.background = netBal >= 0
            ? 'linear-gradient(135deg, rgba(52,211,153,0.12), rgba(124,58,237,0.08))'
            : 'linear-gradient(135deg, rgba(248,113,113,0.12), rgba(124,58,237,0.08))';
    }
    if (totalNetBalanceEl) {
        totalNetBalanceEl.style.color = netBal >= 0 ? '#34d399' : '#f87171';
    }

    setRingProgress(savingsRing, savingsPctEl, allTotals.savingsContrib, SAVINGS_TARGET);
    setRingProgress(emergencyRing, emergencyPctEl, allTotals.emergencyContrib, EMERGENCY_TARGET);

    updateCharts();
}

// ============================================================================
// 9. VISUALIZATION ENGINE (Chart.js)
// ============================================================================

let incomeExpenseChart = null;
let categoryChart = null;

Chart.register({
    id: 'noDataOverlay',
    afterDraw(chart) {
        const datasets = chart.data.datasets;
        let hasData = false;
        if (datasets && datasets.length > 0) {
            hasData = datasets.some(ds => ds.data && ds.data.some(val => val > 0));
        }
        if (hasData) return;

        const { ctx, width, height } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx.fillStyle = isDark ? '#5a5e73' : '#9498b0';
        ctx.font = "400 13px 'Inter', sans-serif";
        ctx.fillText('No transaction data for this period', width / 2, height / 2);
        ctx.restore();
    }
});

function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        gridColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        textColor: isDark ? '#8b8fa3' : '#5c5f77',
        income: '#34d399',
        expense: '#f87171',
        emergency: '#f59e0b',
        categoryColors: [
            '#7c3aed', '#f87171', '#34d399', '#60a5fa',
            '#fbbf24', '#a78bfa', '#f472b6', '#14b8a6',
            '#fb923c', '#818cf8', '#e879f9'
        ]
    };
}

function initCharts() {
    const colors = getChartColors();
    const commonScaleOpts = {
        grid: { color: colors.gridColor, drawBorder: false },
        ticks: { color: colors.textColor, font: { family: "'Inter', sans-serif", size: 11 } }
    };

    if (incomeExpenseChart) incomeExpenseChart.destroy();
    if (categoryChart) categoryChart.destroy();

    const barCanvas = $('#incomeExpenseChart');
    if (barCanvas) {
        incomeExpenseChart = new Chart(barCanvas, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    { label: 'Income', data: [], backgroundColor: colors.income, borderRadius: 6 },
                    { label: 'Expenses', data: [], backgroundColor: colors.expense, borderRadius: 6 },
                    { label: 'Emergency Fund', data: [], backgroundColor: colors.emergency, borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: colors.textColor, font: { family: "'Inter', sans-serif" } } } },
                scales: { x: commonScaleOpts, y: { ...commonScaleOpts, beginAtZero: true } }
            }
        });
    }

    const doughnutCanvas = $('#categoryChart');
    if (doughnutCanvas) {
        categoryChart = new Chart(doughnutCanvas, {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: colors.categoryColors, borderWidth: 0, hoverOffset: 8 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: { legend: { position: 'bottom', labels: { color: colors.textColor, font: { family: "'Inter', sans-serif", size: 11 }, padding: 12 } } }
            }
        });
    }
}

function updateCharts() {
    if (!incomeExpenseChart || !categoryChart) return;
    const txns = getFilteredTxns(dashMonthIndex, dashYear, dashShowAll);

    const periodMap = {};
    txns.forEach(t => {
        const d = new Date(t.date);
        if (Number.isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!periodMap[key]) periodMap[key] = { income: 0, expense: 0, emergency: 0 };
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'income') periodMap[key].income += amt;
        if (t.type === 'expense') periodMap[key].expense += amt;
        if (t.type === 'emergency') periodMap[key].emergency += amt;
    });

    const sortedKeys = Object.keys(periodMap).sort();
    const labels = sortedKeys.map(k => {
        const [y, m] = k.split('-');
        return `${MONTH_SHORT[parseInt(m) - 1]} ${y}`;
    });

    incomeExpenseChart.data.labels = labels;
    incomeExpenseChart.data.datasets[0].data = sortedKeys.map(k => periodMap[k].income);
    incomeExpenseChart.data.datasets[1].data = sortedKeys.map(k => periodMap[k].expense);
    incomeExpenseChart.data.datasets[2].data = sortedKeys.map(k => periodMap[k].emergency);
    incomeExpenseChart.update();

    const catMap = {};
    txns.filter(t => t.type === 'expense').forEach(t => {
        const cat = t.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + (parseFloat(t.amount) || 0);
    });
    categoryChart.data.labels = Object.keys(catMap);
    categoryChart.data.datasets[0].data = Object.values(catMap);
    categoryChart.update();
}

// ============================================================================
// 10. TRANSACTION MANAGEMENT & CHIP SELECTORS
// ============================================================================

let selectedType = 'income';
let selectedCategory = 'Salary';

const CATEGORY_SETS = {
    income: ['Salary', 'Bonus', 'Custom...'],
    expense: ['Housing', 'Fuel', 'Food & Drinks', 'Credit Card', 'Travel', 'Utilities', 'Insurance', 'Healthcare', 'Education', 'Entertainment', 'Custom...'],
    savings: ['Savings Account', 'Post Office Account', 'Chits', 'Fixed Deposits', 'Gold Savings', 'Mutual Funds', 'Custom...'],
    emergency: ['Emergency Contribution', 'Custom...'],
    lent: ['Lent', 'Custom...'],
    borrowed: ['Borrowed', 'Custom...']
};

function setupChipGroup(container, callback) {
    if (!container) return;
    container.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            callback(chip.dataset.value);
        });
    });
}

function renderCategoryChips(type) {
    if (!txnCategoryChips) return;
    const cats = CATEGORY_SETS[type] || ['Custom...'];
    txnCategoryChips.innerHTML = cats.map((label, idx) => {
        const val = label.toLowerCase() === 'custom...' ? 'custom' : label;
        const activeClass = idx === 0 ? 'active' : '';
        return `<button type="button" class="chip ${activeClass}" data-value="${val}">${label}</button>`;
    }).join('');

    selectedCategory = cats[0] || 'custom';
    if (txnCustomCategoryGroup) {
        txnCustomCategoryGroup.style.display = selectedCategory === 'custom' ? 'flex' : 'none';
    }

    setupChipGroup(txnCategoryChips, val => {
        selectedCategory = val;
        if (txnCustomCategoryGroup) {
            txnCustomCategoryGroup.style.display = val === 'custom' ? 'flex' : 'none';
        }
    });
}

setupChipGroup(txnTypeChips, val => {
    selectedType = val;
    renderCategoryChips(selectedType);
});

if (txnTypeChips) renderCategoryChips(selectedType);

if (transactionForm) {
    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const amount = parseFloat(txnAmountInput.value);
        if (!amount || amount <= 0) {
            showToast('Please enter a valid amount greater than 0');
            txnAmountInput.focus();
            return;
        }
        if (!txnDateInput.value) {
            showToast('Please select a date');
            txnDateInput.focus();
            return;
        }

        const category = selectedCategory === 'custom'
            ? (txnCustomCategoryInput.value.trim() || 'Uncategorized')
            : selectedCategory;

        const txn = {
            id: generateUUID(),
            amount,
            type: selectedType,
            category,
            date: txnDateInput.value,
            notes: txnNotesInput.value.trim()
        };

        APP.transactions.unshift(txn);
        saveState(APP);

        transactionForm.reset();
        if (txnDateInput) txnDateInput.valueAsDate = new Date();
        if (txnCustomCategoryGroup) txnCustomCategoryGroup.style.display = 'none';

        if (txnTypeChips) {
            txnTypeChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            const incomeChip = txnTypeChips.querySelector('[data-value="income"]');
            if (incomeChip) incomeChip.classList.add('active');
        }
        selectedType = 'income';
        renderCategoryChips(selectedType);

        refreshInsights();
        refreshDashboard();
        showToast('Transaction added successfully!');
    });
}

let pendingDeleteId = null;

function deleteTxn(id) {
    pendingDeleteId = id;
    if (deleteTxnModal) deleteTxnModal.classList.add('show');
}

function deleteTransaction(id) {
    APP.transactions = APP.transactions.filter(t => t.id !== id);
    saveState(APP);
    refreshDashboard();
    refreshInsights();
    showToast('Transaction deleted');
}

if (confirmDeleteTxnBtn) {
    confirmDeleteTxnBtn.addEventListener('click', () => {
        if (pendingDeleteId) {
            deleteTransaction(pendingDeleteId);
            pendingDeleteId = null;
        }
        if (deleteTxnModal) deleteTxnModal.classList.remove('show');
    });
}

if (cancelDeleteTxnBtn) {
    cancelDeleteTxnBtn.addEventListener('click', () => {
        pendingDeleteId = null;
        if (deleteTxnModal) deleteTxnModal.classList.remove('show');
    });
}

window.deleteTxn = deleteTxn;

function renderTransactions(txns) {
    if (!txnTableBody) return;
    if (txns.length === 0) {
        txnTableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    const sorted = [...txns].sort((a, b) => new Date(b.date) - new Date(a.date));

    txnTableBody.innerHTML = sorted.map((t) => {
        const parts = (t.date || '').split('-').map(Number);
        let dateStr = t.date;
        if (parts.length === 3 && !parts.some(Number.isNaN)) {
            const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
            dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        const typeIcon = t.type === 'expense' ? `<img src="expense.png" class="btn-icon-tiny" alt=""> ` : '';

        return `
            <tr>
                <td data-label="Date">${dateStr}</td>
                <td data-label="Type">
                    <span class="txn-type-badge badge-${t.type}">
                        ${typeIcon}${t.type}
                    </span>
                </td>
                <td data-label="Category">${t.category}</td>
                <td data-label="Amount">₹${parseFloat(t.amount).toLocaleString('en-IN')}</td>
                <td data-label="Notes">${t.notes || '—'}</td>
                <td data-label="Actions" class="txn-actions">
                    <button class="btn-delete" onclick="deleteTxn('${t.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderCategoryAnalytics(txns) {
    if (!categoryBars) return;
    const catMap = {};
    txns.filter(t => t.type === 'expense').forEach(t => {
        const cat = t.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + (parseFloat(t.amount) || 0);
    });

    const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
        categoryBars.innerHTML = '<div class="category-empty"><i class="fas fa-tags"></i><p>No expense data for this period</p></div>';
        return;
    }

    const maxVal = entries[0][1];
    const highestCat = entries[0][0];

    categoryBars.innerHTML = entries.map(([cat, amt]) => {
        const pct = maxVal > 0 ? (amt / maxVal) * 100 : 0;
        const isHighest = cat === highestCat;
        return `
            <div class="cat-bar-row">
                <div class="cat-bar-header">
                    <span class="cat-bar-name ${isHighest ? 'highest' : ''}">${isHighest ? '🔥 ' : ''}${cat}</span>
                    <span class="cat-bar-amount">₹${amt.toLocaleString('en-IN')}</span>
                </div>
                <div class="cat-bar-track">
                    <div class="cat-bar-fill ${isHighest ? 'highest' : ''}" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function refreshInsights() {
    const filtered = getFilteredTxns(insightMonthIndex, insightYear, insightShowAll);
    const totals = computeTotals(filtered);

    if (insightsIncome) insightsIncome.textContent = '₹' + totals.income.toLocaleString('en-IN');
    if (insightsExpenses) insightsExpenses.textContent = '₹' + totals.expenses.toLocaleString('en-IN');
    if (insightsSavingsPct) insightsSavingsPct.textContent = (totals.income > 0 ? Math.round((totals.savingsContrib / totals.income) * 100) : 0) + '%';
    if (insightsEmergencyPct) insightsEmergencyPct.textContent = (totals.income > 0 ? Math.round((totals.emergencyContrib / totals.income) * 100) : 0) + '%';
    if (insightsLent) insightsLent.textContent = '₹' + totals.lent.toLocaleString('en-IN');
    if (insightsBorrowed) insightsBorrowed.textContent = '₹' + totals.borrowed.toLocaleString('en-IN');

    renderTransactions(filtered);
    renderCategoryAnalytics(filtered);
}

// ============================================================================
// 11. BANK STATEMENT IMPORT ENGINE (CSV / Excel)
// ============================================================================

let parsedTransactions = [];

function guessCategory(description) {
    if (!description) return 'Other';
    const lower = description.toLowerCase();

    if (lower.includes('salary') || lower.includes('payroll')) return 'Salary';
    if (lower.includes('rent') || lower.includes('housing')) return 'Housing';
    if (lower.includes('fuel') || lower.includes('petrol') || lower.includes('diesel')) return 'Fuel';
    if (lower.includes('swiggy') || lower.includes('zomato') || lower.includes('dine') || lower.includes('food')) return 'Food & Drinks';
    if (lower.includes('amazon') || lower.includes('flipkart') || lower.includes('shopping')) return 'Entertainment';
    if (lower.includes('electricity') || lower.includes('water') || lower.includes('internet') || lower.includes('wifi')) return 'Utilities';
    if (lower.includes('hospital') || lower.includes('pharmacy') || lower.includes('medical')) return 'Healthcare';
    return 'Other';
}

function parseCellDate(cellValue) {
    if (!cellValue) return new Date().toISOString().slice(0, 10);
    if (cellValue instanceof Date) return cellValue.toISOString().slice(0, 10);

    const str = String(cellValue).trim();
    const d = new Date(str);
    if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
}

function parseUploadedFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            let rows = [];
            if (file.name.endsWith('.csv')) {
                const text = e.target.result;
                rows = text.split('\n').map(r => r.split(','));
            } else {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            }

            parsedTransactions = rows.slice(1)
                .filter(r => r && r.length >= 2)
                .map(r => {
                    const parsedDate = parseCellDate(r[0]);
                    const description = String(r[1] || r[0] || 'Bank Import').trim();
                    const amountRaw = r[2] !== undefined ? r[2] : r[1];
                    const amount = parseFloat(String(amountRaw).replace(/[^0-9.]/g, '')) || 0;

                    return {
                        date: parsedDate,
                        description: description,
                        amount: amount,
                        type: 'expense',
                        category: guessCategory(description)
                    };
                })
                .filter(t => t.amount > 0);

            showParsedPreview();
        } catch (err) {
            console.error('File parsing failed:', err);
            showToast('Unable to parse file. Please upload a valid CSV or Excel statement.');
        }
    };

    if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
}

function showParsedPreview() {
    if (!parsedCount || !uploadPreview || !parsedTableBody) return;
    parsedCount.textContent = `(${parsedTransactions.length} found)`;
    uploadPreview.style.display = 'block';

    parsedTableBody.innerHTML = parsedTransactions.map((t) => {
        const typeIcon = t.type === 'expense' ? `<img src="expense.png" class="btn-icon-tiny" alt=""> ` : '';
        return `
            <tr>
                <td>${t.date}</td>
                <td>${t.description}</td>
                <td>₹${t.amount.toLocaleString('en-IN')}</td>
                <td>
                    <span class="txn-type-badge badge-${t.type}">
                        ${typeIcon}${t.type}
                    </span>
                </td>
                <td>${t.category}</td>
            </tr>
        `;
    }).join('');
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) parseUploadedFile(e.target.files[0]);
    });
}
if (uploadArea) {
    uploadArea.addEventListener('click', () => { if (fileInput) fileInput.click(); });
    uploadArea.addEventListener('dragover', (e) => e.preventDefault());
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            parseUploadedFile(e.dataTransfer.files[0]);
        }
    });
}

if (importParsedBtn) {
    importParsedBtn.addEventListener('click', () => {
        if (parsedTransactions.length === 0) return;
        const newTxns = parsedTransactions.map(t => ({
            id: generateUUID(),
            amount: t.amount,
            type: t.type,
            category: t.category,
            date: t.date,
            notes: t.description
        }));
        APP.transactions.push(...newTxns);
        saveState(APP);
        if (uploadPreview) uploadPreview.style.display = 'none';
        refreshInsights();
        refreshDashboard();
        showToast(`Successfully imported ${newTxns.length} transactions!`);
    });
}

if (cancelParsedBtn) {
    cancelParsedBtn.addEventListener('click', () => {
        if (uploadPreview) uploadPreview.style.display = 'none';
        parsedTransactions = [];
    });
}

// ============================================================================
// 12. EXPORT ENGINE (CSV & PDF)
// ============================================================================

let currentExportFormat = null;

if (exportCSVBtn) {
    exportCSVBtn.addEventListener('click', () => {
        if (APP.transactions.length === 0) {
            showToast('No transactions to export');
            return;
        }
        currentExportFormat = 'csv';
        if (exportModal) exportModal.classList.add('show');
    });
}

if (exportPDFBtn) {
    exportPDFBtn.addEventListener('click', () => {
        if (APP.transactions.length === 0) {
            showToast('No transactions to export');
            return;
        }
        currentExportFormat = 'pdf';
        if (exportModal) exportModal.classList.add('show');
    });
}

function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function getExportTransactions(query) {
    if (!query) return APP.transactions;
    const clean = query.trim().toLowerCase();
    return APP.transactions.filter(t => {
        const d = new Date(t.date);
        if (Number.isNaN(d.getTime())) return false;
        const monthName = MONTH_NAMES[d.getMonth()].toLowerCase();
        const monthShort = MONTH_SHORT[d.getMonth()].toLowerCase();
        const yearStr = String(d.getFullYear());
        return clean.includes(monthName) || clean.includes(monthShort) || clean.includes(yearStr);
    });
}

if (confirmExportBtn) {
    confirmExportBtn.addEventListener('click', () => {
        if (exportModal) exportModal.classList.remove('show');
        const query = exportMonthInput ? exportMonthInput.value.trim() : '';
        const txnsToExport = getExportTransactions(query);

        if (txnsToExport.length === 0) {
            showToast('No transactions matched the export filter');
            return;
        }

        if (currentExportFormat === 'csv') {
            const headers = ['Date', 'Type', 'Category', 'Amount (INR)', 'Notes'];
            const csvRows = [headers.join(',')];

            txnsToExport.forEach(t => {
                const escapedNotes = `"${(t.notes || '').replace(/"/g, '""')}"`;
                const escapedCat = `"${(t.category || '').replace(/"/g, '""')}"`;
                csvRows.push(`${t.date},${t.type},${escapedCat},${t.amount},${escapedNotes}`);
            });

            downloadFile(csvRows.join('\n'), `MoneyFlow_Transactions_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
            showToast('CSV export downloaded!');
        } else if (currentExportFormat === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            doc.setFontSize(18);
            doc.setTextColor(124, 58, 237);
            doc.text('MoneyFlow Finance Report', 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')} | Filter: ${query || 'All Period'}`, 14, 26);

            const totals = computeTotals(txnsToExport);
            doc.setFontSize(10);
            doc.setTextColor(40);
            doc.text(`Income: RS. ${totals.income.toLocaleString('en-IN')}  |  Expenses: RS. ${totals.expenses.toLocaleString('en-IN')}  |  Lent: RS. ${totals.lent.toLocaleString('en-IN')}  |  Borrowed: RS. ${totals.borrowed.toLocaleString('en-IN')}`, 14, 34);

            const tableBody = txnsToExport.map(t => [
                t.date,
                t.type.toUpperCase(),
                t.category,
                `Rs. ${parseFloat(t.amount).toLocaleString('en-IN')}`,
                t.notes || '-'
            ]);

            doc.autoTable({
                startY: 40,
                head: [['Date', 'Type', 'Category', 'Amount', 'Notes']],
                body: tableBody,
                theme: 'striped',
                headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255] },
                styles: { fontSize: 9, font: 'helvetica' }
            });

            doc.save(`MoneyFlow_Report_${Date.now()}.pdf`);
            showToast('PDF report downloaded!');
        }
    });
}

if (cancelExportBtn) {
    cancelExportBtn.addEventListener('click', () => {
        if (exportModal) exportModal.classList.remove('show');
    });
}

// ============================================================================
// 13. DATA DELETION ENGINE
// ============================================================================

if (clearDataBtn) {
    clearDataBtn.addEventListener('click', () => {
        if (confirmMonthInput) confirmMonthInput.value = '';
        if (confirmModal) confirmModal.classList.add('show');
    });
}

if (confirmClearBtn) {
    confirmClearBtn.addEventListener('click', () => {
        const code = confirmMonthInput ? confirmMonthInput.value.trim().toUpperCase() : '';

        if (code === 'CLEARALLDATANOW') {
            APP.transactions = [];
            saveState(APP);
            showToast('All transaction records have been erased');
        } else {
            const match = code.match(/^([A-Z]{3})DEL(\d{4})$/);
            if (!match) {
                showToast('Invalid delete code format. Use [MMM]DEL[YYYY] or CLEARALLDATANOW');
                return;
            }

            const monthStr = match[1];
            const year = parseInt(match[2]);
            const monthIndex = MONTH_SHORT.findIndex(m => m.toUpperCase() === monthStr);

            if (monthIndex === -1) {
                showToast('Invalid month code. Example: MARDEL2026');
                return;
            }

            const filtered = APP.transactions.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() !== monthIndex || d.getFullYear() !== year;
            });

            if (filtered.length === APP.transactions.length) {
                showToast(`No transaction records found for ${monthStr} ${year}`);
                return;
            }

            APP.transactions = filtered;
            saveState(APP);
            showToast(`Erased records for ${monthStr} ${year}`);
        }

        if (confirmModal) confirmModal.classList.remove('show');
        refreshDashboard();
        refreshInsights();
    });
}

if (cancelClearBtn) {
    cancelClearBtn.addEventListener('click', () => {
        if (confirmModal) confirmModal.classList.remove('show');
    });
}

const confirmMonthInputEl = document.getElementById('confirmMonthInput');
if (confirmMonthInputEl) {
    confirmMonthInputEl.addEventListener('input', function () {
        const pos = this.selectionStart;
        this.value = this.value.toUpperCase();
        this.setSelectionRange(pos, pos);
    });
}

// ============================================================================
// 14. APPLICATION INITIALIZATION
// ============================================================================

/** Initializes core components after Email OTP login */
async function initApp() {
    applyTheme(APP.theme || 'dark');
    if (txnDateInput) txnDateInput.valueAsDate = new Date();

    if (accountEmailEl) {
        accountEmailEl.textContent = APP.userEmail || 'user@example.com';
    }

    const config = APP.emailJsConfig || {};
    if (config.publicKey && typeof emailjs !== 'undefined') {
        try {
            emailjs.init(config.publicKey);
        } catch (e) {
            console.error('EmailJS init error:', e);
        }
    }

    updateMonthLabel(dashMonthLabel, dashMonthIndex, dashYear, dashShowAll);
    updateMonthLabel(insightMonthLabel, insightMonthIndex, insightYear, insightShowAll);

    switchTab(APP.activeTab || 'dashboard');
    refreshDashboard();
    refreshInsights();
}

// Initial Authentication Check
if (APP.isLoggedIn && APP.userEmail) {
    if (otpLoginScreen) otpLoginScreen.style.display = 'none';
    initApp();
} else {
    showOtpScreen();
}

// Unregister any active service worker from previous PWA installations
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
    });
}
