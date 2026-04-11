/* =========================================================
   G-Fintrac — Premium Personal Finance Tracker
   Vanilla JavaScript | localStorage | PWA Ready
   ========================================================= */

// ===================== CONSTANTS =====================

/** Savings and Emergency targets (not editable in UI) */
const SAVINGS_TARGET = 500000;
const EMERGENCY_TARGET = 200000;

/** Default application state */
const DEFAULT_STATE = {
    transactions: [],
    theme: 'dark',
    activeTab: 'dashboard'
};

const LOCAL_STORAGE_KEY = 'gfintrac_state';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ===================== DATA LAYER =====================

function saveState(state) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Save state failed:', e);
    }
}

function loadState() {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Load state failed:', e);
            return { ...DEFAULT_STATE };
        }
    }
    return { ...DEFAULT_STATE };
}

let APP = loadState();

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
const totalNetBalanceEl = $('#totalNetBalance');
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
const insightAllMonths = $('#insightAllMonths');

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
        const nowOpen = !sidebar.classList.contains('open');
        sidebar.classList.toggle('open', nowOpen);
        sidebarBackdrop.classList.toggle('show', nowOpen);
        setHamburgerActive(nowOpen);
    } else {
        const nowCollapsed = !sidebar.classList.contains('collapsed');
        sidebar.classList.toggle('collapsed', nowCollapsed);
        document.body.classList.toggle('sidebar-collapsed', nowCollapsed);
        setHamburgerActive(!nowCollapsed);
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

function animateSignedCounter(el, target) {
    const duration = 700;
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

// ===================== MONTH SWITCHER =====================

function updateMonthLabel(labelEl, monthIndex, year, showAll) {
    if (!labelEl) return;
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

        insightShowAll = false;
        insightMonthIndex = dashMonthIndex;
        insightYear = dashYear;
        updateMonthLabel(insightMonthLabel, insightMonthIndex, insightYear, false);
        refreshInsights();
    } else {
        insightShowAll = false;
        if (insightAllMonths) insightAllMonths.classList.remove('active');
        insightMonthIndex += direction;
        if (insightMonthIndex > 11) { insightMonthIndex = 0; insightYear++; }
        if (insightMonthIndex < 0) { insightMonthIndex = 11; insightYear--; }
        updateMonthLabel(insightMonthLabel, insightMonthIndex, insightYear, false);
        refreshInsights();

        dashShowAll = false;
        dashAllMonths.classList.remove('active');
        dashMonthIndex = insightMonthIndex;
        dashYear = insightYear;
        updateMonthLabel(dashMonthLabel, dashMonthIndex, dashYear, false);
        refreshDashboard();
    }
}

dashPrevMonth.addEventListener('click', () => changeMonth(-1, 'dash'));
dashNextMonth.addEventListener('click', () => changeMonth(1, 'dash'));
dashAllMonths.addEventListener('click', () => {
    dashShowAll = !dashShowAll;
    dashAllMonths.classList.toggle('active', dashShowAll);
    updateMonthLabel(dashMonthLabel, dashMonthIndex, dashYear, dashShowAll);
    refreshDashboard();
    
    // Sync insights
    insightShowAll = dashShowAll;
    if (insightAllMonths) insightAllMonths.classList.toggle('active', insightShowAll);
    updateMonthLabel(insightMonthLabel, insightMonthIndex, insightYear, insightShowAll);
    refreshInsights();
});

insightPrevMonth.addEventListener('click', () => changeMonth(-1, 'insight'));
insightNextMonth.addEventListener('click', () => changeMonth(1, 'insight'));
if (insightAllMonths) {
    insightAllMonths.addEventListener('click', () => {
        insightShowAll = !insightShowAll;
        insightAllMonths.classList.toggle('active', insightShowAll);
        updateMonthLabel(insightMonthLabel, insightMonthIndex, insightYear, insightShowAll);
        refreshInsights();
        
        // Sync dashboard
        dashShowAll = insightShowAll;
        dashAllMonths.classList.toggle('active', dashShowAll);
        updateMonthLabel(dashMonthLabel, dashMonthIndex, dashYear, dashShowAll);
        refreshDashboard();
    });
}

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

const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

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

    if (totalNetBalanceEl) {
        const netBal = monthTotals.income - monthTotals.expenses
            - monthTotals.emergencyContrib - monthTotals.lent;
        totalNetBalanceEl.classList.remove('income-color', 'expense-color');
        totalNetBalanceEl.classList.add(netBal >= 0 ? 'income-color' : 'expense-color');
        animateSignedCounter(totalNetBalanceEl, netBal);
    }

    setRingProgress(savingsRing, savingsPctEl, null, null,
        allTotals.savingsContrib, SAVINGS_TARGET);

    setRingProgress(emergencyRing, emergencyPctEl, null, null,
        allTotals.emergencyContrib, EMERGENCY_TARGET);

    updateCharts();
}

