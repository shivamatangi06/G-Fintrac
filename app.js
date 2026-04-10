/* =========================================================
   FinanceFlow — Premium Personal Finance Tracker
   Vanilla JavaScript | localStorage | Chart.js
   ========================================================= */

// ===================== CONSTANTS =====================

/** Savings and Emergency targets (not editable in UI) */
const SAVINGS_TARGET = 500000;
const EMERGENCY_TARGET = 200000;

/** Default application state */
const DEFAULT_STATE = {
    transactions: [],
    theme: 'dark',
    activeTab: 'dashboard',
    pin: null
};

// ===================== SUPABASE SETUP =====================
const SUPA_URL = 'https://zgwazeqdlohgxseknzwz.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnd2F6ZXFkbG9oZ3hzZWtuend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDk5NDQsImV4cCI6MjA4ODEyNTk0NH0.KvkIsj0apW3MaJbBWJ94JvO6FBtKFbm5b-R_Y9aii9s';
const supabase = window.supabase ? window.supabase.createClient(SUPA_URL, SUPA_ANON) : null;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ===================== DATA LAYER =====================

function loadState() {
    try {
        const raw = localStorage.getItem('financeflow_data');
        if (raw) {
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_STATE, ...parsed };
        }
    } catch (e) {
        console.error('Failed to load state:', e);
    }
    return { ...DEFAULT_STATE };
}

function saveState(state) {
    try {
        localStorage.setItem('financeflow_data', JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save state:', e);
    }
}

let APP = loadState();

// ===================== CLOUD SYNC =====================

async function fetchRemoteTransactions() {
    if (!supabase) return;
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;

        APP.transactions = data || [];
        saveState(APP);
    } catch (e) {
        console.warn('Supabase fetch failed', e);
    }
}

async function upsertTransactionRemote(txn) {
    if (!supabase) return;
    try {
        const { error } = await supabase.from('transactions').upsert(txn);
        if (error) throw error;
    } catch (e) {
        console.warn('Supabase upsert failed', e);
        showToast('Saving to cloud failed (saved locally)');
    }
}

async function upsertTransactionsRemote(txns) {
    if (!supabase || !txns.length) return;
    try {
        const { error } = await supabase.from('transactions').upsert(txns);
        if (error) throw error;
    } catch (e) {
        console.warn('Supabase bulk upsert failed', e);
        showToast('Cloud sync unavailable (bulk save)');
    }
}

async function deleteTransactionRemote(id) {
    if (!supabase) return;
    try {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;
    } catch (e) {
        console.warn('Supabase delete failed', e);
        showToast('Cloud sync unavailable (delete)');
    }
}

async function deleteMonthRemote(monthIndex, year) {
    if (!supabase) return;
    try {
        const start = new Date(year, monthIndex, 1).toISOString().slice(0, 10);
        const end = new Date(year, monthIndex + 1, 0).toISOString().slice(0, 10);
        const { error } = await supabase
            .from('transactions')
            .delete()
            .gte('date', start)
            .lte('date', end);
        if (error) throw error;
    } catch (e) {
        console.warn('Supabase month delete failed', e);
        showToast('Cloud sync unavailable (month delete)');
    }
}

function subscribeRealtime() {
    if (!supabase) return;
    supabase
        .channel('transactions-listener')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, async () => {
            // Re-fetch transactions when changes occur from other devices
            await fetchRemoteTransactions();
            refreshDashboard();
            refreshInsights();
            showToast('Synced from another device');
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Realtime connected');
                updateSyncStatus(true);
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                updateSyncStatus(false);
            }
        });
}

function updateSyncStatus(connected) {
    const syncEl = document.getElementById('syncStatus');
    if (!syncEl) return;
    if (connected) {
        syncEl.innerHTML = '<i class="fas fa-cloud" style="color: var(--income-color);"></i><span>Synced</span>';
        syncEl.title = 'Real-time cloud sync is active';
    } else {
        syncEl.innerHTML = '<i class="fas fa-cloud" style="color: var(--text-muted); opacity:0.4;"></i><span>Offline</span>';
        syncEl.title = 'Cloud sync is not connected';
    }
}

// ===================== DOM REFERENCES =====================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Navigation
const navItems = $$('.nav-item');
const bottomNavItems = $$('.bottom-nav-item');
const tabContents = $$('.tab-content');

// Sidebar
const sidebar = $('#sidebar');
const sidebarBackdrop = $('#sidebarBackdrop');
const hamburgerBtn = $('#hamburgerBtn');
const sidebarToggleBtn = $('#sidebarToggleBtn');

