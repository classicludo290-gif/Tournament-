// Global variables
let currentUser = null;
let appSettings = null;
let tournaments = [];
let userTournaments = [];
let currentFilter = 'all';

// Firebase services
const { auth, db, storage, messaging } = window.firebaseServices;

// DOM elements
const elements = {
    // Login page elements
    loginForm: document.getElementById('login-form'),
    signupForm: document.getElementById('signup-form'),
    showSignupBtn: document.getElementById('show-signup'),
    showLoginBtn: document.getElementById('show-login'),
    signupContainer: document.getElementById('signup-container'),
    maintenanceOverlay: document.getElementById('maintenance-overlay'),
    loadingSpinner: document.getElementById('loading-spinner'),
    languageSelect: document.getElementById('language-select'),
    
    // Dashboard elements
    logoutBtn: document.getElementById('logout-btn'),
    navLinks: document.querySelectorAll('.nav-link'),
    contentSections: document.querySelectorAll('.content-section'),
    
    // Wallet elements
    depositAmount: document.getElementById('deposit-amount'),
    winningAmount: document.getElementById('winning-amount'),
    bonusAmount: document.getElementById('bonus-amount'),
    totalBalance: document.getElementById('total-balance'),
    
    // Tournament elements
    tournamentsGrid: document.getElementById('tournaments-grid'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    noTournaments: document.getElementById('no-tournaments'),
    
    // Profile elements
    userName: document.getElementById('user-name'),
    profileName: document.getElementById('profile-name'),
    profileEmail: document.getElementById('profile-email'),
    referralCodeDisplay: document.getElementById('referral-code-display'),
    copyReferralBtn: document.getElementById('copy-referral'),
    
    // Modals
    tournamentModal: document.getElementById('tournament-modal'),
    joinModal: document.getElementById('join-modal'),
    closeModal: document.getElementById('close-modal'),
    closeJoinModal: document.getElementById('close-join-modal'),
    
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
            currentUser = user;
            await handleUserLogin(user);
        } else {
            handleUserLogout();
        }
    });
}

async function handleUserLogin(user) {
    try {
        // Check if user document exists, if not create it
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            await createUserDocument(user);
        }
        
        // Load user data
        await loadUserData();
        
        // Redirect to dashboard if on login page
        if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/user/')) {
            window.location.href = 'dashboard.html';
        }
        
        // Load tournaments
        await loadTournaments();
        
        // Load user's tournaments
        await loadUserTournaments();
        
    } catch (error) {
        console.error('Error handling user login:', error);
        showToast('Error loading user data', 'error');
    }
}

function handleUserLogout() {
    currentUser = null;
    
    // Redirect to login if on dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'index.html';
    }
}

async function createUserDocument(user) {
    const userData = {
        email: user.email,
        username: user.displayName || user.email.split('@')[0],
        wallet: {
            deposit: 0,
            winning: 0,
            bonus: 0
        },
        referralCode: generateReferralCode(),
        referredBy: null,
        createdAt: new Date(),
        lastLogin: new Date()
    };
    
    await db.collection('users').doc(user.uid).set(userData);
}

async function loadUserData() {
    if (!currentUser) return;
    
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data();
    
    // Update UI with user data
    if (elements.userName) elements.userName.textContent = userData.username;
    if (elements.profileName) elements.profileName.textContent = userData.username;
    if (elements.profileEmail) elements.profileEmail.textContent = userData.email;
    if (elements.referralCodeDisplay) elements.referralCodeDisplay.value = userData.referralCode;
    
    // Update wallet display
    updateWalletDisplay(userData.wallet);
}

function updateWalletDisplay(wallet) {
    if (elements.depositAmount) elements.depositAmount.textContent = `₹${wallet.deposit}`;
    if (elements.winningAmount) elements.winningAmount.textContent = `₹${wallet.winning}`;
    if (elements.bonusAmount) elements.bonusAmount.textContent = `₹${wallet.bonus}`;
    if (elements.totalBalance) {
        const total = wallet.deposit + wallet.winning + wallet.bonus;
        elements.totalBalance.textContent = `₹${total}`;
    }
}

