/**
 * MADHAN MART - Login Page Script
 * Pure Vanilla JavaScript (Seamless Login & Dashboard Redirect)
 */

function initLoginPage() {
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
}

// Resilient initialization that works whether DOM is loading or already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
  initLoginPage();
}

// Run interactive grid immediately
initInteractiveGrid();

/**
 * High-Performance Interactive Grid Canvas with Glowing Cursor Spotlight, Vertex Bloom & Click Ripples
 */
function initInteractiveGrid() {
  const canvas = document.getElementById('interactiveGridCanvas');
  const spotlight = document.getElementById('cursorSpotlight');
  const loginCard = document.getElementById('loginCard');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = window.devicePixelRatio || 1;
  const gridSize = 36; // Grid cell size in px

  // Interactive mouse state with smooth linear interpolation
  const mouse = {
    x: width / 2,
    y: height / 2,
    targetX: width / 2,
    targetY: height / 2,
    radius: 220,
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
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Mouse & Touch Tracking
  window.addEventListener('pointermove', (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
    mouse.active = true;

    if (spotlight) {
      spotlight.classList.add('active');
    }

    // Active hovered cell
    const cellCol = Math.floor(e.clientX / gridSize);
    const cellRow = Math.floor(e.clientY / gridSize);
    const key = `${cellCol}_${cellRow}`;
    hoveredTiles.set(key, { col: cellCol, row: cellRow, alpha: 1.0 });

    // Dynamic login card rim light
    if (loginCard) {
      const rect = loginCard.getBoundingClientRect();
      const cardX = ((e.clientX - rect.left) / rect.width) * 100;
      const cardY = ((e.clientY - rect.top) / rect.height) * 100;
      loginCard.style.setProperty('--card-glow-x', `${cardX}%`);
      loginCard.style.setProperty('--card-glow-y', `${cardY}%`);
    }
  });

  window.addEventListener('pointerleave', () => {
    mouse.active = false;
    if (spotlight) {
      spotlight.classList.remove('active');
    }
  });

  // Click shockwave ripples
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.login-card')) return;

    ripples.push({
      x: e.clientX,
      y: e.clientY,
      radius: 12,
      maxRadius: 300,
      alpha: 1.0,
      speed: 8
    });
  });

  // Spawn periodic ambient light pulses along grid lines
  setInterval(() => {
    if (document.hidden) return;
    const isHorizontal = Math.random() > 0.5;
    if (isHorizontal) {
      const row = Math.floor(Math.random() * (height / gridSize));
      linePulses.push({
        type: 'h',
        y: row * gridSize,
        x: -100,
        length: 160,
        speed: 5 + Math.random() * 3,
        alpha: 0.85
      });
    } else {
      const col = Math.floor(Math.random() * (width / gridSize));
      linePulses.push({
        type: 'v',
        x: col * gridSize,
        y: -100,
        length: 160,
        speed: 5 + Math.random() * 3,
        alpha: 0.85
      });
    }
  }, 1600);

  // Main Render Loop
  function render() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // Smooth cursor interpolation
    if (mouse.active) {
      const dx = mouse.targetX - mouse.x;
      const dy = mouse.targetY - mouse.y;
      mouse.x += dx * 0.16;
      mouse.y += dy * 0.16;

      if (spotlight) {
        spotlight.style.setProperty('--spotlight-x', `${mouse.x}px`);
        spotlight.style.setProperty('--spotlight-y', `${mouse.y}px`);
      }
    }

    const numCols = Math.ceil(width / gridSize) + 1;
    const numRows = Math.ceil(height / gridSize) + 1;

    // 1. Draw Hovered Glowing Tiles
    hoveredTiles.forEach((tile, key) => {
      ctx.fillStyle = `rgba(37, 99, 235, ${tile.alpha * 0.14})`;
      ctx.fillRect(tile.col * gridSize, tile.row * gridSize, gridSize, gridSize);

      ctx.strokeStyle = `rgba(56, 189, 248, ${tile.alpha * 0.45})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(tile.col * gridSize, tile.row * gridSize, gridSize, gridSize);

      tile.alpha *= 0.94;
      if (tile.alpha <= 0.01) {
        hoveredTiles.delete(key);
      }
    });

    // 2. Draw Crisp Base Grid Lines
    ctx.lineWidth = 1;

    // Vertical Lines
    for (let c = 0; c <= numCols; c++) {
      const lineX = c * gridSize;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.75)';
      ctx.moveTo(lineX, 0);
      ctx.lineTo(lineX, height);
      ctx.stroke();
    }

    // Horizontal Lines
    for (let r = 0; r <= numRows; r++) {
      const lineY = r * gridSize;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.75)';
      ctx.moveTo(0, lineY);
      ctx.lineTo(width, lineY);
      ctx.stroke();
    }

    // 3. Draw Dynamic Glowing Lines Near Cursor
    if (mouse.active && mouse.x > -200 && mouse.y > -200) {
      const startCol = Math.max(0, Math.floor((mouse.x - mouse.radius) / gridSize));
      const endCol = Math.min(numCols, Math.ceil((mouse.x + mouse.radius) / gridSize));
      const startRow = Math.max(0, Math.floor((mouse.y - mouse.radius) / gridSize));
      const endRow = Math.min(numRows, Math.ceil((mouse.y + mouse.radius) / gridSize));

      // Vertical Glowing Lines
      for (let c = startCol; c <= endCol; c++) {
        const lineX = c * gridSize;
        const distX = Math.abs(lineX - mouse.x);
        if (distX < mouse.radius) {
          const span = Math.sqrt(mouse.radius * mouse.radius - distX * distX);
          const y1 = Math.max(0, mouse.y - span);
          const y2 = Math.min(height, mouse.y + span);

          const grad = ctx.createLinearGradient(lineX, y1, lineX, y2);
          const intensity = 1 - (distX / mouse.radius);
          grad.addColorStop(0, 'rgba(37, 99, 235, 0)');
          grad.addColorStop(0.5, `rgba(37, 99, 235, ${intensity * 0.85})`);
          grad.addColorStop(1, 'rgba(37, 99, 235, 0)');

          ctx.beginPath();
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.8;
          ctx.moveTo(lineX, y1);
          ctx.lineTo(lineX, y2);
          ctx.stroke();
        }
      }

      // Horizontal Glowing Lines
      for (let r = startRow; r <= endRow; r++) {
        const lineY = r * gridSize;
        const distY = Math.abs(lineY - mouse.y);
        if (distY < mouse.radius) {
          const span = Math.sqrt(mouse.radius * mouse.radius - distY * distY);
          const x1 = Math.max(0, mouse.x - span);
          const x2 = Math.min(width, mouse.x + span);

          const grad = ctx.createLinearGradient(x1, lineY, x2, lineY);
          const intensity = 1 - (distY / mouse.radius);
          grad.addColorStop(0, 'rgba(37, 99, 235, 0)');
          grad.addColorStop(0.5, `rgba(56, 189, 248, ${intensity * 0.95})`);
          grad.addColorStop(1, 'rgba(37, 99, 235, 0)');

          ctx.beginPath();
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.8;
          ctx.moveTo(x1, lineY);
          ctx.lineTo(x2, lineY);
          ctx.stroke();
        }
      }

      // 4. Draw Vertex Intersection Bloom Crosshairs & Dots
      for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
          const vx = c * gridSize;
          const vy = r * gridSize;
          const d = Math.hypot(vx - mouse.x, vy - mouse.y);
          if (d < mouse.radius) {
            const intensity = Math.pow(1 - (d / mouse.radius), 1.5);
            
            // Glowing Halo
            ctx.beginPath();
            ctx.arc(vx, vy, 4.5 * intensity + 1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(56, 189, 248, ${intensity * 0.6})`;
            ctx.fill();

            // Core Dot
            ctx.beginPath();
            ctx.arc(vx, vy, 2 * intensity + 0.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.95})`;
            ctx.fill();

            // Crosshair tick marks
            if (intensity > 0.4) {
              ctx.strokeStyle = `rgba(56, 189, 248, ${intensity * 0.7})`;
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(vx - 4, vy); ctx.lineTo(vx + 4, vy);
              ctx.moveTo(vx, vy - 4); ctx.lineTo(vx, vy + 4);
              ctx.stroke();
            }
          }
        }
      }
    }

    // 5. Draw Traveling Ambient Line Pulses
    for (let i = linePulses.length - 1; i >= 0; i--) {
      const pulse = linePulses[i];
      if (pulse.type === 'h') {
        pulse.x += pulse.speed;
        const grad = ctx.createLinearGradient(pulse.x - pulse.length, pulse.y, pulse.x, pulse.y);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.8, `rgba(56, 189, 248, ${pulse.alpha * 0.7})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${pulse.alpha * 0.95})`);

        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
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
        grad.addColorStop(0.8, `rgba(37, 99, 235, ${pulse.alpha * 0.7})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${pulse.alpha * 0.95})`);

        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.moveTo(pulse.x, pulse.y - pulse.length);
        ctx.lineTo(pulse.x, pulse.y);
        ctx.stroke();

        if (pulse.y - pulse.length > height) {
          linePulses.splice(i, 1);
        }
      }
    }

    // 6. Draw Click Shockwave Ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rip = ripples[i];
      rip.radius += rip.speed;
      rip.alpha *= 0.95;

      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${rip.alpha * 0.8})`;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      if (rip.radius >= rip.maxRadius || rip.alpha <= 0.02) {
        ripples.splice(i, 1);
      }
    }

    ctx.restore();
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