// Dashboard
const totalIncomeEl = $('#totalIncome');
const totalExpensesEl = $('#totalExpenses');
const totalLentEl = $('#totalLent');
const totalBorrowedEl = $('#totalBorrowed');
const savingsRing = $('#savingsRing');
const savingsPctEl = $('#savingsPct');
const emergencyRing = $('#emergencyRing');
const emergencyPctEl = $('#emergencyPct');

// Dashboard Month Switcher
const dashMonthLabel = $('#dashMonthLabel');
const dashPrevMonth = $('#dashPrevMonth');
const dashNextMonth = $('#dashNextMonth');
const dashAllMonths = $('#dashAllMonths');

// Insights Month Switcher
const insightMonthLabel = $('#insightMonthLabel');
const insightPrevMonth = $('#insightPrevMonth');
const insightNextMonth = $('#insightNextMonth');

// Insights
const insightsIncome = $('#insightsIncome');
const insightsExpenses = $('#insightsExpenses');
const insightsSavingsPct = $('#insightsSavingsPct');
const insightsEmergencyPct = $('#insightsEmergencyPct');
const insightsLent = $('#insightsLent');
const insightsBorrowed = $('#insightsBorrowed');
const categoryBars = $('#categoryBars');
const transactionForm = $('#transactionForm');
const txnAmountInput = $('#txnAmount');
const txnDateInput = $('#txnDate');
const txnNotesInput = $('#txnNotes');
const txnCustomCategoryGroup = $('#customCategoryGroup');
const txnCustomCategoryInput = $('#txnCustomCategory');
const txnTableBody = $('#txnTableBody');
const emptyState = $('#emptyState');
const txnFormCard = $('#txnFormCard');

// Upload
const uploadArea = $('#uploadArea');
const fileInput = $('#fileInput');
const uploadPreview = $('#uploadPreview');
const parsedTableBody = $('#parsedTableBody');
const parsedCount = $('#parsedCount');
const importParsedBtn = $('#importParsedBtn');
const cancelParsedBtn = $('#cancelParsedBtn');

// Settings
const themeToggle = $('#themeToggle');
const exportCSVBtn = $('#exportCSV');
const exportPDFBtn = $('#exportPDF');
const clearDataBtn = $('#clearDataBtn');
const changePinBtn = $('#changePinBtn');
const confirmModal = $('#confirmModal');
const confirmClearBtn = $('#confirmClearBtn');
const cancelClearBtn = $('#cancelClearBtn');
const confirmMonthInput = $('#confirmMonthInput');

const exportModal = $('#exportModal');
const exportMonthInput = $('#exportMonthInput');
const confirmExportBtn = $('#confirmExportBtn');
const cancelExportBtn = $('#cancelExportBtn');
let currentExportFormat = null;

// FAB
const fabAddTxn = $('#fabAddTxn');

// Toast
const toast = $('#toast');
const toastMessage = $('#toastMessage');

// Chip selectors
const txnTypeChips = $('#txnTypeChips');
const txnCategoryChips = $('#txnCategoryChips');

// ===================== MONTH STATE =====================

let dashMonthIndex = new Date().getMonth();
let dashYear = new Date().getFullYear();
let dashShowAll = false;

let insightMonthIndex = dashMonthIndex;
let insightYear = dashYear;
let insightShowAll = false;

// ===================== NAVIGATION =====================

function switchTab(tabId) {
    navItems.forEach(item => item.classList.toggle('active', item.dataset.tab === tabId));
    bottomNavItems.forEach(item => item.classList.toggle('active', item.dataset.tab === tabId));
    tabContents.forEach(tc => tc.classList.toggle('active', tc.id === `tab-${tabId}`));

    APP.activeTab = tabId;
    saveState(APP);

    if (tabId === 'dashboard') refreshDashboard();
    if (tabId === 'insights') refreshInsights();
}

// ===================== SIDEBAR =====================

function isMobile() {
    return window.innerWidth <= 768;
}

function toggleSidebar() {
    if (isMobile()) {
        // Mobile: open/close slide
        const nowOpen = !sidebar.classList.contains('open');
        sidebar.classList.toggle('open', nowOpen);
        sidebarBackdrop.classList.toggle('show', nowOpen);
        setHamburgerActive(nowOpen);
    } else {
        // Desktop: collapse/expand
        const nowCollapsed = !sidebar.classList.contains('collapsed');
        sidebar.classList.toggle('collapsed', nowCollapsed);
        document.body.classList.toggle('sidebar-collapsed', nowCollapsed);
        setHamburgerActive(!nowCollapsed); // active (X) when expanded
    }
}

function closeMobileSidebar() {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('show');
    setHamburgerActive(false);
}

