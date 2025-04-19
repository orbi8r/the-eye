// Authentication handling for admin login using Supabase

// Initialize user state
let currentUser = null;

// Handle login form submission
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', handleRegister);
    }
    
    // Set up auth tabs
    setupAuthTabs();
    
    // Set up password visibility toggles
    setupPasswordToggles();
    
    // Check if user is already logged in
    // Ensure supabaseClient is available before checking auth state
    if (typeof supabaseClient !== 'undefined') {
        checkAuthState();
    } else {
        // Wait for supabaseClient to be initialized if needed, or handle error
        console.warn("Supabase client not ready for auth check.");
        // Optionally, retry after a delay or listen for an event
    }
});

// Set up authentication tabs
function setupAuthTabs() {
    const authTabs = document.querySelectorAll('.auth-tab');
    const authContents = document.querySelectorAll('.auth-content');
    
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const authId = tab.getAttribute('data-auth');
            
            // Update active tab
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            authContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${authId}-content`) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // Ensure the content for the initially active tab is shown
    const initialActiveTab = document.querySelector('.auth-tab.active');
    if (initialActiveTab) {
        const initialAuthId = initialActiveTab.getAttribute('data-auth');
        const initialAuthContent = document.getElementById(`${initialAuthId}-content`);
        if (initialAuthContent) {
            initialAuthContent.classList.add('active');
        }
    }
}

// Add event listeners for password toggles
function setupPasswordToggles() {
    const togglePasswordIcons = document.querySelectorAll('.toggle-password');
    togglePasswordIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const targetInputId = icon.getAttribute('data-target');
            const passwordInput = document.getElementById(targetInputId);
            
            if (passwordInput) {
                // Toggle the type
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                // Toggle the icon
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            }
        });
    });
}

// Check current authentication state
async function checkAuthState() {
    try {
        // Use the initialized supabaseClient instance
        const { data: { user }, error } = await supabaseClient.auth.getUser();

        if (error) {
            // Only log as an error if it's not a 'session missing' type of error
            if (error.message !== 'Auth session missing!') {
                 console.error('Error fetching user state:', error.message);
            } else {
                 console.log('No active user session found.'); // Log as info instead of error
            }
            return; // Exit if there's an error or no session
        }

        if (user) {
            currentUser = user;
            updateUIForAuthenticatedUser();
        } else {
            currentUser = null;
            console.log('User is not logged in.');
        }
    } catch (err) {
        console.error('Error in checkAuthState:', err);
    }
}

// Handle login submission
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showAuthMessage('Please enter both email and password', 'error');
        return;
    }
    
    try {
        showAuthMessage('Logging in...', 'info');
        
        // Use the initialized supabaseClient instance
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            showAuthMessage(error.message, 'error');
            return;
        }
        
        // Check if data and data.user exist before proceeding
        if (data && data.user) {
            currentUser = data.user;
            showAuthMessage('Login successful!', 'success');
            updateUIForAuthenticatedUser();
        } else {
            // Handle unexpected response from Supabase
            showAuthMessage('Login failed. Please try again.', 'error');
            console.error('Login response missing user data:', data);
        }
        
    } catch (err) {
        console.error('Login error:', err);
        showAuthMessage('An unexpected error occurred', 'error');
    }
}

// Handle registration submission
async function handleRegister() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (!email || !password) {
        showAuthMessage('Please fill in all fields', 'error', 'register');
        return;
    }
    
    if (password !== confirmPassword) {
        showAuthMessage('Passwords do not match', 'error', 'register');
        return;
    }
    
    try {
        showAuthMessage('Creating account...', 'info', 'register');
        
        // Use the initialized supabaseClient instance
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password
        });
        
        if (error) {
            showAuthMessage(error.message, 'error', 'register');
            return;
        }
        
        // Check if data and data.user exist (or if email confirmation is needed)
        if (data && (data.user || data.session)) {
             showAuthMessage('Registration successful! Please check your email to verify your account.', 'success', 'register');
        } else {
             // Handle cases where sign up might require confirmation but doesn't return a user immediately
             showAuthMessage('Registration initiated. Please check your email.', 'info', 'register');
             console.log('Sign up response:', data);
        }
        
    } catch (err) {
        console.error('Registration error:', err);
        showAuthMessage('An unexpected error occurred', 'error', 'register');
    }
}

// Handle logout
async function handleLogout() {
    try {
        // Use the initialized supabaseClient instance
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error('Logout error:', error.message);
            showAuthMessage('Logout failed. Please try again.', 'error');
            return;
        }

        currentUser = null;
        
        // Remove admin panel and logout button from sidebar
        const adminItem = document.querySelector('.sidebar-item[data-view="admin"]');
        const logoutItem = document.querySelector('.sidebar-item:has(.fa-sign-out-alt)');
        
        if (adminItem && adminItem.parentNode) {
            adminItem.parentNode.removeChild(adminItem);
        }
        
        if (logoutItem && logoutItem.parentNode) {
            logoutItem.parentNode.removeChild(logoutItem);
        }
        
        // Make the login item visible again
        const loginItem = document.querySelector('.sidebar-item[data-view="login"]');
        if (loginItem) {
            loginItem.style.display = ''; // Reset display property to default
        }
        
        // Switch back to login view
        const sidebarItems = document.querySelectorAll('.sidebar-item');
        const loginViewItem = Array.from(sidebarItems).find(item => item.getAttribute('data-view') === 'login');
        if (loginViewItem) {
            loginViewItem.click();
        }
        
        // Show logout message
        showAuthMessage('You have been logged out', 'info');
        
    } catch (err) {
        console.error('Logout error:', err);
        showAuthMessage('An unexpected error occurred during logout.', 'error');
    }
}

// Update UI for authenticated user
function updateUIForAuthenticatedUser() {
    // Switch to admin view
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const adminTab = document.getElementById('admin-view');
    const loginTab = document.getElementById('login-view');
    
    // Hide the login tab in sidebar
    const loginItem = document.querySelector('.sidebar-item[data-view="login"]');
    if (loginItem) {
        loginItem.style.display = 'none';
    }
    
    // Create admin tab in sidebar if it doesn't exist
    let adminItem = Array.from(sidebarItems).find(item => item.getAttribute('data-view') === 'admin');
    
    if (!adminItem) {
        // Create new admin item in sidebar
        const sidebar = document.querySelector('.sidebar');
        adminItem = document.createElement('div');
        adminItem.className = 'sidebar-item';
        adminItem.setAttribute('data-view', 'admin');
        adminItem.innerHTML = `
            <div class="sidebar-icon">
                <i class="fas fa-chart-line"></i>
            </div>
            <span class="sidebar-text">Admin Panel</span>
        `;
        
        // Add click event
        adminItem.addEventListener('click', () => {
            sidebarItems.forEach(i => i.classList.remove('active'));
            adminItem.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                if (content.id === 'admin-view') {
                    content.classList.add('active');
                }
            });
        });
        
        // Add logout button at the top left (instead of at the bottom)
        const logoutItem = document.createElement('div');
        logoutItem.className = 'sidebar-item';
        // Remove margin-top: auto to keep it at the top
        logoutItem.innerHTML = `
            <div class="sidebar-icon">
                <i class="fas fa-sign-out-alt"></i>
            </div>
            <span class="sidebar-text">Logout</span>
        `;
        
        logoutItem.addEventListener('click', handleLogout);
        
        // Add adminItem to sidebar
        sidebar.appendChild(adminItem);
        
        // Insert logoutItem after adminItem to keep it at the top
        sidebar.insertBefore(logoutItem, adminItem.nextSibling);
    }
    
    // Activate admin view
    adminItem.click();
}

// Show authentication messages
function showAuthMessage(message, type, tab = 'login') {
    // Check if message container already exists, otherwise create it
    let messageContainer = document.querySelector(`.auth-message-${tab}`);
    
    if (!messageContainer) {
        const authForm = document.querySelector(`#${tab}-content .auth-form`);
        messageContainer = document.createElement('div');
        messageContainer.className = `auth-message-${tab}`;
        messageContainer.style.padding = '10px';
        messageContainer.style.marginBottom = '15px';
        messageContainer.style.borderRadius = '4px';
        messageContainer.style.textAlign = 'center';
        
        authForm.insertBefore(messageContainer, authForm.firstChild);
    }
    
    // Set message and styling based on type
    messageContainer.textContent = message;
    
    switch (type) {
        case 'error':
            messageContainer.style.backgroundColor = 'rgba(255, 83, 83, 0.2)';
            messageContainer.style.color = '#ff5353';
            break;
        case 'success':
            messageContainer.style.backgroundColor = 'rgba(83, 248, 170, 0.2)';
            messageContainer.style.color = '#53f8aa';
            break;
        case 'info':
            messageContainer.style.backgroundColor = 'rgba(83, 216, 255, 0.2)';
            messageContainer.style.color = '#53d8ff';
            break;
    }
}