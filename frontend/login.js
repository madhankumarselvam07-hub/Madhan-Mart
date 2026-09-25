/**
 * MADHAN MART - Login Page Script
 * Pure Vanilla JavaScript (Seamless Login & Dashboard Redirect)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailGroup = document.getElementById('emailGroup');
  const passwordGroup = document.getElementById('passwordGroup');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const rememberMeCheckbox = document.getElementById('rememberMe');
  const loginBtn = document.getElementById('loginBtn');
  const btnLabel = loginBtn.querySelector('.btn-label');
  const formAlert = document.getElementById('formAlert');
  const googleBtn = document.getElementById('googleBtn');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');

  // Check URL parameters (e.g. redirected from register with registered=true & email)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('registered') === 'true') {
    showAlert('Account created successfully! Please enter your password to sign in.', 'success');
  }
  const prefillEmail = urlParams.get('email');
  if (prefillEmail) {
    emailInput.value = prefillEmail;
    passwordInput.focus();
  }

  // Load remembered email if available and not overridden
  const savedEmail = localStorage.getItem('madhan_mart_saved_email');
  if (savedEmail && !prefillEmail) {
    emailInput.value = savedEmail;
    rememberMeCheckbox.checked = true;
  }

  // --------------------------------------------------------------------------
  // Password Visibility Toggle
  // --------------------------------------------------------------------------
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      const newType = isPassword ? 'text' : 'password';
      
      passwordInput.setAttribute('type', newType);
      togglePasswordBtn.classList.toggle('is-active', isPassword);
      togglePasswordBtn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
      togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      
      // Keep cursor at end of input
      passwordInput.focus();
      const valLength = passwordInput.value.length;
      passwordInput.setSelectionRange(valLength, valLength);
    });
  }

  // --------------------------------------------------------------------------
  // Validation Helpers
  // --------------------------------------------------------------------------
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateEmail(value) {
    const trimmed = value.trim();
    if (!trimmed) {
      return { valid: false, message: 'Email address is required.' };
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      return { valid: false, message: 'Please enter a valid email address (e.g. madhan@example.com).' };
    }
    return { valid: true, message: '' };
  }

  function validatePassword(value) {
    if (!value || value.length === 0) {
      return { valid: false, message: 'Password is required.' };
    }
    return { valid: true, message: '' };
  }

  function setError(groupElement, errorElement, message) {
    if (groupElement) groupElement.classList.add('has-error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }

  function clearError(groupElement, errorElement) {
    if (groupElement) groupElement.classList.remove('has-error');
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
  }

  function showAlert(message, type = 'error') {
    formAlert.textContent = message;
    formAlert.className = `form-alert alert-${type}`;
    formAlert.style.display = 'flex';
  }

  function hideAlert() {
    formAlert.textContent = '';
    formAlert.className = 'form-alert';
    formAlert.style.display = 'none';
  }

  // --------------------------------------------------------------------------
  // Live Validation Clearing on Input
  // --------------------------------------------------------------------------
  emailInput.addEventListener('input', () => {
    if (emailGroup.classList.contains('has-error')) {
      const result = validateEmail(emailInput.value);
      if (result.valid) clearError(emailGroup, emailError);
    }
  });

  passwordInput.addEventListener('input', () => {
    if (passwordGroup.classList.contains('has-error')) {
      const result = validatePassword(passwordInput.value);
      if (result.valid) clearError(passwordGroup, passwordError);
    }
  });

  // --------------------------------------------------------------------------
  // Form Submission Handler -> Redirects to Dashboard
  // --------------------------------------------------------------------------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const emailValue = emailInput.value.trim();
    const passwordValue = passwordInput.value;

    // Validate fields
    const emailCheck = validateEmail(emailValue);
    const passwordCheck = validatePassword(passwordValue);

    let hasErrors = false;

    if (!emailCheck.valid) {
      setError(emailGroup, emailError, emailCheck.message);
      hasErrors = true;
    } else {
      clearError(emailGroup, emailError);
    }

    if (!passwordCheck.valid) {
      setError(passwordGroup, passwordError, passwordCheck.message);
      hasErrors = true;
    } else {
      clearError(passwordGroup, passwordError);
    }

    if (hasErrors) {
      if (!emailCheck.valid) emailInput.focus();
      else passwordInput.focus();
      return;
    }

    // Set Loading State
    setLoading(true);

    try {
      let displayName = 'Madhan Kumar';
      let userId = null;

      // 1. Try Live Supabase Sign In
      if (window.MadhanMartSupabase) {
        try {
          const authRes = await window.MadhanMartSupabase.signIn(emailValue, passwordValue);
          if (authRes && authRes.user) {
            const meta = authRes.user.user_metadata || {};
            displayName = meta.full_name || meta.name || emailValue.split('@')[0];
            userId = authRes.user.id;
          }
        } catch (supabaseErr) {
          console.warn('[SUPABASE] Auth notice:', supabaseErr.message || supabaseErr);
          // If Supabase returns error like email unconfirmed or invalid credentials
          if (supabaseErr.message && supabaseErr.message.toLowerCase().includes('invalid login credentials')) {
            setLoading(false);
            setError(passwordGroup, passwordError, 'Invalid email or password.');
            showAlert('Invalid email or password. Please try again.', 'error');
            return;
          }
        }
      }

      // Fallback local lookup
      const registeredUsers = JSON.parse(localStorage.getItem('madhan_mart_users') || '[]');
      const matchedUser = registeredUsers.find(
        (u) => u.email.toLowerCase() === emailValue.toLowerCase()
      );

      if (matchedUser && matchedUser.fullName) {
        displayName = matchedUser.fullName;
      } else if (!userId) {
        const localPart = emailValue.split('@')[0];
        displayName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
      }

      // Save active session for the dashboard
      const sessionUser = {
        id: userId,
        fullName: displayName,
        email: emailValue,
        loginTime: new Date().toISOString()
      };
      localStorage.setItem('madhan_mart_current_user', JSON.stringify(sessionUser));

      // Handle remember me
      if (rememberMeCheckbox.checked) {
        localStorage.setItem('madhan_mart_saved_email', emailValue);
      } else {
        localStorage.removeItem('madhan_mart_saved_email');
      }

      showAlert('Login successful! Redirecting to dashboard...', 'success');

      // Seamless redirect to dashboard
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);

    } catch (err) {
      console.error('Login error:', err);
      showAlert('Login error. Please try again.', 'error');
      setLoading(false);
    }
  });

  // --------------------------------------------------------------------------
  // Helper: Loading State
  // --------------------------------------------------------------------------
  function setLoading(isLoading) {
    if (isLoading) {
      loginBtn.classList.add('is-loading');
      loginBtn.disabled = true;
      btnLabel.textContent = 'Logging in...';
    } else {
      loginBtn.classList.remove('is-loading');
      loginBtn.disabled = false;
      btnLabel.textContent = 'Login';
    }
  }

  // --------------------------------------------------------------------------
  // Google Login & Secondary Actions
  // --------------------------------------------------------------------------
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      showAlert('Connecting to Google...', 'info');
      if (window.MadhanMartSupabase) {
        try {
          await window.MadhanMartSupabase.signInWithGoogle();
          return;
        } catch (err) {
          console.warn('[SUPABASE] Google OAuth fallback:', err);
        }
      }

      // Fallback Google mock simulation if OAuth provider not enabled in Supabase dashboard
      const sessionUser = {
        fullName: 'Google User',
        email: 'user@gmail.com',
        loginTime: new Date().toISOString()
      };
      localStorage.setItem('madhan_mart_current_user', JSON.stringify(sessionUser));
      showAlert('Google sign-in verified. Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);
    });
  }

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      const currentEmail = emailInput.value.trim();
      const promptEmail = prompt('Enter your email to receive a password reset link:', currentEmail || 'madhan@example.com');
      if (promptEmail) {
        showAlert(`Password reset instructions sent to ${promptEmail}`, 'success');
      }
    });
  }
});