function setHamburgerActive(isActive) {
    [hamburgerBtn, sidebarToggleBtn].forEach(btn => {
        if (!btn) return;
        if (isActive) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

hamburgerBtn.addEventListener('click', toggleSidebar);
if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', toggleSidebar);
sidebarBackdrop.addEventListener('click', closeMobileSidebar);

navItems.forEach(item => {
    item.addEventListener('click', () => {
        switchTab(item.dataset.tab);
        if (isMobile()) closeMobileSidebar();
    });
});

bottomNavItems.forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
});

// ===================== THEME =====================

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.checked = theme === 'dark';
    APP.theme = theme;
    saveState(APP);

    initCharts();
    updateCharts();
}

themeToggle.addEventListener('change', () => {
    applyTheme(themeToggle.checked ? 'dark' : 'light');
});

// ===================== TOAST =====================

function showToast(msg) {
    toastMessage.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
}

// ===================== ANIMATED COUNTERS =====================

function animateCounter(el, target) {
    const duration = 700;
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

// ===================== MONTH SWITCHER =====================

function updateMonthLabel(labelEl, monthIndex, year, showAll) {
    if (showAll) {
        labelEl.textContent = 'All Months';
    } else {
        labelEl.textContent = `${MONTH_NAMES[monthIndex]} ${year}`;
    }
}

function changeMonth(direction, context) {
    if (context === 'dash') {
        dashShowAll = false;
        dashAllMonths.classList.remove('active');
        dashMonthIndex += direction;
        if (dashMonthIndex > 11) { dashMonthIndex = 0; dashYear++; }
        if (dashMonthIndex < 0) { dashMonthIndex = 11; dashYear--; }
        updateMonthLabel(dashMonthLabel, dashMonthIndex, dashYear, false);
        refreshDashboard();

        // keep insights in sync
        insightShowAll = false;
        insightMonthIndex = dashMonthIndex;
        insightYear = dashYear;
        updateMonthLabel(insightMonthLabel, insightMonthIndex, insightYear, false);
        refreshInsights();
    } else {
        insightShowAll = false;
        insightMonthIndex += direction;
        if (insightMonthIndex > 11) { insightMonthIndex = 0; insightYear++; }
        if (insightMonthIndex < 0) { insightMonthIndex = 11; insightYear--; }
        updateMonthLabel(insightMonthLabel, insightMonthIndex, insightYear, false);
        refreshInsights();

        // keep dashboard in sync
        dashShowAll = false;
        dashAllMonths.classList.remove('active');
        dashMonthIndex = insightMonthIndex;
        dashYear = insightYear;
        updateMonthLabel(dashMonthLabel, dashMonthIndex, dashYear, false);
        refreshDashboard();
    }
}

function toggleAllMonths() {
    dashShowAll = !dashShowAll;
    dashAllMonths.classList.toggle('active', dashShowAll);
    updateMonthLabel(dashMonthLabel, dashMonthIndex, dashYear, dashShowAll);
    refreshDashboard();
}

// Event listeners
dashPrevMonth.addEventListener('click', () => changeMonth(-1, 'dash'));
dashNextMonth.addEventListener('click', () => changeMonth(1, 'dash'));
dashAllMonths.addEventListener('click', toggleAllMonths);

insightPrevMonth.addEventListener('click', () => changeMonth(-1, 'insight'));
insightNextMonth.addEventListener('click', () => changeMonth(1, 'insight'));

// ===================== FILTER HELPERS =====================

function getFilteredTxns(monthIndex, year, showAll) {
    if (showAll) return APP.transactions;
    return APP.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === monthIndex && d.getFullYear() === year;
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

// ===================== PROGRESS RINGS =====================

const RING_CIRCUMFERENCE = 2 * Math.PI * 52; // ~326.73

function setRingProgress(ringEl, pctEl, currentEl, targetEl, current, target) {
    const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
    const offset = RING_CIRCUMFERENCE - (Math.max(pct, 0) / 100) * RING_CIRCUMFERENCE;
    if (ringEl) ringEl.style.strokeDashoffset = offset;
    if (pctEl) pctEl.textContent = Math.max(pct, 0) + '%';
    if (currentEl) currentEl.textContent = '₹' + Math.max(current, 0).toLocaleString('en-IN');
    if (targetEl) targetEl.textContent = '₹' + Math.max(target, 0).toLocaleString('en-IN');
}

// ===================== DASHBOARD =====================

function refreshDashboard() {
    const monthTxns = getFilteredTxns(dashMonthIndex, dashYear, dashShowAll);
    const monthTotals = computeTotals(monthTxns);

    // All-time totals (always computed for savings/emergency)
    const allTotals = computeTotals(APP.transactions);
    const emergencyTotal = APP.transactions.reduce((sum, t) => {
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'emergency' || t.category === 'Emergency Contribution') return sum + amt;
        return sum;
    }, 0);

    // Year-scope (or all months when "All Months" is active)
    const yearTxns = dashShowAll
        ? APP.transactions
        : APP.transactions.filter(t => {
            const d = new Date(t.date);
            return !Number.isNaN(d.getTime()) && d.getFullYear() === dashYear;
        });
    const yearTotals = computeTotals(yearTxns);

    // Income & expenses -> selected month only
    animateCounter(totalIncomeEl, monthTotals.income);
    animateCounter(totalExpensesEl, monthTotals.expenses);

    // Lent & borrowed -> entire year (or all months)
    animateCounter(totalLentEl, yearTotals.lent);
    animateCounter(totalBorrowedEl, yearTotals.borrowed);

    // Savings & Emergency: always show total accumulated across all months
    setRingProgress(savingsRing, savingsPctEl, null, null,
        allTotals.savingsContrib, SAVINGS_TARGET);

    setRingProgress(emergencyRing, emergencyPctEl, null, null,
        emergencyTotal, EMERGENCY_TARGET);

    updateCharts();
}

// ===================== CHARTS =====================

let incomeExpenseChart, categoryChart;

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

    incomeExpenseChart = new Chart($('#incomeExpenseChart'), {
        type: 'bar',
        data: {
            labels: [], datasets: [
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

    categoryChart = new Chart($('#categoryChart'), {
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

function updateCharts() {
    const txns = getFilteredTxns(dashMonthIndex, dashYear, dashShowAll);

    // Group by month
    const periodMap = {};
    txns.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!periodMap[key]) periodMap[key] = { income: 0, expense: 0, emergency: 0 };
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'income') periodMap[key].income += amt;
        if (t.type === 'expense') periodMap[key].expense += amt;
        if (t.type === 'emergency' || t.category === 'Emergency Contribution') periodMap[key].emergency += amt;
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

    // Category doughnut (expenses)
    const catMap = {};
    txns.filter(t => t.type === 'expense').forEach(t => {
        const cat = t.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + (parseFloat(t.amount) || 0);
    });
    categoryChart.data.labels = Object.keys(catMap);
    categoryChart.data.datasets[0].data = Object.values(catMap);
    categoryChart.update();

}

// ===================== CHIP SELECTORS =====================

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
    container.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            callback(chip.dataset.value);
        });
    });
}

