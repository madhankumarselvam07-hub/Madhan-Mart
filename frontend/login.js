/**
 * MADHAN MART - Login Page Script
 * Pure Vanilla JavaScript (3-Role Support: Buyer, Seller, Admin)
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
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');

  // 3-Role Elements
  const roleTabs = document.querySelectorAll('.role-tab');
  const loginTitle = document.getElementById('loginTitle');
  const loginSubtitle = document.getElementById('loginSubtitle');
  const createAccountLink = document.getElementById('createAccountLink');
  const signupPromptContainer = document.getElementById('signupPromptContainer');

  let currentRole = 'buyer';

  const ROLE_CONFIGS = {
    buyer: {
      title: 'Buyer Sign In',
      subtitle: 'Enter your email and password to shop & track orders',
      btnText: 'Login as Buyer',
      emailPlaceholder: 'Enter your buyer email',
      signupText: 'Create Buyer Account',
      signupRole: 'buyer',
      showSignup: true
    },
    seller: {
      title: 'Seller Portal Login',
      subtitle: 'Sign in to manage your inventory and customer orders',
      btnText: 'Login as Seller',
      emailPlaceholder: 'Enter your seller email',
      signupText: 'Register as a Seller',
      signupRole: 'seller',
      showSignup: true
    },
    admin: {
      title: 'Admin Control Login',
      subtitle: 'Sign in with administrator credentials to manage platform',
      btnText: 'Login as Administrator',
      emailPlaceholder: 'Enter administrator email',
      signupText: 'Admin accounts are pre-configured',
      signupRole: 'admin',
      showSignup: false
    }
  };

  function applyRole(role) {
    currentRole = role;
    const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.buyer;

    // Update active tab
    roleTabs.forEach(tab => {
      const isMatch = tab.getAttribute('data-role') === role;
      tab.classList.toggle('active', isMatch);
      tab.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    // Update Headings & UI
    if (loginTitle) loginTitle.textContent = config.title;
    if (loginSubtitle) loginSubtitle.textContent = config.subtitle;
    if (btnLabel) btnLabel.textContent = config.btnText;
    if (emailInput) emailInput.placeholder = config.emailPlaceholder;

    // Update signup footer
    if (signupPromptContainer) {
      if (config.showSignup) {
        signupPromptContainer.innerHTML = `Don’t have an account? <a href="register.html?role=${config.signupRole}" class="create-account-link" id="createAccountLink">${config.signupText}</a>`;
      } else {
        signupPromptContainer.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem;">System Administrator access</span>`;
      }
    }
  }

  // Handle Tab Switching
  roleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const selected = tab.getAttribute('data-role');
      applyRole(selected);
      hideAlert();
      clearError(emailGroup, emailError);
      clearError(passwordGroup, passwordError);
    });
  });

  // Check URL parameters (e.g. role, registered=true, email)
  const urlParams = new URLSearchParams(window.location.search);
  const paramRole = urlParams.get('role');
  if (paramRole && ROLE_CONFIGS[paramRole]) {
    applyRole(paramRole);
  } else {
    applyRole('buyer');
  }

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
    if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
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
      return { valid: false, message: 'Please enter a valid email address.' };
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

  // Live Validation Clearing
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
  // Form Submission Handler -> Authenticates & Redirects to Dashboard
  // --------------------------------------------------------------------------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const emailValue = emailInput.value.trim();
    const passwordValue = passwordInput.value;

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

    setLoading(true);

    try {
      if (!window.MadhanMartSupabase) {
        throw new Error('Authentication service is initializing. Please try again.');
      }

      // Verify credentials via Supabase & PostgreSQL Store
      const sessionUser = await window.MadhanMartSupabase.signIn(emailValue, passwordValue, currentRole);

      if (!sessionUser) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }

      // Save user role in current user session
      sessionUser.role = sessionUser.role || currentRole;
      localStorage.setItem('madhan_mart_current_user', JSON.stringify(sessionUser));

      if (rememberMeCheckbox && rememberMeCheckbox.checked) {
        localStorage.setItem('madhan_mart_saved_email', emailValue);
      } else {
        localStorage.removeItem('madhan_mart_saved_email');
      }

      showAlert(`Login successful! Redirecting...`, 'success');

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);

    } catch (err) {
      console.warn('Login verification failed:', err.message || err);
      setLoading(false);
      const errMsg = err.message || 'Invalid email or password. Please check your credentials and try again.';
      setError(passwordGroup, passwordError, errMsg);
      showAlert(errMsg, 'error');
      passwordInput.focus();
    }
  });

  function setLoading(isLoading) {
    const config = ROLE_CONFIGS[currentRole] || ROLE_CONFIGS.buyer;
    if (isLoading) {
      loginBtn.classList.add('is-loading');
      loginBtn.disabled = true;
      btnLabel.textContent = 'Authenticating...';
    } else {
      loginBtn.classList.remove('is-loading');
      loginBtn.disabled = false;
      btnLabel.textContent = config.btnText;
    }
  }

  // Secondary Actions
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      const currentEmail = emailInput.value.trim();
      const promptEmail = prompt('Enter your email to receive a password reset link:', currentEmail || '');
      if (promptEmail) {
        showAlert(`Password reset instructions sent to ${promptEmail}`, 'success');
      }
    });
  }

  // --------------------------------------------------------------------------
  // Instant & Fluid Mouse-Following Glow Effect
  // --------------------------------------------------------------------------
  const cursorHalo = document.getElementById('cursorGlowHalo');
  const cursorBeam = document.getElementById('cursorGlowBeam');
  const loginCard = document.getElementById('loginCard');

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let rafPending = false;

  function updateGlowTransform() {
    currentX += (targetX - currentX) * 0.35;
    currentY += (targetY - currentY) * 0.35;

    const transformStr = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0) translate(-50%, -50%)`;

    if (cursorHalo) cursorHalo.style.transform = transformStr;
    if (cursorBeam) cursorBeam.style.transform = transformStr;

    if (loginCard) {
      const rect = loginCard.getBoundingClientRect();
      const cardX = targetX - rect.left;
      const cardY = targetY - rect.top;
      loginCard.style.setProperty('--card-mouse-x', `${cardX.toFixed(1)}px`);
      loginCard.style.setProperty('--card-mouse-y', `${cardY.toFixed(1)}px`);
    }

    if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
      requestAnimationFrame(updateGlowTransform);
    } else {
      rafPending = false;
    }
  }

  function handlePointerMove(e) {
    targetX = e.clientX;
    targetY = e.clientY;

    if (cursorHalo && cursorHalo.style.opacity === '0') cursorHalo.style.opacity = '1';
    if (cursorBeam && cursorBeam.style.opacity === '0') cursorBeam.style.opacity = '1';

    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(updateGlowTransform);
    }
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('mousemove', handlePointerMove, { passive: true });

  window.addEventListener('mouseleave', () => {
    if (cursorHalo) cursorHalo.style.opacity = '0';
    if (cursorBeam) cursorBeam.style.opacity = '0';
  });

  window.addEventListener('mouseenter', () => {
    if (cursorHalo) cursorHalo.style.opacity = '1';
    if (cursorBeam) cursorBeam.style.opacity = '1';
  });

  const initialTransform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
  if (cursorHalo) cursorHalo.style.transform = initialTransform;
  if (cursorBeam) cursorBeam.style.transform = initialTransform;
});
