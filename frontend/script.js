const API_URL = "http://127.0.0.1:8000";

// --- State Management ---
let token = localStorage.getItem("token");
let isDarkTheme = localStorage.getItem("theme") !== "light";
let historySkip = 0;
const historyLimit = 10;
let chartInstance = null;

// Calculator State
let currentExpression = "";
let shouldResetDisplay = false;

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    
    const isLoginPage = window.location.pathname.includes("login.html");
    
    if (token) {
        if (isLoginPage) {
            window.location.href = "index.html"; // Redirect to dashboard
        } else {
            initDashboard();
        }
    } else {
        if (!isLoginPage) {
            window.location.href = "login.html"; // Redirect to login
        } else {
            initAuth();
        }
    }
    
    // Global Toast Container setup happens in HTML
});

// --- Theme Logic ---
function initTheme() {
    const themeBtn = document.getElementById("theme-toggle");
    applyTheme();
    
    if(themeBtn) {
        themeBtn.addEventListener("click", () => {
            isDarkTheme = !isDarkTheme;
            localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
            applyTheme();
        });
    }
}

function applyTheme() {
    const themeBtn = document.getElementById("theme-toggle");
    if (isDarkTheme) {
        document.body.classList.remove("light-mode");
        document.body.classList.add("dark-mode");
        if(themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.classList.remove("dark-mode");
        document.body.classList.add("light-mode");
        if(themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

// --- Toast Notifications ---
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "fa-circle-info";
    if (type === "success") icon = "fa-circle-check";
    if (type === "error") icon = "fa-circle-xmark";
    
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add("hiding");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Auth Logic (login.html) ---
function initAuth() {
    const loginTab = document.querySelector('[data-tab="login"]');
    const registerTab = document.querySelector('[data-tab="register"]');
    const emailGroup = document.getElementById("email-group");
    const emailInput = document.getElementById("email");
    const submitBtn = document.querySelector(".auth-submit-btn");
    const btnText = document.getElementById("auth-btn-text");
    const form = document.getElementById("auth-form");
    
    let isRegistering = false;
    
    loginTab.addEventListener("click", () => {
        isRegistering = false;
        loginTab.classList.add("active");
        registerTab.classList.remove("active");
        emailGroup.style.display = "none";
        emailInput.required = false;
        btnText.innerText = "Login";
    });
    
    registerTab.addEventListener("click", () => {
        isRegistering = true;
        registerTab.classList.add("active");
        loginTab.classList.remove("active");
        emailGroup.style.display = "block";
        emailInput.required = true;
        btnText.innerText = "Register";
    });
    
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        
        try {
            submitBtn.disabled = true;
            if (isRegistering) {
                const email = document.getElementById("email").value;
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, email, password })
                });
                
                if (!res.ok) throw new Error((await res.json()).detail || "Registration failed");
                showToast("Registration successful! Logging in...", "success");
            }
            
            // Login (Both for direct login and auto-login after register)
            const formData = new URLSearchParams();
            formData.append("username", username);
            formData.append("password", password);
            
            const loginRes = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData
            });
            
            if (!loginRes.ok) throw new Error((await loginRes.json()).detail || "Login failed");
            
            const data = await loginRes.json();
            localStorage.setItem("token", data.access_token);
            // Decode username from JWT (roughly)
            try {
                const payload = JSON.parse(atob(data.access_token.split('.')[1]));
                localStorage.setItem("username", payload.sub);
            } catch(e) {}
            
            window.location.href = "index.html";
            
        } catch (error) {
            showToast(error.message, "error");
            submitBtn.disabled = false;
        }
    });
}