function renderCategoryChips(type) {
    const cats = CATEGORY_SETS[type] || ['Custom...'];
    txnCategoryChips.innerHTML = cats.map((label, idx) => {
        const val = label.toLowerCase() === 'custom...' ? 'custom' : label;
        const activeClass = idx === 0 ? 'active' : '';
        return `<button type="button" class="chip ${activeClass}" data-value="${val}">${label}</button>`;
    }).join('');

    selectedCategory = cats[0] || 'custom';
    txnCustomCategoryGroup.style.display = selectedCategory === 'custom' ? 'flex' : 'none';

    setupChipGroup(txnCategoryChips, val => {
        selectedCategory = val;
        txnCustomCategoryGroup.style.display = val === 'custom' ? 'flex' : 'none';
    });
}

setupChipGroup(txnTypeChips, val => {
    selectedType = val;
    renderCategoryChips(selectedType);
});

renderCategoryChips(selectedType);

// ===================== INSIGHTS =====================

transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();

    let category = selectedCategory === 'custom'
        ? (txnCustomCategoryInput.value.trim() || 'Uncategorized')
        : selectedCategory;

    const txn = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        amount: parseFloat(txnAmountInput.value),
        type: selectedType,
        category,
        date: txnDateInput.value,
        notes: txnNotesInput.value.trim()
    };

    APP.transactions.push(txn);
    saveState(APP);
    // Non-blocking cloud sync — don't await
    upsertTransactionRemote(txn);

    transactionForm.reset();
    txnDateInput.valueAsDate = new Date();
    txnCustomCategoryGroup.style.display = 'none';

    // Reset chip selections
    txnTypeChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    txnTypeChips.querySelector('[data-value="income"]').classList.add('active');
    selectedType = 'income';
    renderCategoryChips(selectedType);

    refreshInsights();
    refreshDashboard();
    showToast('Transaction added!');
});

let pendingDeleteId = null;

const deleteTxnModal = $('#deleteTxnModal');
const confirmDeleteTxnBtn = $('#confirmDeleteTxnBtn');
const cancelDeleteTxnBtn = $('#cancelDeleteTxnBtn');

