// Global variables
let currentAdmin = null;
let appSettings = null;
let tournaments = [];
let users = [];
let withdrawals = [];
let deposits = [];
let transactions = [];
let currentFilter = 'all';
let currentTab = 'withdrawals';

// Firebase services
const { auth, db, storage, messaging } = window.firebaseServices;

// DOM elements
const elements = {
    // Login page elements
    adminLoginForm: document.getElementById('admin-login-form'),
    maintenanceOverlay: document.getElementById('maintenance-overlay'),
    loadingSpinner: document.getElementById('loading-spinner'),
    languageSelect: document.getElementById('language-select'),
    
    // Dashboard elements
    logoutBtn: document.getElementById('logout-btn'),
    navLinks: document.querySelectorAll('.nav-link'),
    contentSections: document.querySelectorAll('.content-section'),
    adminName: document.getElementById('admin-name'),
    adminNameDisplay: document.getElementById('admin-name-display'),
    
    // Stats elements
    totalUsers: document.getElementById('total-users'),
    activeTournaments: document.getElementById('active-tournaments'),
    totalRevenue: document.getElementById('total-revenue'),
    pendingWithdrawals: document.getElementById('pending-withdrawals'),
    
    // Tournament elements
    tournamentsTableBody: document.getElementById('tournaments-table-body'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    
    // User elements
    usersTableBody: document.getElementById('users-table-body'),
    userSearch: document.getElementById('user-search'),
    
    // Payment elements
    withdrawalsTableBody: document.getElementById('withdrawals-table-body'),
    depositsTableBody: document.getElementById('deposits-table-body'),
    transactionsTableBody: document.getElementById('transactions-table-body'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Settings elements
    appNameInput: document.getElementById('app-name-input'),
    maintenanceModeToggle: document.getElementById('maintenance-mode-toggle'),
    depositEnabledToggle: document.getElementById('deposit-enabled-toggle'),
    withdrawalEnabledToggle: document.getElementById('withdrawal-enabled-toggle'),
    generalSettingsForm: document.getElementById('general-settings-form'),
    supportLinksForm: document.getElementById('support-links-form'),
    
    // Activity elements
    activityList: document.getElementById('activity-list'),
    
    // Toast container
    toastContainer: document.getElementById('toast-container')
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        showLoading();
        
        // Check maintenance mode
        await checkMaintenanceMode();
        
        // Load app settings
        await loadAppSettings();
        
        // Initialize authentication
        initializeAuth();
        
        // Initialize language
        initializeLanguage();
        
        // Initialize UI elements
        initializeUI();
        
        hideLoading();
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Error initializing app', 'error');
        hideLoading();
    }
}

// Authentication functions
function initializeAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Check if user is admin
            const isAdmin = await checkAdminStatus(user);
            if (isAdmin) {
                currentAdmin = user;
                await handleAdminLogin(user);
            } else {
                await auth.signOut();
                showToast('Access denied. Admin privileges required.', 'error');
                window.location.href = '../user/index.html';
            }
        } else {
            handleAdminLogout();
        }
    });
}

