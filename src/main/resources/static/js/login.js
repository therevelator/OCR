// Login functionality

// Check if user is already logged in
if (localStorage.getItem('loggedInUser')) {
    window.location.href = 'dashboard.html';
}

// DOM elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');

// Simple user database (replace with actual backend authentication in production)
const users = [
    { email: 'user@example.com', password: 'password123' },
    { email: 'admin@example.com', password: 'admin123' }
];

// Function to validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Function to handle login
function handleLogin(e) {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Basic input validation
    if (!email || !password) {
        showError('Please enter both email and password.');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address.');
        return;
    }
    
    // Check credentials against user database
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Successful login
        localStorage.setItem('loggedInUser', JSON.stringify(user));
        window.location.href = 'dashboard.html'; // Redirect to dashboard
    } else {
        showError('Invalid email or password.');
    }
}

// Function to display error messages using SweetAlert
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: message,
    });
}

// Event listeners
loginForm.addEventListener('submit', handleLogin);

// Clear any existing error messages when user starts typing
emailInput.addEventListener('input', () => Swal.close());
passwordInput.addEventListener('input', () => Swal.close());