// ===================== CHARTS =====================

let incomeExpenseChart, categoryChart;

Chart.register({
    id: 'noDataOverlay',
    afterDraw(chart) {
        const hasData = chart.data.labels && chart.data.labels.length > 0;
        if (hasData) return;
        const { ctx, width, height } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx.fillStyle = isDark ? '#5a5e73' : '#9498b0';
        ctx.font = "400 13px 'Inter', sans-serif";
        ctx.fillText('No data for this period', width / 2, height / 2);
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
    if (!incomeExpenseChart || !categoryChart) return;
    const txns = getFilteredTxns(dashMonthIndex, dashYear, dashShowAll);

    const periodMap = {};
    txns.forEach(t => {
        const d = new Date(t.date);
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

if (txnTypeChips) renderCategoryChips(selectedType);

// ===================== FORM HANDLING =====================

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

    let category = selectedCategory === 'custom'
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
    txnDateInput.valueAsDate = new Date();
    txnCustomCategoryGroup.style.display = 'none';

    txnTypeChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    txnTypeChips.querySelector('[data-value="income"]').classList.add('active');
    selectedType = 'income';
    renderCategoryChips(selectedType);

    refreshInsights();
    refreshDashboard();
    showToast('Transaction added successfully!');
});

let pendingDeleteId = null;
const deleteTxnModal = $('#deleteTxnModal');
const confirmDeleteTxnBtn = $('#confirmDeleteTxnBtn');
const cancelDeleteTxnBtn = $('#cancelDeleteTxnBtn');

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
        if (!pendingDeleteId) return;
        deleteTransaction(pendingDeleteId);
        deleteTxnModal.classList.remove('show');
        pendingDeleteId = null;
    });
}

if (cancelDeleteTxnBtn) {
    cancelDeleteTxnBtn.addEventListener('click', () => {
        pendingDeleteId = null;
        deleteTxnModal.classList.remove('show');
    });
}

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
        const [y, m, d] = (t.date || '').split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

    if (insightsIncome) insightsIncome.textContent = '₹' + totals.income.toLocaleString('en-IN');
    if (insightsExpenses) insightsExpenses.textContent = '₹' + totals.expenses.toLocaleString('en-IN');
    if (insightsSavingsPct) insightsSavingsPct.textContent = (totals.income > 0 ? Math.round((totals.savingsContrib / totals.income) * 100) : 0) + '%';
    if (insightsEmergencyPct) insightsEmergencyPct.textContent = (totals.income > 0 ? Math.round((totals.emergencyContrib / totals.income) * 100) : 0) + '%';
    if (insightsLent) insightsLent.textContent = '₹' + totals.lent.toLocaleString('en-IN');
    if (insightsBorrowed) insightsBorrowed.textContent = '₹' + totals.borrowed.toLocaleString('en-IN');

    renderTransactions(filtered);
    renderCategoryAnalytics(filtered);
}

// ===================== FAB =====================

fabAddTxn.addEventListener('click', () => {
    switchTab('insights');
    setTimeout(() => {
        txnFormCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
});

// ===================== UPLOAD & SETTINGS =====================

let parsedTransactions = [];

function guessCategory(description) {
    if (!description) return 'Other';
    const lower = description.toLowerCase();
    // Simplified guess logic
    if (lower.includes('salary')) return 'Salary';
    if (lower.includes('rent')) return 'Housing';
    if (lower.includes('fuel')) return 'Fuel';
    if (lower.includes('swiggy') || lower.includes('zomato')) return 'Food & Drinks';
    return 'Other';
}

function parseUploadedFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
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
            // Simple generic parser
            parsedTransactions = rows.slice(1).filter(r => r.length > 2).map(r => ({
                date: new Date().toISOString().slice(0, 10),
                description: String(r[1] || ''),
                amount: parseFloat(String(r[2]).replace(/[^0-9.]/g, '')) || 0,
                type: 'expense',
                category: guessCategory(String(r[1]))
            }));
            showParsedPreview();
        } catch(err) { showToast('Parse error'); }
    };
    if (file.name.endsWith('.csv')) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
}

function showParsedPreview() {
    parsedCount.textContent = `(${parsedTransactions.length} found)`;
    uploadPreview.style.display = 'block';
    parsedTableBody.innerHTML = parsedTransactions.map((t, i) => `
        <tr>
            <td>${t.date}</td>
            <td>${t.description}</td>
            <td>₹${t.amount}</td>
            <td>${t.type}</td>
            <td>${t.category}</td>
        </tr>
    `).join('');
}