async function checkAdminStatus(user) {
    try {
        // Method 1: Check custom claims
        const idTokenResult = await user.getIdTokenResult(true);
        if (idTokenResult.claims.admin) {
            return true;
        }
        
        // Method 2: Check admin UIDs in settings
        const settingsDoc = await db.collection('settings').doc('app-settings').get();
        if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            if (settings.adminUids && settings.adminUids.includes(user.uid)) {
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

async function handleAdminLogin(user) {
    try {
        // Load admin data
        await loadAdminData();
        
        // Redirect to dashboard if on login page
        if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/admin/')) {
            window.location.href = 'dashboard.html';
        }
        
        // Load dashboard data
        await loadDashboardData();
        
        // Load all sections data
        await loadTournaments();
        await loadUsers();
        await loadPayments();
        
    } catch (error) {
        console.error('Error handling admin login:', error);
        showToast('Error loading admin data', 'error');
    }
}

function handleAdminLogout() {
    currentAdmin = null;
    
    // Redirect to login if on dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'index.html';
    }
}

async function loadAdminData() {
    if (!currentAdmin) return;
    
    // Update admin name display
    if (elements.adminName) elements.adminName.textContent = currentAdmin.displayName || 'Admin';
    if (elements.adminNameDisplay) elements.adminNameDisplay.textContent = currentAdmin.displayName || 'Admin';
}

// Dashboard functions
async function loadDashboardData() {
    try {
        // Load stats
        await loadStats();
        
        // Load recent activity
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadStats() {
    try {
        // Get total users
        const usersSnapshot = await db.collection('users').get();
        const totalUsersCount = usersSnapshot.size;
        
        // Get active tournaments
        const tournamentsSnapshot = await db.collection('tournaments')
            .where('status', 'in', ['upcoming', 'ongoing'])
            .get();
        const activeTournamentsCount = tournamentsSnapshot.size;
        
        // Get pending withdrawals
        const withdrawalsSnapshot = await db.collection('transactions')
            .where('type', '==', 'withdrawal')
            .where('status', '==', 'pending')
            .get();
        const pendingWithdrawalsCount = withdrawalsSnapshot.size;
        
        // Calculate total revenue (simplified)
        const completedTransactions = await db.collection('transactions')
            .where('type', '==', 'tournament_join')
            .where('status', '==', 'completed')
            .get();
        
        let totalRevenue = 0;
        completedTransactions.forEach(doc => {
            totalRevenue += doc.data().amount || 0;
        });
        
        // Update UI
        if (elements.totalUsers) elements.totalUsers.textContent = totalUsersCount;
        if (elements.activeTournaments) elements.activeTournaments.textContent = activeTournamentsCount;
        if (elements.pendingWithdrawals) elements.pendingWithdrawals.textContent = pendingWithdrawalsCount;
        if (elements.totalRevenue) elements.totalRevenue.textContent = `₹${totalRevenue}`;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRecentActivity() {
    try {
        const activitySnapshot = await db.collection('transactions')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        const activities = activitySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        displayRecentActivity(activities);
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

function displayRecentActivity(activities) {
    if (!elements.activityList) return;
    
    elements.activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <h4>${getActivityTitle(activity.type)}</h4>
                <p>${getActivityDescription(activity)}</p>
            </div>
        </div>
    `).join('');
}

function getActivityIcon(type) {
    switch (type) {
        case 'tournament_join': return 'play';
        case 'deposit': return 'plus';
        case 'withdrawal': return 'minus';
        case 'tournament_win': return 'trophy';
        default: return 'info';
    }
}

function getActivityTitle(type) {
    switch (type) {
        case 'tournament_join': return 'Tournament Joined';
        case 'deposit': return 'Deposit';
        case 'withdrawal': return 'Withdrawal';
        case 'tournament_win': return 'Tournament Won';
        default: return 'Activity';
    }
}

function getActivityDescription(activity) {
    switch (activity.type) {
        case 'tournament_join':
            return `User joined tournament for ₹${activity.amount}`;
        case 'deposit':
            return `Deposit of ₹${activity.amount} received`;
        case 'withdrawal':
            return `Withdrawal request of ₹${activity.amount}`;
        case 'tournament_win':
            return `Tournament prize of ₹${activity.amount} awarded`;
        default:
            return `Transaction of ₹${activity.amount}`;
    }
}

// Tournament functions
async function loadTournaments() {
    try {
        const snapshot = await db.collection('tournaments')
            .orderBy('createdAt', 'desc')
            .get();
        
        tournaments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        displayTournaments();
    } catch (error) {
        console.error('Error loading tournaments:', error);
        showToast('Error loading tournaments', 'error');
    }
}

function displayTournaments() {
    if (!elements.tournamentsTableBody) return;
    
    const filteredTournaments = filterTournaments(tournaments, currentFilter);
    
    elements.tournamentsTableBody.innerHTML = filteredTournaments.map(tournament => `
        <tr>
            <td>${tournament.name}</td>
            <td><span class="badge badge-${tournament.type.toLowerCase()}">${tournament.type}</span></td>
            <td>₹${tournament.entryFee}</td>
            <td>₹${tournament.prizePool}</td>
            <td>${tournament.currentPlayers}/${tournament.maxPlayers}</td>
            <td><span class="badge badge-${tournament.status}">${tournament.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-secondary" onclick="editTournament('${tournament.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="copyTournament('${tournament.id}')">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTournament('${tournament.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterTournaments(tournaments, filter) {
    switch (filter) {
        case 'upcoming':
            return tournaments.filter(t => t.status === 'upcoming');
        case 'ongoing':
            return tournaments.filter(t => t.status === 'ongoing');
        case 'finished':
            return tournaments.filter(t => t.status === 'finished');
        case 'cancelled':
            return tournaments.filter(t => t.status === 'cancelled');
        default:
            return tournaments;
    }
}

async function createTournament(tournamentData) {
    try {
        const tournament = {
            ...tournamentData,
            currentPlayers: 0,
            status: 'upcoming',
            createdAt: new Date(),
            createdBy: currentAdmin.uid
        };
        
        await db.collection('tournaments').add(tournament);
        
        showToast('Tournament created successfully!', 'success');
        await loadTournaments();
        
    } catch (error) {
        console.error('Error creating tournament:', error);
        showToast('Error creating tournament', 'error');
    }
}

async function editTournament(tournamentId) {
    // Implement tournament editing functionality
    showToast('Edit functionality coming soon', 'info');
}

async function copyTournament(tournamentId) {
    try {
        const tournament = tournaments.find(t => t.id === tournamentId);
        if (!tournament) return;
        
        // Create a copy with new timestamps
        const copyData = {
            ...tournament,
            name: `${tournament.name} (Copy)`,
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // 25 hours from now
            currentPlayers: 0,
            status: 'upcoming',
            createdAt: new Date(),
            createdBy: currentAdmin.uid
        };
        
        // Remove the original ID
        delete copyData.id;
        
        await db.collection('tournaments').add(copyData);
        
        showToast('Tournament copied successfully!', 'success');
        await loadTournaments();
        
    } catch (error) {
        console.error('Error copying tournament:', error);
        showToast('Error copying tournament', 'error');
    }
}

async function deleteTournament(tournamentId) {
    if (!confirm('Are you sure you want to delete this tournament?')) return;
    
    try {
        await db.collection('tournaments').doc(tournamentId).delete();
        
        showToast('Tournament deleted successfully!', 'success');
        await loadTournaments();
        
    } catch (error) {
        console.error('Error deleting tournament:', error);
        showToast('Error deleting tournament', 'error');
    }
}

// User functions
async function loadUsers() {
    try {
        const snapshot = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .get();
        
        users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        displayUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error loading users', 'error');
    }
}

function displayUsers() {
    if (!elements.usersTableBody) return;
    
    const filteredUsers = filterUsers(users, elements.userSearch?.value || '');
    
    elements.usersTableBody.innerHTML = filteredUsers.map(user => {
        const totalBalance = user.wallet.deposit + user.wallet.winning + user.wallet.bonus;
        return `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>₹${totalBalance}</td>
                <td>${formatDate(user.createdAt)}</td>
                <td><span class="badge badge-active">Active</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary" onclick="viewUserDetails('${user.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterUsers(users, searchTerm) {
    if (!searchTerm) return users;
    
    return users.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
}

async function viewUserDetails(userId) {
    // Implement user details view
    showToast('User details view coming soon', 'info');
}

async function editUser(userId) {
    // Implement user editing
    showToast('User editing coming soon', 'info');
}

// Payment functions
async function loadPayments() {
    try {
        // Load withdrawals
        const withdrawalsSnapshot = await db.collection('transactions')
            .where('type', '==', 'withdrawal')
            .orderBy('timestamp', 'desc')
            .get();
        
        withdrawals = withdrawalsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Load deposits
        const depositsSnapshot = await db.collection('transactions')
            .where('type', '==', 'deposit')
            .orderBy('timestamp', 'desc')
            .get();
        
        deposits = depositsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Load all transactions
        const transactionsSnapshot = await db.collection('transactions')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        transactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        displayPayments();
    } catch (error) {
        console.error('Error loading payments:', error);
        showToast('Error loading payments', 'error');
    }
}

function displayPayments() {
    displayWithdrawals();
    displayDeposits();
    displayTransactions();
}

function displayWithdrawals() {
    if (!elements.withdrawalsTableBody) return;
    
    elements.withdrawalsTableBody.innerHTML = withdrawals.map(withdrawal => `
        <tr>
            <td>${withdrawal.userEmail || 'N/A'}</td>
            <td>₹${withdrawal.amount}</td>
            <td>${withdrawal.method || 'N/A'}</td>
            <td><span class="badge badge-${withdrawal.status}">${withdrawal.status}</span></td>
            <td>${formatDate(withdrawal.timestamp)}</td>
            <td>
                <div class="action-buttons">
                    ${withdrawal.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="approveWithdrawal('${withdrawal.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="rejectWithdrawal('${withdrawal.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="viewWithdrawalDetails('${withdrawal.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function displayDeposits() {
    if (!elements.depositsTableBody) return;
    
    elements.depositsTableBody.innerHTML = deposits.map(deposit => `
        <tr>
            <td>${deposit.userEmail || 'N/A'}</td>
            <td>₹${deposit.amount}</td>
            <td>${deposit.method || 'N/A'}</td>
            <td><span class="badge badge-${deposit.status}">${deposit.status}</span></td>
            <td>${formatDate(deposit.timestamp)}</td>
            <td>
                <div class="action-buttons">
                    ${deposit.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="approveDeposit('${deposit.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="rejectDeposit('${deposit.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="viewDepositDetails('${deposit.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function displayTransactions() {
    if (!elements.transactionsTableBody) return;
    
    elements.transactionsTableBody.innerHTML = transactions.map(transaction => `
        <tr>
            <td>${transaction.userEmail || 'N/A'}</td>
            <td><span class="badge badge-${transaction.type}">${transaction.type}</span></td>
            <td>₹${transaction.amount}</td>
            <td><span class="badge badge-${transaction.status}">${transaction.status}</span></td>
            <td>${formatDate(transaction.timestamp)}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewTransactionDetails('${transaction.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function approveWithdrawal(withdrawalId) {
    try {
        const withdrawal = withdrawals.find(w => w.id === withdrawalId);
        if (!withdrawal) return;
        
        // Update withdrawal status
        await db.collection('transactions').doc(withdrawalId).update({
            status: 'completed',
            processedAt: new Date()
        });
        
        showToast('Withdrawal approved successfully!', 'success');
        await loadPayments();
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error approving withdrawal:', error);
        showToast('Error approving withdrawal', 'error');
    }
}

async function rejectWithdrawal(withdrawalId) {
    try {
        const withdrawal = withdrawals.find(w => w.id === withdrawalId);
        if (!withdrawal) return;
        
        // Update withdrawal status
        await db.collection('transactions').doc(withdrawalId).update({
            status: 'rejected',
            processedAt: new Date()
        });
        
        // Refund the amount to user's winning wallet
        const userRef = db.collection('users').doc(withdrawal.userId);
        await userRef.update({
            'wallet.winning': firebase.firestore.FieldValue.increment(withdrawal.amount)
        });
        
        showToast('Withdrawal rejected and amount refunded!', 'success');
        await loadPayments();
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error rejecting withdrawal:', error);
        showToast('Error rejecting withdrawal', 'error');
    }
}

async function approveDeposit(depositId) {
    try {
        const deposit = deposits.find(d => d.id === depositId);
        if (!deposit) return;
        
        // Update deposit status
        await db.collection('transactions').doc(depositId).update({
            status: 'completed',
            processedAt: new Date()
        });
        
        // Add amount to user's deposit wallet
        const userRef = db.collection('users').doc(deposit.userId);
        await userRef.update({
            'wallet.deposit': firebase.firestore.FieldValue.increment(deposit.amount)
        });
        
        showToast('Deposit approved successfully!', 'success');
        await loadPayments();
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error approving deposit:', error);
        showToast('Error approving deposit', 'error');
    }
}

async function rejectDeposit(depositId) {
    try {
        const deposit = deposits.find(d => d.id === depositId);
        if (!deposit) return;
        
        // Update deposit status
        await db.collection('transactions').doc(depositId).update({
            status: 'rejected',
            processedAt: new Date()
        });
        
        showToast('Deposit rejected!', 'success');
        await loadPayments();
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error rejecting deposit:', error);
        showToast('Error rejecting deposit', 'error');
    }
}

// Settings functions
async function loadAppSettings() {
    try {
        const settingsDoc = await db.collection('settings').doc('app-settings').get();
        if (settingsDoc.exists) {
            appSettings = settingsDoc.data();
            
            // Update UI with settings
            updateSettingsUI();
        }
    } catch (error) {
        console.error('Error loading app settings:', error);
    }
}

function updateSettingsUI() {
    if (!appSettings) return;
    
    if (elements.appNameInput) elements.appNameInput.value = appSettings.appName || '';
    if (elements.maintenanceModeToggle) elements.maintenanceModeToggle.checked = appSettings.maintenanceMode || false;
    if (elements.depositEnabledToggle) elements.depositEnabledToggle.checked = appSettings.depositEnabled !== false;
    if (elements.withdrawalEnabledToggle) elements.withdrawalEnabledToggle.checked = appSettings.withdrawalEnabled !== false;
}

async function saveGeneralSettings(settingsData) {
    try {
        await db.collection('settings').doc('app-settings').update(settingsData);
        
        showToast('Settings saved successfully!', 'success');
        await loadAppSettings();
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Error saving settings', 'error');
    }
}

// UI functions
function initializeUI() {
    // Form submissions
    if (elements.adminLoginForm) {
        elements.adminLoginForm.addEventListener('submit', handleAdminLogin);
    }
    
    // Logout
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Navigation
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            showSection(section);
        });
    });
    
    // Tournament filters
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            displayTournaments();
        });
    });
    
    // Payment tabs
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.getAttribute('data-tab');
            
            elements.tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${currentTab}-tab-content`) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // User search
    if (elements.userSearch) {
        elements.userSearch.addEventListener('input', () => {
            displayUsers();
        });
    }
    
    // Settings forms
    if (elements.generalSettingsForm) {
        elements.generalSettingsForm.addEventListener('submit', handleGeneralSettingsSubmit);
    }
    
    if (elements.supportLinksForm) {
        elements.supportLinksForm.addEventListener('submit', handleSupportLinksSubmit);
    }
    
    // Password toggle
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const input = e.target.closest('.input-icon').querySelector('input');
            const icon = e.target.closest('.toggle-password').querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });
}

function showSection(sectionName) {
    // Update navigation
    elements.navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionName) {
            link.classList.add('active');
        }
    });
    
    // Show section
    elements.contentSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === `${sectionName}-section`) {
            section.classList.add('active');
        }
    });
}

function showCreateTournamentModal() {
    const modal = document.getElementById('create-tournament-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Authentication handlers
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    try {
        showLoading();
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Admin login successful!', 'success');
    } catch (error) {
        console.error('Admin login error:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error logging out', 'error');
    }
}

// Settings handlers
async function handleGeneralSettingsSubmit(e) {
    e.preventDefault();
    
    const settingsData = {
        appName: elements.appNameInput.value,
        maintenanceMode: elements.maintenanceModeToggle.checked,
        depositEnabled: elements.depositEnabledToggle.checked,
        withdrawalEnabled: elements.withdrawalEnabledToggle.checked
    };
    
    await saveGeneralSettings(settingsData);
}

async function handleSupportLinksSubmit(e) {
    e.preventDefault();
    
    const supportData = {
        whatsappUrl: document.getElementById('whatsapp-url-input').value,
        facebookUrl: document.getElementById('facebook-url-input').value,
        youtubeUrl: document.getElementById('youtube-url-input').value
    };
    
    try {
        await db.collection('settings').doc('app-settings').update(supportData);
        showToast('Support links saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving support links:', error);
        showToast('Error saving support links', 'error');
    }
}

// Utility functions
async function checkMaintenanceMode() {
    try {
        const settingsDoc = await db.collection('settings').doc('app-settings').get();
        if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            if (settings.maintenanceMode) {
                elements.maintenanceOverlay.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error checking maintenance mode:', error);
    }
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
}

function showLoading() {
    if (elements.loadingSpinner) {
        elements.loadingSpinner.classList.remove('hidden');
    }
}

function hideLoading() {
    if (elements.loadingSpinner) {
        elements.loadingSpinner.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Language support
function initializeLanguage() {
    if (elements.languageSelect) {
        elements.languageSelect.addEventListener('change', (e) => {
            const language = e.target.value;
            // Implement language switching logic here
            console.log('Language changed to:', language);
        });
    }
}

// Global functions for onclick handlers
window.showSection = showSection;
window.showCreateTournamentModal = showCreateTournamentModal;
window.hideModal = hideModal;
window.editTournament = editTournament;
window.copyTournament = copyTournament;
window.deleteTournament = deleteTournament;
window.viewUserDetails = viewUserDetails;
window.editUser = editUser;
window.approveWithdrawal = approveWithdrawal;
window.rejectWithdrawal = rejectWithdrawal;
window.approveDeposit = approveDeposit;
window.rejectDeposit = rejectDeposit;
window.viewWithdrawalDetails = (id) => showToast('Withdrawal details view coming soon', 'info');
window.viewDepositDetails = (id) => showToast('Deposit details view coming soon', 'info');
window.viewTransactionDetails = (id) => showToast('Transaction details view coming soon', 'info');
window.addPaymentMethod = (type) => showToast(`${type} payment method addition coming soon`, 'info');