// --- Dashboard Logic (index.html) ---
function initDashboard() {
    document.getElementById("dashboard-view").classList.remove("is-hidden");
    
    // User info & Logout
    const username = localStorage.getItem("username") || "User";
    document.getElementById("user-greeting").innerText = `Hi, ${username}`;
    
    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn.style.display = "flex";
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        window.location.href = "login.html";
    });
    
    // Init Calculator functionalities
    initCalculator();
    
    // Scientific toggle
    const sciToggle = document.getElementById("sci-toggle");
    const sciGrid = document.getElementById("sci-grid");
    sciToggle.addEventListener("click", () => {
        const isHidden = sciGrid.classList.contains("is-hidden");
        if (isHidden) {
            sciGrid.classList.remove("is-hidden");
            sciToggle.querySelector("i").style.transform = "rotate(180deg)";
        } else {
            sciGrid.classList.add("is-hidden");
            sciToggle.querySelector("i").style.transform = "rotate(0)";
        }
    });
    
    // Load Data
    loadHistory();
    loadAnalytics();
    
    // Pagination
    document.getElementById("prev-page").addEventListener("click", () => {
        if(historySkip > 0) { historySkip -= historyLimit; loadHistory(); }
    });
    document.getElementById("next-page").addEventListener("click", () => {
        historySkip += historyLimit; loadHistory();
    });
    
    // Export
    document.getElementById("export-btn").addEventListener("click", exportHistory);
}

function initCalculator() {
    const buttons = document.querySelectorAll(".calc-btn");
    buttons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const action = e.target.dataset.action;
            const value = e.target.dataset.value;
            handleCalculatorInput(action, value);
        });
    });

    // Keyboard support - Enhanced with better operator handling
    document.addEventListener("keydown", (e) => {
        const key = e.key;
        const code = e.code;
        
        // Numbers and decimal point
        if (/[0-9.]/.test(key)) {
            handleCalculatorInput(null, key);
            return;
        }
        
        // Operators - with comprehensive key mapping including NumPad
        const operatorMap = {
            "+": "+",
            "-": "-",
            "*": "*",
            "/": "/",
            "%": "%",
            "^": "^",
            "(": "(",
            ")": ")"
        };
        
        // Check both key and code for better numpad support
        if (operatorMap[key]) {
            e.preventDefault();
            handleCalculatorInput(null, operatorMap[key]);
            return;
        }
        
        // Handle numpad operators by code
        if (code === "NumpadAdd") {
            e.preventDefault();
            handleCalculatorInput(null, "+");
            return;
        }
        if (code === "NumpadSubtract") {
            e.preventDefault();
            handleCalculatorInput(null, "-");
            return;
        }
        if (code === "NumpadMultiply") {
            e.preventDefault();
            handleCalculatorInput(null, "*");
            return;
        }
        if (code === "NumpadDivide") {
            e.preventDefault();
            handleCalculatorInput(null, "/");
            return;
        }
        if (code === "NumpadDecimal") {
            e.preventDefault();
            handleCalculatorInput(null, ".");
            return;
        }
        
        // Special keys
        if (key === "Enter" || key === "=" || code === "NumpadEnter") {
            e.preventDefault();
            handleCalculatorInput("calculate", null);
            return;
        }
        if (key === "Backspace") {
            e.preventDefault();
            handleCalculatorInput("delete", null);
            return;
        }
        if (key === "Escape") {
            e.preventDefault();
            handleCalculatorInput("clear", null);
            return;
        }
    });
}

function updateDisplay(mainText, previewText = null) {
    document.getElementById("main-display").innerText = mainText;
    if (previewText !== null) {
        document.getElementById("expression-preview").innerText = previewText;
    }
}

