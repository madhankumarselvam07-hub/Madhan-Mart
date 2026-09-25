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
  // Form Submission Handler -> Redirects to Dashboard only on valid password
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
      if (!window.MadhanMartSupabase) {
        throw new Error('Authentication service is initializing. Please try again.');
      }

      // Strictly verify credentials via Supabase & local account store
      const sessionUser = await window.MadhanMartSupabase.signIn(emailValue, passwordValue);

      if (!sessionUser) {
        throw new Error('Invalid email or password. Please try again.');
      }

      // Handle remember me
      if (rememberMeCheckbox && rememberMeCheckbox.checked) {
        localStorage.setItem('madhan_mart_saved_email', emailValue);
      } else {
        localStorage.removeItem('madhan_mart_saved_email');
      }

      showAlert('Login successful! Redirecting to dashboard...', 'success');

      // Seamless redirect to dashboard
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 600);

    } catch (err) {
      console.warn('Login verification failed:', err.message || err);
      setLoading(false);
      const errMsg = err.message || 'Invalid email or password. Please try again.';
      setError(passwordGroup, passwordError, errMsg);
      showAlert(errMsg, 'error');
      passwordInput.focus();
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
  // Secondary Actions
  // --------------------------------------------------------------------------
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