fileInput.addEventListener('change', (e) => { if (e.target.files[0]) parseUploadedFile(e.target.files[0]); });
uploadArea.addEventListener('click', () => fileInput.click());

importParsedBtn.addEventListener('click', () => {
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
    uploadPreview.style.display = 'none';
    refreshInsights(); refreshDashboard();
    showToast('Imported successfully!');
});

cancelParsedBtn.addEventListener('click', () => { uploadPreview.style.display = 'none'; });

// ===================== EXPORT & CLEAR =====================

exportCSVBtn.addEventListener('click', () => {
    if (APP.transactions.length === 0) return;
    currentExportFormat = 'csv';
    exportModal.classList.add('show');
});

exportPDFBtn.addEventListener('click', () => {
    if (APP.transactions.length === 0) return;
    currentExportFormat = 'pdf';
    exportModal.classList.add('show');
});

function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
}

confirmExportBtn.addEventListener('click', () => {
    exportModal.classList.remove('show');
    if (currentExportFormat === 'csv') {
        const csv = APP.transactions.map(t => `${t.date},${t.type},${t.category},${t.amount}`).join('\n');
        downloadFile(csv, 'Transactions.csv', 'text/csv');
    } else {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text('Transactions', 10, 10);
        doc.save('Transactions.pdf');
    }
});

cancelExportBtn.addEventListener('click', () => exportModal.classList.remove('show'));

clearDataBtn.addEventListener('click', () => confirmModal.classList.add('show'));
confirmClearBtn.addEventListener('click', () => {
    const val = confirmMonthInput.value.trim();
    if (!val) {
        APP.transactions = [];
        saveState(APP);
        showToast('All data cleared');
    } else {
        APP.transactions = APP.transactions.filter(t => {
            const d = new Date(t.date);
            const m = d.toLocaleString('default', { month: 'long' });
            return m.toLowerCase() !== val.toLowerCase();
        });
        saveState(APP);
        showToast(`Cleared ${val}`);
    }
    confirmModal.classList.remove('show');
    refreshDashboard(); refreshInsights();
});
cancelClearBtn.addEventListener('click', () => confirmModal.classList.remove('show'));

// ===================== PIN LOCK SYSTEM =====================

const pinLockScreen = document.getElementById('pinLockScreen');
const pinDots = document.getElementById('pinDots');
const pinKeypad = document.getElementById('pinKeypad');
const pinError = document.getElementById('pinError');
const pinSetupSection = document.getElementById('pinSetupSection');

let pinEntry = '';

function initPinSystem() {
    if (pinSetupSection) pinSetupSection.style.display = 'none';
    pinLockScreen.style.display = 'flex';
    pinEntry = '';
    updatePinDots();
}

function updatePinDots() {
    if (!pinDots) return;
    const dots = pinDots.querySelectorAll('.pin-dot');
    dots.forEach((dot, i) => dot.classList.toggle('filled', i < pinEntry.length));
}

function handlePinKey(key) {
    if (key === 'delete') {
        pinEntry = pinEntry.slice(0, -1);
    } else {
        if (pinEntry.length < 4) pinEntry += key;
    }
    updatePinDots();
    if (pinEntry.length === 4) {
        setTimeout(() => {
            if (pinEntry === '5432') {
                pinLockScreen.style.display = 'none';
                initApp();
            } else {
                if (pinError) {
                    pinError.textContent = 'Incorrect PIN';
                    pinError.classList.add('shake');
                }
                pinEntry = '';
                updatePinDots();
            }
        }, 200);
    }
}

if (pinKeypad) {
    pinKeypad.addEventListener('click', (e) => {
        const btn = e.target.closest('.pin-key');
        if (btn && btn.dataset.key) handlePinKey(btn.dataset.key);
    });
}

document.addEventListener('keydown', (e) => {
    if (pinLockScreen.style.display !== 'none') {
        if (e.key >= '0' && e.key <= '9') handlePinKey(e.key);
        if (e.key === 'Backspace') handlePinKey('delete');
    }
});

// ===================== INITIALIZATION =====================

async function initApp() {
    applyTheme(APP.theme || 'dark');
    if (txnDateInput) txnDateInput.valueAsDate = new Date();
    updateMonthLabel(dashMonthLabel, dashMonthIndex, dashYear, dashShowAll);
    updateMonthLabel(insightMonthLabel, insightMonthIndex, insightYear, insightShowAll);
    switchTab(APP.activeTab || 'dashboard');
}

initPinSystem();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    });
}
