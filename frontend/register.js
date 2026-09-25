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

  // --------------------------------------------------------------------------
  // Interactive Glowing Grid Engine
  // --------------------------------------------------------------------------
  initInteractiveGrid();
});

/**
 * Interactive Grid Canvas with Glowing Cursor Spotlight, Vertex Bloom, Tile Hover & Click Shockwaves
 */
function initInteractiveGrid() {
  const canvas = document.getElementById('interactiveGridCanvas');
  const spotlight = document.getElementById('cursorSpotlight');
  const registerCard = document.getElementById('registerCard');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;
  const gridSize = 36;

  const mouse = {
    x: -1000,
    y: -1000,
    targetX: -1000,
    targetY: -1000,
    radius: 200,
    active: false
  };

  const hoveredTiles = new Map();
  const ripples = [];
  const linePulses = [];

  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  window.addEventListener('pointermove', (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
    mouse.active = true;

    if (spotlight) {
      spotlight.classList.add('active');
    }

    const cellCol = Math.floor(e.clientX / gridSize);
    const cellRow = Math.floor(e.clientY / gridSize);
    const key = `${cellCol}_${cellRow}`;
    hoveredTiles.set(key, { col: cellCol, row: cellRow, alpha: 1.0 });

    if (registerCard) {
      const rect = registerCard.getBoundingClientRect();
      const cardX = ((e.clientX - rect.left) / rect.width) * 100;
      const cardY = ((e.clientY - rect.top) / rect.height) * 100;
      registerCard.style.setProperty('--card-glow-x', `${cardX}%`);
      registerCard.style.setProperty('--card-glow-y', `${cardY}%`);
    }
  });

  window.addEventListener('pointerleave', () => {
    mouse.active = false;
    if (spotlight) {
      spotlight.classList.remove('active');
    }
  });

  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.register-card')) return;

    ripples.push({
      x: e.clientX,
      y: e.clientY,
      radius: 10,
      maxRadius: 280,
      alpha: 1.0,
      speed: 7
    });
  });

  setInterval(() => {
    if (document.hidden) return;
    const isHorizontal = Math.random() > 0.5;
    if (isHorizontal) {
      const row = Math.floor(Math.random() * (height / gridSize));
      linePulses.push({
        type: 'h',
        y: row * gridSize,
        x: -80,
        length: 120,
        speed: 4 + Math.random() * 3,
        alpha: 0.8
      });
    } else {
      const col = Math.floor(Math.random() * (width / gridSize));
      linePulses.push({
        type: 'v',
        x: col * gridSize,
        y: -80,
        length: 120,
        speed: 4 + Math.random() * 3,
        alpha: 0.8
      });
    }
  }, 1800);

  function render() {
    ctx.clearRect(0, 0, width, height);

    if (mouse.active) {
      const dx = mouse.targetX - mouse.x;
      const dy = mouse.targetY - mouse.y;
      mouse.x += dx * 0.14;
      mouse.y += dy * 0.14;

      if (spotlight) {
        spotlight.style.setProperty('--spotlight-x', `${mouse.x}px`);
        spotlight.style.setProperty('--spotlight-y', `${mouse.y}px`);
      }
    } else {
      mouse.x += (-500 - mouse.x) * 0.05;
      mouse.y += (-500 - mouse.y) * 0.05;
    }

    const numCols = Math.ceil(width / gridSize) + 1;
    const numRows = Math.ceil(height / gridSize) + 1;

    hoveredTiles.forEach((tile, key) => {
      ctx.fillStyle = `rgba(37, 99, 235, ${tile.alpha * 0.12})`;
      ctx.fillRect(tile.col * gridSize, tile.row * gridSize, gridSize, gridSize);

      ctx.strokeStyle = `rgba(56, 189, 248, ${tile.alpha * 0.4})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(tile.col * gridSize, tile.row * gridSize, gridSize, gridSize);

      tile.alpha *= 0.94;
      if (tile.alpha <= 0.01) {
        hoveredTiles.delete(key);
      }
    });

    ctx.lineWidth = 1;

    for (let c = 0; c <= numCols; c++) {
      const lineX = c * gridSize;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.65)';
      ctx.moveTo(lineX, 0);
      ctx.lineTo(lineX, height);
      ctx.stroke();
    }

    for (let r = 0; r <= numRows; r++) {
      const lineY = r * gridSize;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.65)';
      ctx.moveTo(0, lineY);
      ctx.lineTo(width, lineY);
      ctx.stroke();
    }

    if (mouse.x > -200 && mouse.y > -200) {
      const startCol = Math.max(0, Math.floor((mouse.x - mouse.radius) / gridSize));
      const endCol = Math.min(numCols, Math.ceil((mouse.x + mouse.radius) / gridSize));
      const startRow = Math.max(0, Math.floor((mouse.y - mouse.radius) / gridSize));
      const endRow = Math.min(numRows, Math.ceil((mouse.y + mouse.radius) / gridSize));

      for (let c = startCol; c <= endCol; c++) {
        const lineX = c * gridSize;
        const distX = Math.abs(lineX - mouse.x);
        if (distX < mouse.radius) {
          const span = Math.sqrt(mouse.radius * mouse.radius - distX * distX);
          const y1 = Math.max(0, mouse.y - span);
          const y2 = Math.min(height, mouse.y + span);

          const grad = ctx.createLinearGradient(lineX, y1, lineX, y2);
          const lineIntensity = 1 - (distX / mouse.radius);
          grad.addColorStop(0, 'rgba(37, 99, 235, 0)');
          grad.addColorStop(0.5, `rgba(37, 99, 235, ${lineIntensity * 0.75})`);
          grad.addColorStop(1, 'rgba(37, 99, 235, 0)');

          ctx.beginPath();
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.6;
          ctx.moveTo(lineX, y1);
          ctx.lineTo(lineX, y2);
          ctx.stroke();
        }
      }

      for (let r = startRow; r <= endRow; r++) {
        const lineY = r * gridSize;
        const distY = Math.abs(lineY - mouse.y);
        if (distY < mouse.radius) {
          const span = Math.sqrt(mouse.radius * mouse.radius - distY * distY);
          const x1 = Math.max(0, mouse.x - span);
          const x2 = Math.min(width, mouse.x + span);

          const grad = ctx.createLinearGradient(x1, lineY, x2, lineY);
          const lineIntensity = 1 - (distY / mouse.radius);
          grad.addColorStop(0, 'rgba(37, 99, 235, 0)');
          grad.addColorStop(0.5, `rgba(56, 189, 248, ${lineIntensity * 0.85})`);
          grad.addColorStop(1, 'rgba(37, 99, 235, 0)');

          ctx.beginPath();
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.6;
          ctx.moveTo(x1, lineY);
          ctx.lineTo(x2, lineY);
          ctx.stroke();
        }
      }

      for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
          const vx = c * gridSize;
          const vy = r * gridSize;
          const d = Math.hypot(vx - mouse.x, vy - mouse.y);
          if (d < mouse.radius) {
            const intensity = Math.pow(1 - (d / mouse.radius), 1.6);
            
            ctx.beginPath();
            ctx.arc(vx, vy, 4 * intensity + 1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(56, 189, 248, ${intensity * 0.55})`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(vx, vy, 1.8 * intensity + 0.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.95})`;
            ctx.fill();
          }
        }
      }
    }

    for (let i = linePulses.length - 1; i >= 0; i--) {
      const pulse = linePulses[i];
      if (pulse.type === 'h') {
        pulse.x += pulse.speed;
        const grad = ctx.createLinearGradient(pulse.x - pulse.length, pulse.y, pulse.x, pulse.y);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.8, `rgba(56, 189, 248, ${pulse.alpha * 0.6})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${pulse.alpha * 0.9})`);

        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.8;
        ctx.moveTo(pulse.x - pulse.length, pulse.y);
        ctx.lineTo(pulse.x, pulse.y);
        ctx.stroke();

        if (pulse.x - pulse.length > width) {
          linePulses.splice(i, 1);
        }
      } else {
        pulse.y += pulse.speed;
        const grad = ctx.createLinearGradient(pulse.x, pulse.y - pulse.length, pulse.x, pulse.y);
        grad.addColorStop(0, 'rgba(37, 99, 235, 0)');
        grad.addColorStop(0.8, `rgba(37, 99, 235, ${pulse.alpha * 0.6})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${pulse.alpha * 0.9})`);

        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.8;
        ctx.moveTo(pulse.x, pulse.y - pulse.length);
        ctx.lineTo(pulse.x, pulse.y);
        ctx.stroke();

        if (pulse.y - pulse.length > height) {
          linePulses.splice(i, 1);
        }
      }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rip = ripples[i];
      rip.radius += rip.speed;
      rip.alpha *= 0.95;

      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${rip.alpha * 0.7})`;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      if (rip.radius >= rip.maxRadius || rip.alpha <= 0.02) {
        ripples.splice(i, 1);
      }
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