function deleteTxn(id) {
    pendingDeleteId = id;
    deleteTxnModal.classList.add('show');
}

confirmDeleteTxnBtn.addEventListener('click', () => {
    if (!pendingDeleteId) return;
    APP.transactions = APP.transactions.filter(t => t.id !== pendingDeleteId);
    saveState(APP);
    // Non-blocking cloud sync
    deleteTransactionRemote(pendingDeleteId);
    deleteTxnModal.classList.remove('show');
    pendingDeleteId = null;
    refreshInsights();
    refreshDashboard();
    showToast('Transaction deleted');
});

cancelDeleteTxnBtn.addEventListener('click', () => {
    pendingDeleteId = null;
    deleteTxnModal.classList.remove('show');
});

deleteTxnModal.addEventListener('click', (e) => {
    if (e.target === deleteTxnModal) {
        pendingDeleteId = null;
        deleteTxnModal.classList.remove('show');
    }
});

// Make deleteTxn accessible from inline onclick
window.deleteTxn = deleteTxn;

function renderTransactions(txns) {
    if (txns.length === 0) {
        txnTableBody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    const sorted = [...txns].sort((a, b) => new Date(b.date) - new Date(a.date));

    txnTableBody.innerHTML = sorted.map((t, i) => {
        const dateStr = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        return `
            <tr style="animation-delay: ${i * 0.03}s">
                <td data-label="Date">${dateStr}</td>
                <td data-label="Type"><span class="txn-type-badge badge-${t.type}">${t.type}</span></td>
                <td data-label="Category">${t.category}</td>
                <td data-label="Amount">₹${parseFloat(t.amount).toLocaleString('en-IN')}</td>
                <td data-label="Notes">${t.notes || '—'}</td>
                <td data-label="Actions" class="txn-actions"><button class="btn-delete" onclick="deleteTxn('${t.id}')" title="Delete"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
    }).join('');
}

function renderCategoryAnalytics(txns) {
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

    insightsIncome.textContent = '₹' + totals.income.toLocaleString('en-IN');
    insightsExpenses.textContent = '₹' + totals.expenses.toLocaleString('en-IN');
    insightsSavingsPct.textContent = (totals.income > 0 ? Math.round((totals.savingsContrib / totals.income) * 100) : 0) + '%';
    insightsEmergencyPct.textContent = (totals.income > 0 ? Math.round((totals.emergencyContrib / totals.income) * 100) : 0) + '%';
    insightsLent.textContent = '₹' + totals.lent.toLocaleString('en-IN');
    insightsBorrowed.textContent = '₹' + totals.borrowed.toLocaleString('en-IN');

    renderTransactions(filtered);
    renderCategoryAnalytics(filtered);
}

// ===================== FAB =====================

fabAddTxn.addEventListener('click', () => {
    switchTab('insights');
    // Scroll to form
    setTimeout(() => {
        txnFormCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
});

// ===================== BANK STATEMENT UPLOAD =====================

let parsedTransactions = [];

const CATEGORY_KEYWORDS = {
    'Housing': ['rent', 'landlord', 'housing', 'lease', 'mortgage', 'maintenance'],
    'Fuel': ['fuel', 'petrol', 'diesel', 'gas station'],
    'Food & Drinks': ['swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'pizza', 'burger', 'starbucks', 'dominos', 'mcdonald', 'kfc', 'dunkin'],
    'Credit Card': ['credit card', 'card payment', 'emi ', 'loan', 'bajaj', 'hdfc card', 'icici card', 'sbi card'],
    'Travel': ['uber', 'ola', 'rapido', 'irctc', 'railway', 'airline', 'flight', 'makemytrip', 'goibibo', 'redbus', 'travel', 'cab', 'metro'],
    'Utilities': ['electricity', 'electric', 'water', 'gas bill', 'internet', 'wifi', 'broadband', 'jio', 'airtel', 'vodafone', 'vi ', 'bsnl', 'bill', 'recharge', 'mobile'],
    'Insurance': ['insurance', 'premium'],
    'Healthcare': ['hospital', 'clinic', 'doctor', 'pharmacy', 'medicine', 'health'],
    'Education': ['school', 'college', 'university', 'tuition', 'course', 'udemy', 'coursera', 'byju'],
    'Entertainment': ['movie', 'netflix', 'spotify', 'prime', 'hotstar', 'concert', 'show'],
    'Savings Account': ['savings account', 'bank deposit'],
    'Post Office Account': ['post office', 'rd', 'nsop'],
    'Chits': ['chit fund', 'chit'],
    'Fixed Deposits': ['fd ', 'fixed deposit'],
    'Gold Savings': ['gold', 'sovereign gold bond'],
    'Mutual Funds': ['mutual fund', 'sip', 'mf ']
};

function guessCategory(description) {
    if (!description) return 'Other';
    const lower = description.toLowerCase();
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(kw => lower.includes(kw))) return cat;
    }
    return 'Other';
}

function parseUploadedFile(file) {
    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            let rows = [];

            if (file.name.endsWith('.csv')) {
                const text = e.target.result;
                const lines = text.split(/\r?\n/).filter(l => l.trim());
                rows = lines.map(line => {
                    const fields = [];
                    let field = '';
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const ch = line[i];
                        if (ch === '"') { inQuotes = !inQuotes; continue; }
                        if (ch === ',' && !inQuotes) { fields.push(field.trim()); field = ''; continue; }
                        field += ch;
                    }
                    fields.push(field.trim());
                    return fields;
                });
            } else {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            }

            if (rows.length < 2) {
                showToast('File appears to be empty');
                return;
            }

            const header = rows[0].map(h => String(h).toLowerCase().trim());
            let dateCol = header.findIndex(h => h.includes('date'));
            let amountCol = header.findIndex(h => h.includes('amount') || h.includes('value'));
            let creditCol = header.findIndex(h => h.includes('credit') || h.includes('deposit'));
            let debitCol = header.findIndex(h => h.includes('debit') || h.includes('withdrawal'));
            let descCol = header.findIndex(h => h.includes('desc') || h.includes('narr') || h.includes('particular') || h.includes('remark') || h.includes('detail'));

            if (dateCol === -1) dateCol = 0;
            if (descCol === -1) descCol = header.findIndex((_, i) => i !== dateCol && i !== amountCol && i !== creditCol && i !== debitCol);
            if (descCol === -1) descCol = 1;

            parsedTransactions = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 2) continue;

                let amount = 0;
                let type = 'expense';

                if (creditCol !== -1 && debitCol !== -1) {
                    const credit = parseFloat(String(row[creditCol]).replace(/[^0-9.]/g, '')) || 0;
                    const debit = parseFloat(String(row[debitCol]).replace(/[^0-9.]/g, '')) || 0;
                    if (credit > 0) { amount = credit; type = 'income'; }
                    else { amount = debit; type = 'expense'; }
                } else if (amountCol !== -1) {
                    amount = parseFloat(String(row[amountCol]).replace(/[^0-9.-]/g, '')) || 0;
                    if (amount < 0) { type = 'expense'; amount = Math.abs(amount); }
                    else { type = 'income'; }
                } else {
                    for (let c = 0; c < row.length; c++) {
                        if (c === dateCol || c === descCol) continue;
                        const v = parseFloat(String(row[c]).replace(/[^0-9.-]/g, ''));
                        if (!isNaN(v) && v !== 0) {
                            amount = Math.abs(v);
                            type = v < 0 ? 'expense' : 'income';
                            break;
                        }
                    }
                }

                if (amount === 0) continue;

                let dateStr = '';
                try {
                    const d = new Date(row[dateCol]);
                    if (!isNaN(d.getTime())) dateStr = d.toISOString().slice(0, 10);
                } catch (_) { }
                if (!dateStr) dateStr = new Date().toISOString().slice(0, 10);

                const desc = String(row[descCol] || '');
                const category = guessCategory(desc);

                parsedTransactions.push({ date: dateStr, description: desc, amount, type, category });
            }

            if (parsedTransactions.length === 0) {
                showToast('No transactions found');
                return;
            }

            showParsedPreview();
        } catch (err) {
            console.error('Parse error:', err);
            showToast('Error parsing file');
        }
    };

    if (file.name.endsWith('.csv')) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
}

function showParsedPreview() {
    parsedCount.textContent = `(${parsedTransactions.length} found)`;
    uploadPreview.style.display = 'block';

    const cats = Object.keys(CATEGORY_KEYWORDS).concat([
        'Salary', 'Bonus',
        'Savings Account', 'Post Office Account', 'Chits', 'Fixed Deposits', 'Gold Savings', 'Mutual Funds',
        'Emergency Contribution',
        'Other', 'Custom...'
    ]);

    parsedTableBody.innerHTML = parsedTransactions.map((t, i) => `
        <tr>
            <td>${new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            <td>${t.description || '—'}</td>
            <td>₹${t.amount.toLocaleString('en-IN')}</td>
            <td><span class="txn-type-badge badge-${t.type}">${t.type}</span></td>
            <td>
                <select class="category-select" data-index="${i}">
                    ${cats.map(c => `<option value="${c}" ${c === t.category ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </td>
        </tr>
    `).join('');

    parsedTableBody.querySelectorAll('.category-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
            parsedTransactions[parseInt(e.target.dataset.index)].category = e.target.value;
        });
    });
}

fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) parseUploadedFile(e.target.files[0]);
});

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) parseUploadedFile(e.dataTransfer.files[0]);
});

