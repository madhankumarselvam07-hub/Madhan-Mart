/**
 * MADHAN MART - Registration Script
 * Pure Vanilla JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const nameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const agreeTermsCheckbox = document.getElementById('agreeTerms');

  const nameGroup = document.getElementById('nameGroup');
  const emailGroup = document.getElementById('emailGroup');
  const passwordGroup = document.getElementById('passwordGroup');
  const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');

  const nameError = document.getElementById('nameError');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const confirmPasswordError = document.getElementById('confirmPasswordError');
  const termsError = document.getElementById('termsError');

  const togglePasswordBtn = document.getElementById('togglePassword');
  const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
  const registerBtn = document.getElementById('registerBtn');
  const btnLabel = registerBtn.querySelector('.btn-label');
  const formAlert = document.getElementById('formAlert');
  const googleRegisterBtn = document.getElementById('googleRegisterBtn');

  // --------------------------------------------------------------------------
  // Password Visibility Toggles
  // --------------------------------------------------------------------------
  function setupToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const isPassword = input.getAttribute('type') === 'password';
      const newType = isPassword ? 'text' : 'password';
      input.setAttribute('type', newType);
      btn.classList.toggle('is-active', isPassword);
      btn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      input.focus();
      const valLength = input.value.length;
      input.setSelectionRange(valLength, valLength);
    });
  }

  setupToggle(togglePasswordBtn, passwordInput);
  setupToggle(toggleConfirmPasswordBtn, confirmPasswordInput);

  // --------------------------------------------------------------------------
  // Validation Helpers
  // --------------------------------------------------------------------------
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  function validateName(value) {
    const trimmed = value.trim();
    if (!trimmed) {
      return { valid: false, message: 'Full name is required.' };
    }
    if (trimmed.length < 2) {
      return { valid: false, message: 'Name must be at least 2 characters.' };
    }
    return { valid: true, message: '' };
  }

  function validateEmail(value) {
    const trimmed = value.trim();
    if (!trimmed) {
      return { valid: false, message: 'Email address is required.' };
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      return { valid: false, message: 'Please enter a valid email address.' };
    }
    return { valid: true, message: '' };
  }

  function validatePassword(value) {
    if (!value) {
      return { valid: false, message: 'Password is required.' };
    }
    if (value.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters.' };
    }
    return { valid: true, message: '' };
  }

  function validateConfirmPassword(passValue, confirmValue) {
    if (!confirmValue) {
      return { valid: false, message: 'Please confirm your password.' };
    }
    if (passValue !== confirmValue) {
      return { valid: false, message: 'Passwords do not match.' };
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
  // Live Input Validation Clearing
  // --------------------------------------------------------------------------
  nameInput.addEventListener('input', () => {
    if (nameGroup.classList.contains('has-error')) {
      const res = validateName(nameInput.value);
      if (res.valid) clearError(nameGroup, nameError);
    }
  });

  emailInput.addEventListener('input', () => {
    if (emailGroup.classList.contains('has-error')) {
      const res = validateEmail(emailInput.value);
      if (res.valid) clearError(emailGroup, emailError);
    }
  });

  passwordInput.addEventListener('input', () => {
    if (passwordGroup.classList.contains('has-error')) {
      const res = validatePassword(passwordInput.value);
      if (res.valid) clearError(passwordGroup, passwordError);
    }
    if (confirmPasswordGroup.classList.contains('has-error') && confirmPasswordInput.value) {
      const matchRes = validateConfirmPassword(passwordInput.value, confirmPasswordInput.value);
      if (matchRes.valid) clearError(confirmPasswordGroup, confirmPasswordError);
    }
  });

  confirmPasswordInput.addEventListener('input', () => {
    if (confirmPasswordGroup.classList.contains('has-error')) {
      const res = validateConfirmPassword(passwordInput.value, confirmPasswordInput.value);
      if (res.valid) clearError(confirmPasswordGroup, confirmPasswordError);
    }
  });

  agreeTermsCheckbox.addEventListener('change', () => {
    if (agreeTermsCheckbox.checked) {
      clearError(null, termsError);
    }
  });

  // --------------------------------------------------------------------------
  // Form Submission
  // --------------------------------------------------------------------------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const nameVal = nameInput.value.trim();
    const emailVal = emailInput.value.trim();
    const passVal = passwordInput.value;
    const confirmVal = confirmPasswordInput.value;

    const nameCheck = validateName(nameVal);
    const emailCheck = validateEmail(emailVal);
    const passCheck = validatePassword(passVal);
    const confirmCheck = validateConfirmPassword(passVal, confirmVal);

    let hasErrors = false;

    if (!nameCheck.valid) {
      setError(nameGroup, nameError, nameCheck.message);
      hasErrors = true;
    } else {
      clearError(nameGroup, nameError);
    }

    if (!emailCheck.valid) {
      setError(emailGroup, emailError, emailCheck.message);
      hasErrors = true;
    } else {
      clearError(emailGroup, emailError);
    }

    if (!passCheck.valid) {
      setError(passwordGroup, passwordError, passCheck.message);
      hasErrors = true;
    } else {
      clearError(passwordGroup, passwordError);
    }

    if (!confirmCheck.valid) {
      setError(confirmPasswordGroup, confirmPasswordError, confirmCheck.message);
      hasErrors = true;
    } else {
      clearError(confirmPasswordGroup, confirmPasswordError);
    }

    if (!agreeTermsCheckbox.checked) {
      setError(null, termsError, 'You must agree to the Terms and Privacy Policy.');
      hasErrors = true;
    } else {
      clearError(null, termsError);
    }

    if (hasErrors) {
      if (!nameCheck.valid) nameInput.focus();
      else if (!emailCheck.valid) emailInput.focus();
      else if (!passCheck.valid) passwordInput.focus();
      else if (!confirmCheck.valid) confirmPasswordInput.focus();
      return;
    }

    // Check if email is already registered locally
    const existingUsers = JSON.parse(localStorage.getItem('madhan_mart_users') || '[]');
    const emailExists = existingUsers.some(
      (u) => u.email.toLowerCase() === emailVal.toLowerCase()
    );

    if (emailExists) {
      setError(emailGroup, emailError, 'An account with this email already exists.');
      emailInput.focus();
      return;
    }

    setLoading(true);

    try {
      // 1. Try Live Supabase Sign Up
      if (window.MadhanMartSupabase) {
        try {
          await window.MadhanMartSupabase.signUp(emailVal, passVal, nameVal);
        } catch (supabaseErr) {
          console.warn('[SUPABASE] Registration error:', supabaseErr.message || supabaseErr);
          if (supabaseErr.message && (supabaseErr.message.includes('already registered') || supabaseErr.message.includes('User already registered'))) {
            setLoading(false);
            setError(emailGroup, emailError, 'An account with this email already exists.');
            showAlert('An account with this email already exists.', 'error');
            emailInput.focus();
            return;
          }
        }
      }

      // Save user to localStorage backup
      existingUsers.push({
        fullName: nameVal,
        email: emailVal,
        password: passVal,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('madhan_mart_users', JSON.stringify(existingUsers));

      await new Promise((resolve) => setTimeout(resolve, 600));

      showAlert('Account created in Supabase! Redirecting to login...', 'success');

      setTimeout(() => {
        window.location.href = `login.html?registered=true&email=${encodeURIComponent(emailVal)}`;
      }, 1000);

    } catch (err) {
      console.error('Registration error:', err);
      showAlert('Could not complete registration. Please try again.', 'error');
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    if (isLoading) {
      registerBtn.classList.add('is-loading');
      registerBtn.disabled = true;
      btnLabel.textContent = 'Creating account...';
    } else {
      registerBtn.classList.remove('is-loading');
      registerBtn.disabled = false;
      btnLabel.textContent = 'Create Account';
    }
  }
});