// Tournament functions
async function loadTournaments() {
    try {
        const snapshot = await db.collection('tournaments')
            .where('status', 'in', ['upcoming', 'ongoing'])
            .orderBy('startTime')
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
    if (!elements.tournamentsGrid) return;
    
    const filteredTournaments = filterTournaments(tournaments, currentFilter);
    
    if (filteredTournaments.length === 0) {
        elements.tournamentsGrid.innerHTML = '';
        elements.noTournaments.classList.remove('hidden');
        return;
    }
    
    elements.noTournaments.classList.add('hidden');
    
    elements.tournamentsGrid.innerHTML = filteredTournaments.map(tournament => `
        <div class="tournament-card" onclick="showTournamentDetails('${tournament.id}')">
            <div class="tournament-header">
                <h3 class="tournament-title">${tournament.name}</h3>
                <span class="tournament-type">${tournament.type}</span>
            </div>
            <div class="tournament-details">
                <div class="detail-item">
                    <div class="detail-label">Entry Fee</div>
                    <div class="detail-value">₹${tournament.entryFee}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Prize Pool</div>
                    <div class="detail-value">₹${tournament.prizePool}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Players</div>
                    <div class="detail-value">${tournament.currentPlayers}/${tournament.maxPlayers}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">${tournament.status}</div>
                </div>
            </div>
            <div class="tournament-actions">
                <button class="btn btn-secondary" onclick="event.stopPropagation(); showTournamentDetails('${tournament.id}')">
                    <i class="fas fa-info-circle"></i>
                    Details
                </button>
                <button class="btn btn-primary" onclick="event.stopPropagation(); joinTournament('${tournament.id}')">
                    <i class="fas fa-play"></i>
                    Join
                </button>
            </div>
        </div>
    `).join('');
}

function filterTournaments(tournaments, filter) {
    switch (filter) {
        case 'solo':
            return tournaments.filter(t => t.type === 'Solo');
        case 'duo':
            return tournaments.filter(t => t.type === 'Duo');
        case 'squad':
            return tournaments.filter(t => t.type === 'Squad');
        case 'my-created':
            return tournaments.filter(t => t.createdBy === currentUser?.uid);
        default:
            return tournaments;
    }
}

async function showTournamentDetails(tournamentId) {
    try {
        const tournament = tournaments.find(t => t.id === tournamentId);
        if (!tournament) return;
        
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div class="tournament-details-modal">
                <h3>${tournament.name}</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Type:</label>
                        <span>${tournament.type}</span>
                    </div>
                    <div class="detail-item">
                        <label>Entry Fee:</label>
                        <span>₹${tournament.entryFee}</span>
                    </div>
                    <div class="detail-item">
                        <label>Prize Pool:</label>
                        <span>₹${tournament.prizePool}</span>
                    </div>
                    <div class="detail-item">
                        <label>Players:</label>
                        <span>${tournament.currentPlayers}/${tournament.maxPlayers}</span>
                    </div>
                    <div class="detail-item">
                        <label>Start Time:</label>
                        <span>${formatDate(tournament.startTime)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span>${tournament.status}</span>
                    </div>
                </div>
                ${tournament.roomCode && tournament.status === 'ongoing' ? `
                    <div class="room-info">
                        <h4>Room Information</h4>
                        <div class="room-details">
                            <div class="room-item">
                                <label>Room Code:</label>
                                <span>${tournament.roomCode}</span>
                            </div>
                            ${tournament.roomPassword ? `
                                <div class="room-item">
                                    <label>Password:</label>
                                    <span>${tournament.roomPassword}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="joinTournament('${tournament.id}')">
                        <i class="fas fa-play"></i>
                        Join Tournament
                    </button>
                </div>
            </div>
        `;
        
        showModal('tournament-modal');
    } catch (error) {
        console.error('Error showing tournament details:', error);
        showToast('Error loading tournament details', 'error');
    }
}

async function joinTournament(tournamentId) {
    try {
        const tournament = tournaments.find(t => t.id === tournamentId);
        if (!tournament) return;
        
        // Check if user already joined
        const userJoined = userTournaments.some(ut => ut.tournamentId === tournamentId);
        if (userJoined) {
            showToast('You have already joined this tournament', 'warning');
            return;
        }
        
        // Check if tournament is full
        if (tournament.currentPlayers >= tournament.maxPlayers) {
            showToast('Tournament is full', 'error');
            return;
        }
        
        // Show join confirmation modal
        const joinDetails = document.getElementById('join-details');
        joinDetails.innerHTML = `
            <div class="join-detail-item">
                <label>Tournament:</label>
                <span>${tournament.name}</span>
            </div>
            <div class="join-detail-item">
                <label>Entry Fee:</label>
                <span>₹${tournament.entryFee}</span>
            </div>
            <div class="join-detail-item">
                <label>Prize Pool:</label>
                <span>₹${tournament.prizePool}</span>
            </div>
        `;
        
        showModal('join-modal');
        
        // Store tournament ID for confirmation
        window.pendingJoinTournamentId = tournamentId;
        
    } catch (error) {
        console.error('Error joining tournament:', error);
        showToast('Error joining tournament', 'error');
    }
}

async function confirmJoinTournament() {
    try {
        const tournamentId = window.pendingJoinTournamentId;
        if (!tournamentId) return;
        
        showLoading();
        
        // Deduct entry fee from wallet
        await deductJoinFee(tournamentId);
        
        // Add user to tournament participants
        await addUserToTournament(tournamentId);
        
        // Update tournament current players count
        await updateTournamentPlayers(tournamentId);
        
        // Reload data
        await loadUserData();
        await loadUserTournaments();
        
        hideModal('join-modal');
        hideLoading();
        
        showToast('Successfully joined tournament!', 'success');
        
    } catch (error) {
        console.error('Error confirming join:', error);
        hideLoading();
        showToast(error.message || 'Error joining tournament', 'error');
    }
}

async function deductJoinFee(tournamentId) {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    
    const userRef = db.collection('users').doc(currentUser.uid);
    
    return db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new Error('User does not exist!');
        }
        
        const wallet = userDoc.data().wallet;
        let remainingFee = tournament.entryFee;
        
        // Get fee priority from app settings
        const priority = appSettings?.defaultJoinFeePriority || ['winning', 'bonus', 'deposit'];
        
        for (const bucket of priority) {
            if (remainingFee > 0 && wallet[bucket] > 0) {
                const deductedFromBucket = Math.min(remainingFee, wallet[bucket]);
                wallet[bucket] -= deductedFromBucket;
                remainingFee -= deductedFromBucket;
            }
        }
        
        if (remainingFee > 0) {
            throw new Error('Insufficient balance in any bucket!');
        }
        
        transaction.update(userRef, { wallet: wallet });
        return true;
    });
}

async function addUserToTournament(tournamentId) {
    await db.collection('tournaments').doc(tournamentId)
        .collection('participants').doc(currentUser.uid).set({
            joinedAt: new Date(),
            status: 'active'
        });
}

async function updateTournamentPlayers(tournamentId) {
    await db.collection('tournaments').doc(tournamentId).update({
        currentPlayers: firebase.firestore.FieldValue.increment(1)
    });
}

// UI functions
function initializeUI() {
    // Login/Signup toggle
    if (elements.showSignupBtn) {
        elements.showSignupBtn.addEventListener('click', () => {
            elements.signupContainer.classList.remove('hidden');
        });
    }
    
    if (elements.showLoginBtn) {
        elements.showLoginBtn.addEventListener('click', () => {
            elements.signupContainer.classList.add('hidden');
        });
    }
    
    // Form submissions
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', handleLogin);
    }
    
    if (elements.signupForm) {
        elements.signupForm.addEventListener('submit', handleSignup);
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
    
    // Modal close buttons
    if (elements.closeModal) {
        elements.closeModal.addEventListener('click', () => hideModal('tournament-modal'));
    }
    
    if (elements.closeJoinModal) {
        elements.closeJoinModal.addEventListener('click', () => hideModal('join-modal'));
    }
    
    // Join tournament confirmation
    const confirmJoinBtn = document.getElementById('confirm-join');
    if (confirmJoinBtn) {
        confirmJoinBtn.addEventListener('click', confirmJoinTournament);
    }
    
    const cancelJoinBtn = document.getElementById('cancel-join');
    if (cancelJoinBtn) {
        cancelJoinBtn.addEventListener('click', () => hideModal('join-modal'));
    }
    
    // Copy referral code
    if (elements.copyReferralBtn) {
        elements.copyReferralBtn.addEventListener('click', copyReferralCode);
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

function showModal(modalId) {
    const modal = document.getElementById(modalId);
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
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        showLoading();
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Login successful!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const referralCode = document.getElementById('referral-code').value;
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update display name
        await userCredential.user.updateProfile({
            displayName: username
        });
        
        // Handle referral code if provided
        if (referralCode) {
            await handleReferralCode(referralCode, userCredential.user.uid);
        }
        
        showToast('Account created successfully!', 'success');
    } catch (error) {
        console.error('Signup error:', error);
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

async function loadAppSettings() {
    try {
        const settingsDoc = await db.collection('settings').doc('app-settings').get();
        if (settingsDoc.exists) {
            appSettings = settingsDoc.data();
            
            // Update app name
            const appNameElements = document.querySelectorAll('#app-name');
            appNameElements.forEach(el => {
                el.textContent = appSettings.appName || 'Tournament App';
            });
        }
    } catch (error) {
        console.error('Error loading app settings:', error);
    }
}

async function loadUserTournaments() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('tournaments')
            .where('participants', 'array-contains', currentUser.uid)
            .get();
        
        userTournaments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error loading user tournaments:', error);
    }
}

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function handleReferralCode(referralCode, newUserId) {
    try {
        const usersRef = db.collection('users');
        const query = await usersRef.where('referralCode', '==', referralCode).get();
        
        if (!query.empty) {
            const referrerDoc = query.docs[0];
            const referrerId = referrerDoc.id;
            
            // Update new user's referredBy field
            await usersRef.doc(newUserId).update({
                referredBy: referrerId
            });
            
            // Add bonus to referrer (implement bonus logic here)
            // This would depend on your bonus system
        }
    } catch (error) {
        console.error('Error handling referral code:', error);
    }
}

function copyReferralCode() {
    const referralCode = elements.referralCodeDisplay.value;
    navigator.clipboard.writeText(referralCode).then(() => {
        showToast('Referral code copied!', 'success');
    }).catch(() => {
        showToast('Failed to copy referral code', 'error');
    });
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
window.showTournamentDetails = showTournamentDetails;
window.joinTournament = joinTournament;