function handleCalculatorInput(action, value) {
    const mainDisp = document.getElementById("main-display");
    
    if (action === "clear") {
        currentExpression = "";
        updateDisplay("0", "");
        return;
    }
    
    if (action === "delete") {
        if (shouldResetDisplay) return;
        currentExpression = currentExpression.slice(0, -1);
        updateDisplay(currentExpression || "0");
        return;
    }
    
    if (action === "calculate") {
        if (!currentExpression) return;
        submitCalculation(currentExpression);
        return;
    }
    
    if (action === "parentheses") {
        // Simple logic to balance parentheses
        const open = (currentExpression.match(/\(/g) || []).length;
        const close = (currentExpression.match(/\)/g) || []).length;
        if (open > close && !/[+\-*/(^]$/.test(currentExpression)) {
            value = ")";
        } else {
            value = "(";
        }
    }
    
    if (action === "toggle-sign") {
        // Basic toggle sign implementation: wrap in (- ) or negate last number.
        // For simplicity, we just block it or implement basic string manipulation.
        showToast("Toggle sign not fully implemented in string mode", "info");
        return;
    }
    
    // Normalize operator symbols to actual operators
    if (value) {
        const operatorMap = {
            "×": "*",
            "÷": "/",
            "^": "^"
        };
        if (operatorMap[value]) {
            value = operatorMap[value];
        }
    }
    
    // Handle appending values
    if (shouldResetDisplay && /^[0-9.]$/.test(value)) {
        currentExpression = value;
        shouldResetDisplay = false;
    } else {
        shouldResetDisplay = false;
        currentExpression += value;
    }
    
    updateDisplay(currentExpression);
}

async function submitCalculation(expr) {
    try {
        updateDisplay("...", currentExpression + " =");
        const res = await fetch(`${API_URL}/api/calculate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ expression: expr })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Calculation Error");
        }
        
        const data = await res.json();
        currentExpression = data.result;
        shouldResetDisplay = true;
        updateDisplay(data.result, data.expression + " =");
        
        // Refresh data
        loadHistory(true);
        loadAnalytics();
        
    } catch (error) {
        showToast(error.message, "error");
        updateDisplay("Error");
        currentExpression = "";
        shouldResetDisplay = true;
    }
}

// --- Data Fetching (History & Analytics) ---

async function loadHistory(resetToFirst = false) {
    if (resetToFirst) historySkip = 0;
    
    try {
        const res = await fetch(`${API_URL}/api/history?skip=${historySkip}&limit=${historyLimit}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) return;
        
        const data = await res.json();
        const list = document.getElementById("history-list");
        list.innerHTML = "";
        
        data.forEach(item => {
            const el = document.createElement("div");
            el.className = "history-item";
            el.innerHTML = `
                <div>
                    <div class="hist-expr">${item.expression} =</div>
                    <div class="hist-res">${item.result}</div>
                </div>
                <button class="hist-del" onclick="deleteHistory(${item.id})"><i class="fa-solid fa-trash"></i></button>
            `;
            list.appendChild(el);
        });
        
        // Update pagination buttons
        document.getElementById("page-info").innerText = (historySkip / historyLimit) + 1;
        document.getElementById("prev-page").disabled = historySkip === 0;
        document.getElementById("next-page").disabled = data.length < historyLimit;
        
    } catch (e) {
        console.error("Failed to load history", e);
    }
}

async function deleteHistory(id) {
    try {
        const res = await fetch(`${API_URL}/api/history/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Record deleted", "success");
            loadHistory();
            loadAnalytics();
        }
    } catch (e) {
        showToast("Failed to delete record", "error");
    }
}

async function exportHistory() {
    try {
        showToast("Preparing download...", "info");
        const res = await fetch(`${API_URL}/api/history/export`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Export failed");
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "calculator_history.csv";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
    } catch (e) {
        showToast(e.message, "error");
    }
}

async function loadAnalytics() {
    try {
        const res = await fetch(`${API_URL}/api/analytics`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) return;
        
        const data = await res.json();
        document.getElementById("stat-total").innerText = data.total_calculations;
        document.getElementById("stat-operator").innerText = data.most_used_operator || "-";
        
        renderChart(data.calculations_per_day);
        
    } catch(e) {
        console.error("Failed to load analytics", e);
    }
}

function renderChart(dailyData) {
    const ctx = document.getElementById('usageChart');
    if (!ctx) return;
    
    const labels = Object.keys(dailyData);
    const chartData = Object.values(dailyData);
    
    // Just a basic fallback if no data
    if(labels.length === 0) {
        labels.push(new Date().toISOString().split('T')[0]);
        chartData.push(0);
    }
    
    const isDark = document.body.classList.contains("dark-mode");
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    if (chartInstance) {
        chartInstance.destroy();
    }
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Calculations',
                data: chartData,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, color: textColor },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            }
        }
    });
}