importParsedBtn.addEventListener('click', async () => {
    const count = parsedTransactions.length;
    const newTxns = parsedTransactions.map(t => ({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        amount: t.amount,
        type: t.type,
        category: t.category,
        date: t.date,
        notes: t.description || ''
    }));

    APP.transactions.push(...newTxns);
    await upsertTransactionsRemote(newTxns);

    saveState(APP);
    parsedTransactions = [];
    uploadPreview.style.display = 'none';
    fileInput.value = '';
    refreshInsights();
    refreshDashboard();
    showToast(`${count} transactions imported!`);
});

cancelParsedBtn.addEventListener('click', () => {
    parsedTransactions = [];
    uploadPreview.style.display = 'none';
    fileInput.value = '';
});

// ===================== SETTINGS =====================

exportCSVBtn.addEventListener('click', () => {
    if (APP.transactions.length === 0) { showToast('No data to export'); return; }
    currentExportFormat = 'csv';
    exportMonthInput.value = '';
    exportModal.classList.add('show');
});

exportPDFBtn.addEventListener('click', () => {
    if (APP.transactions.length === 0) { showToast('No data to export'); return; }
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('PDF export library not ready');
        return;
    }
    currentExportFormat = 'pdf';
    exportMonthInput.value = '';
    exportModal.classList.add('show');
});

