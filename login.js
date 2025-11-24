// Wait for the entire HTML document to be loaded before running script
document.addEventListener('DOMContentLoaded', () => {

    // --- Simulated Database (For demonstration only - DO NOT use for real security) ---
    const users = {
        'admin@gmail.com': { password: 'adminpassword', role: 'admin' },
        'user@gmail.com': { password: 'userpassword', role: 'user' },
    };

    // --- Get All Elements ---
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const messageBox = document.getElementById('message-box');
    const modalContainer = document.getElementById('modal-container');
    // Note: 'openAuthBtn' is not in the provided HTML snippet, but kept for completeness
    const openAuthBtn = document.getElementById('open-auth-btn'); 
    
    // --- Modal Functions ---
    function openModal() {
        if (modalContainer) {
            modalContainer.classList.remove('hidden');
        }
        // Always default to login view when opening
        if (window.showView) {
            window.showView('login');
        }
    }

    function closeModal() {
        if (modalContainer) {
            modalContainer.classList.add('hidden');
        }
    }

    // --- Core Authentication Function ---
    function authenticateUser(email, password) {
        const user = users[email];
        if (user && user.password === password) {
            return user.role;
        }
        return null; // Authentication failed
    }

    // --- Attach Main Modal Listener (Assuming 'open-auth-btn' is elsewhere in your page) ---
    if (openAuthBtn) {
        openAuthBtn.addEventListener('click', openModal);
    } 

    // --- Define Functions for HTML onclicks ---
    window.showView = function(view) {
        if (!loginView || !signupView || !loginTab || !signupTab) return;

        if (view === 'login') {
            loginView.classList.remove('hidden');
            signupView.classList.add('hidden');
            loginTab.classList.add('active-tab');
            signupTab.classList.remove('active-tab');
        } else if (view === 'signup') {
            signupView.classList.remove('hidden');
            loginView.classList.add('hidden');
            signupTab.classList.add('active-tab');
            loginTab.classList.remove('active-tab');
        }
    }

    window.togglePasswordVisibility = function(id) {
        const input = document.getElementById(id);
        if (!input) return;

        const showIcon = document.getElementById(`${id}-toggle-show`);
        const hideIcon = document.getElementById(`${id}-toggle-hide`);
        if (!showIcon || !hideIcon) return;

        if (input.type === 'password') {
            input.type = 'text';
            showIcon.classList.add('hidden');
            hideIcon.classList.remove('hidden');
        } else {
            input.type = 'password';
            showIcon.classList.remove('hidden');
            hideIcon.classList.add('hidden');
        }
    }

    // --- Main Form Submission Handler ---
    window.handleFormSubmit = function(event, formName) {
        event.preventDefault();

        // Determine which form was submitted based on the button/context.
        // We use the first letter of the string passed in the HTML for simplicity.
        const formType = formName.toLowerCase().split(' ')[0]; 

        // --- LOGIN LOGIC ---
        if (formType === 'login') { 
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            const role = authenticateUser(email, password);

            if (role) {
                window.showMessage(`Login successful! Redirecting as ${role}...`);
                
                // Close the modal 
                closeModal(); 
                
                // --- REDIRECTION LOGIC ---
                setTimeout(() => {
                    if (role === 'admin') {
                        // COMMENT: Admin account successfully logged in. 
                        window.open('admin2.html', '_blank');
                    } else if (role === 'user') {
                        // COMMENT: User account successfully logged in. 
                        window.location.href = 'user.html'; 
                    }
                }, 1000); 
            } else {
                window.showMessage('Login failed. Invalid email or password.', true);
            }

        // --- SIGNUP LOGIC ---
        } else if (formType === 'create') {
            const newEmail = document.getElementById('signup-email').value;
            const newPassword = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;

            // Simple validation: check if required fields are filled (browser handles most)
            if (!newEmail || !newPassword || !confirmPassword) {
                 window.showMessage('Please fill in all required fields.', true);
                 return;
            }
            
            // Password match check
            if (newPassword !== confirmPassword) {
                window.showMessage('Passwords do not match.', true);
                return;
            }

            // Check if account already exists
            if (users[newEmail]) {
                window.showMessage('Account already exists for this email.', true);
                return;
            }
            
            // --- SIMULATED REGISTRATION ---
            users[newEmail] = { password: newPassword, role: 'user' };
            
            window.showMessage('Registration successful! Please log in.');
            
            // Switch to the login view after a successful registration
            window.showView('login');
        }
    }

    window.showMessage = function(message, isError = false) {
        if (!messageBox) return;
        
        // Reset message box classes
        messageBox.classList.remove('bg-red-600', 'bg-gray-800');

        // Set text and appropriate background color
        messageBox.textContent = message;
        messageBox.classList.add(isError ? 'bg-red-600' : 'bg-gray-800');

        // Show the message
        messageBox.classList.remove('opacity-0', 'pointer-events-none');
        
        // Hide the message after 3 seconds
        setTimeout(() => {
            messageBox.classList.add('opacity-0', 'pointer-events-none');
        }, 3000);
    }

    // Expose closeModal to window for the 'X' buttons in the HTML
    window.closeModal = closeModal;
    
    // NO NEED to manually attach event listeners since your HTML uses onsubmit="..."

});





