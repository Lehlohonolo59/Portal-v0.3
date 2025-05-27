document.addEventListener('DOMContentLoaded', function() {
    // =====================
    // Entra ID Configuration
    // =====================
    const msalConfig = {
        auth: {
            clientId: "8e62f601-0326-4c17-a7ac-ffce1e1bf55a",
            authority: "https://login.microsoftonline.com/common",
            redirectUri: "http://localhost:5500"// Dynamically matches current URL
        },
        cache: {
            cacheLocation: "sessionStorage", // Persists across page refreshes
            storeAuthStateInCookie: false
        }
    };

    const msalInstance = new msal.PublicClientApplication(msalConfig);
    const loginRequest = { scopes: ["User.Read"] };

    // Track authentication state
    let isAuthenticating = false;

    // =====================
    // Enhanced Auth Management
    // =====================
    async function initializeAuth() {
        try {
            // First check for redirect response
            const response = await msalInstance.handleRedirectPromise();
            
            if (response) {
                // Successful redirect authentication
                return handleLoginSuccess(response.account);
            }

            // Check for existing accounts
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                // Attempt silent authentication
                try {
                    const silentResponse = await msalInstance.ssoSilent({
                        account: accounts[0],
                        scopes: ["User.Read"]
                    });
                    return handleLoginSuccess(silentResponse.account);
                } catch (silentError) {
                    console.log("Silent auth failed, proceeding to interactive");
                }
            }

            // No active session found
            showAuthPrompt();
            
        } catch (error) {
            console.error("Authentication error:", error);
            if (isAuthenticating) {
                alert("Authentication failed. Please try again.");
            }
        } finally {
            isAuthenticating = false;
        }
    }

    // =====================
    // UI State Management
    // =====================
    function handleLoginSuccess(account) {
        msalInstance.setActiveAccount(account);
        document.getElementById('loginButton').style.display = 'none';
        document.getElementById('welcomeMessage').textContent = `Welcome, ${account.name}`;
        document.getElementById('welcomeMessage').style.display = 'block';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('authMessage').style.display = 'none';
    }

    function showAuthPrompt() {
        document.getElementById('authMessage').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
    }

    // =====================
    // Form Handling
    // =====================
    const form = document.getElementById('serviceRequestForm');
    
    function showSuccessModal() {
        document.getElementById('successModal').style.display = 'flex';
        form.reset();
    }

    function closeSuccessModal() {
        document.getElementById('successModal').style.display = 'none';
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const account = msalInstance.getActiveAccount();
            if (!account) {
                alert("Session expired - please sign in again");
                return initializeAuth();
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            const caseData = {
                title: document.getElementById('issueType').value,
                description: document.getElementById('caseDescription').value,
                userEmail: account.username,
                userName: account.name,
                submissionDate: new Date().toISOString()
            };

            setTimeout(() => {
                console.log("Case submitted:", caseData);
                showSuccessModal();
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Request';
            }, 1000);

        } catch (error) {
            console.error('Submission error:', error);
            alert('Submission failed. Please try again.');
        }
    });

    // =====================
    // Event Listeners
    // =====================
    document.getElementById('loginButton').addEventListener('click', () => {
        isAuthenticating = true;
        msalInstance.loginRedirect(loginRequest).catch(error => {
            console.error("Login redirect failed:", error);
            isAuthenticating = false;
        });
    });

    window.closeSuccessModal = closeSuccessModal;
    
    // Initialize authentication on page load
    initializeAuth();
});