function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

clearDataBtn.addEventListener('click', () => {
    confirmMonthInput.value = '';
    confirmModal.classList.add('show');
});

function parseMonthInput(value) {
    if (!value) return null;
    const parts = value.trim().split(/\s+/);
    const monthStr = parts[0].slice(0, 3).toLowerCase();
    const monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase().startsWith(monthStr));
    if (monthIndex === -1) return null;
    const year = parts[1] ? parseInt(parts[1], 10) : null;
    if (parts[1] && Number.isNaN(year)) return null;
    return { monthIndex, year };
}

confirmClearBtn.addEventListener('click', async () => {
    const parsed = parseMonthInput(confirmMonthInput.value);
    if (!parsed) { showToast('Enter a valid month and year'); return; }

    const before = APP.transactions.length;
    APP.transactions = APP.transactions.filter(t => {
        const d = new Date(t.date);
        if (Number.isNaN(d.getTime())) return true;
        const sameMonth = d.getMonth() === parsed.monthIndex;
        const sameYear = parsed.year ? d.getFullYear() === parsed.year : true;
        return !(sameMonth && sameYear);
    });

    const removed = before - APP.transactions.length;
    saveState(APP);
    await deleteMonthRemote(parsed.monthIndex, parsed.year || new Date().getFullYear());

    confirmModal.classList.remove('show');
    refreshDashboard();
    refreshInsights();
    showToast(removed > 0
        ? `Deleted ${removed} transaction${removed > 1 ? 's' : ''} from ${MONTH_NAMES[parsed.monthIndex].slice(0, 3)}${parsed.year ? ' ' + parsed.year : ''}`
        : 'No transactions found for that month');
});

cancelClearBtn.addEventListener('click', () => confirmModal.classList.remove('show'));
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) confirmModal.classList.remove('show');
});

confirmExportBtn.addEventListener('click', () => {
    let txnsToExport = APP.transactions;
    const val = exportMonthInput.value;
    
    if (val.trim() !== '') {
        const parsed = parseMonthInput(val);
        if (!parsed) { showToast('Enter a valid month and year'); return; }
        
        txnsToExport = APP.transactions.filter(t => {
            const d = new Date(t.date);
            if (Number.isNaN(d.getTime())) return false;
            const sameMonth = d.getMonth() === parsed.monthIndex;
            const sameYear = parsed.year ? d.getFullYear() === parsed.year : true;
            return sameMonth && sameYear;
        });
        
        if (txnsToExport.length === 0) {
            showToast('No transactions found for that month');
            exportModal.classList.remove('show');
            return;
        }
    }
    
    exportModal.classList.remove('show');
    
    if (currentExportFormat === 'csv') {
        const headers = ['Date', 'Type', 'Category', 'Amount', 'Notes'];
        const rows = txnsToExport.map(t =>
            [t.date, t.type, t.category, t.amount, `"${(t.notes || '').replace(/"/g, '""')}"`].join(',')
        );
        const filename = getExportFilename('csv', exportMonthInput.value);
        downloadFile([headers.join(','), ...rows].join('\n'), filename, 'text/csv');
        showToast('CSV exported!');
    } else if (currentExportFormat === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('G-Finrac Transactions', 14, 22);

        const headers = [['Date', 'Type', 'Category', 'Amount', 'Notes']];
        const data = txnsToExport.map(t => [
            new Date(t.date).toLocaleDateString('en-IN'),
            t.type,
            t.category,
            `Rs. ${t.amount.toLocaleString('en-IN')}`,
            t.notes || ''
        ]);

        doc.autoTable({
            startY: 30,
            head: headers,
            body: data,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255 }
        });

        doc.save(getExportFilename('pdf', exportMonthInput.value));
        showToast('PDF exported!');
    }
});

cancelExportBtn.addEventListener('click', () => exportModal.classList.remove('show'));
exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) exportModal.classList.remove('show');
});

// ===================== EXPORT FILENAME HELPER =====================

function getExportFilename(ext, monthInputVal) {
    const parsed = parseMonthInput(monthInputVal);
    if (parsed) {
        const monthName = MONTH_NAMES[parsed.monthIndex];
        const year = parsed.year || new Date().getFullYear();
        return `${monthName}_${year}_Transactions.${ext}`;
    }
    return `All_Transactions.${ext}`;
}



// ===================== PIN LOCK SYSTEM =====================

const pinLockScreen = document.getElementById('pinLockScreen');
const pinDots = document.getElementById('pinDots');
const pinKeypad = document.getElementById('pinKeypad');
const pinError = document.getElementById('pinError');
const pinSetupSection = document.getElementById('pinSetupSection');
const pinSetupMsg = document.getElementById('pinSetupMsg');

let pinEntry = '';
let pinMode = 'unlock'; // 'unlock', 'setup', 'confirm'
let pinSetupValue = '';

async function initPinSystem() {
    pinMode = 'unlock';
    pinSetupSection.style.display = 'none';
    document.querySelector('.pin-lock-subtitle').textContent = 'Enter your 4-digit PIN to continue';
    pinLockScreen.style.display = 'flex';
    pinEntry = '';
    updatePinDots();
}

function updatePinDots() {
    const dots = pinDots.querySelectorAll('.pin-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('filled', i < pinEntry.length);
    });
}

function handlePinKey(key) {
    pinError.textContent = '';
    pinError.classList.remove('shake');

    if (key === 'delete') {
        pinEntry = pinEntry.slice(0, -1);
        updatePinDots();
        return;
    }

    if (pinEntry.length >= 4) return;
    pinEntry += key;
    updatePinDots();

    if (pinEntry.length === 4) {
        setTimeout(() => processPin(), 200);
    }
}

async function processPin() {
    if (pinMode === 'unlock') {
        const hardcodedPin = '5432';
        if (pinEntry === hardcodedPin) {
            pinLockScreen.style.display = 'none';
            initApp();
        } else {
            pinError.textContent = 'Incorrect PIN';
            pinError.classList.add('shake');
            pinEntry = '';
            updatePinDots();
            // Shake the dots
            pinDots.classList.add('shake');
            setTimeout(() => pinDots.classList.remove('shake'), 500);
        }
    }
}

// Keypad click handler
pinKeypad.addEventListener('click', (e) => {
    const btn = e.target.closest('.pin-key');
    if (!btn || btn.classList.contains('pin-key-empty')) return;
    handlePinKey(btn.dataset.key);
});

// Keyboard support for PIN
document.addEventListener('keydown', (e) => {
    if (pinLockScreen.style.display === 'none') return;
    if (e.key >= '0' && e.key <= '9') handlePinKey(e.key);
    if (e.key === 'Backspace') handlePinKey('delete');
});

// ===================== INITIALIZATION =====================

async function initApp() {
    applyTheme(APP.theme || 'dark');
    txnDateInput.valueAsDate = new Date();
    setHamburgerActive(!sidebar.classList.contains('collapsed') && sidebar.classList.contains('open'));

    // Set initial month labels
    updateMonthLabel(dashMonthLabel, dashMonthIndex, dashYear, dashShowAll);
    updateMonthLabel(insightMonthLabel, insightMonthIndex, insightYear, insightShowAll);

    // Highlight "All Months" button if dashShowAll is true by default
    if (dashShowAll) {
        dashAllMonths.classList.add('active');
    }

    await fetchRemoteTransactions();
    subscribeRealtime();

    // Restore last active tab
    switchTab(APP.activeTab || 'dashboard');
}

// Start with PIN check
initPinSystem();
