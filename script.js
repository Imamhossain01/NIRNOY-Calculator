(function () {
  'use strict';

  let isMuted = false;
  const soundBtn = document.getElementById('soundBtn');
  const soundIcon = document.getElementById('soundIcon');
  
  const muteSvg = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
  const unMuteSvg = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';

  soundBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    soundIcon.innerHTML = isMuted ? muteSvg : unMuteSvg;
    soundBtn.style.opacity = isMuted ? '0.5' : '1';
  });

  const clickAudio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJzP32KGe3p6fX6Xk5OTk5OTh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4g=");

  function playClickSound() {
    if (isMuted) return;
    try {
      clickAudio.currentTime = 0;
      clickAudio.play().catch(e => console.log("Audio play blocked", e));
    } catch (e) {
      console.log("Audio error", e);
    }
  }

  const el = {
    calculator: document.getElementById('calculator'),
    modeToggle: document.getElementById('modeToggle'),
    expression: document.getElementById('expression'),
    current: document.getElementById('current'),
    keys: document.getElementById('keys')
  };

  const state = {
    current: '0',
    previous: null,
    operator: null,
    expression: '',
    justEvaluated: false,
    overwrite: true
  };

  let sciMode = false;
  el.modeToggle.addEventListener('click', () => {
    sciMode = !sciMode;
    el.modeToggle.classList.toggle('sci', sciMode);
    el.modeToggle.classList.toggle('basic', !sciMode);
    el.calculator.classList.toggle('sci-mode', sciMode);
    playClickSound();
  });

  function updateDisplay() {
    el.expression.textContent = state.expression || '\u00A0';
    el.current.textContent = formatNumber(state.current);
    el.current.classList.toggle('shrink', el.current.textContent.length > 9);
  }

  function formatNumber(value) {
    if (value === 'Error') return value;
    const num = Number(value);
    if (!isFinite(num)) return 'Error';
    
    let str = String(value);
    if (str.includes('.')) {
      const parts = str.split('.');
      if (parts[1].length > 8) {
        str = num.toFixed(8).replace(/\.?0+$/, '');
      }
    }
    return str;
  }

  function inputDigit(digit) {
    if (state.overwrite || state.justEvaluated) {
      state.current = digit === '.' ? '0.' : digit;
      state.overwrite = false;
      state.justEvaluated = false;
    } else {
      if (state.current.replace('-', '').replace('.', '').length >= 15) return;
      state.current += digit;
    }
    updateDisplay();
  }

  function inputDecimal() {
    if (state.overwrite || state.justEvaluated) {
      state.current = '0.';
      state.overwrite = false;
      state.justEvaluated = false;
    } else if (!state.current.includes('.')) {
      state.current += '.';
    }
    updateDisplay();
  }

  function chooseOperator(op) {
    if (state.operator && state.overwrite) {
      state.operator = op;
      state.expression = `${formatNumber(String(state.previous))} ${op}`;
      highlightOperator(op);
      updateDisplay();
      return;
    }
    if (state.previous === null) {
      state.previous = parseFloat(state.current);
    } else if (!state.overwrite) {
      state.previous = compute(state.previous, parseFloat(state.current), state.operator);
    }
    state.operator = op;
    state.expression = `${formatNumber(String(state.previous))} ${op}`;
    state.current = String(state.previous);
    state.overwrite = true;
    state.justEvaluated = false;
    highlightOperator(op);
    updateDisplay();
  }

  function compute(a, b, op) {
    switch (op) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b === 0 ? NaN : a / b;
      case '^': return Math.pow(a, b);
      default: return b;
    }
  }

  function evaluate() {
    if (state.operator === null || state.previous === null) return;
    const result = compute(state.previous, parseFloat(state.current), state.operator);
    state.expression = `${formatNumber(String(state.previous))} ${state.operator} ${formatNumber(state.current)} =`;
    state.current = isNaN(result) ? 'Error' : String(result);
    state.previous = null;
    state.operator = null;
    state.overwrite = true;
    state.justEvaluated = true;
    clearOperatorHighlight();
    updateDisplay();
  }

  function clearAll() {
    state.current = '0'; state.previous = null; state.operator = null;
    state.expression = ''; state.overwrite = true; state.justEvaluated = false;
    clearOperatorHighlight(); updateDisplay();
  }

  function negate() {
    if (state.current !== '0' && state.current !== 'Error') {
      state.current = state.current.startsWith('-') ? state.current.slice(1) : '-' + state.current;
      updateDisplay();
    }
  }

  function percent() {
    const num = parseFloat(state.current);
    if (!isNaN(num)) { state.current = String(num / 100); updateDisplay(); }
  }

  function applyScientific(action) {
    const num = parseFloat(state.current);
    if (isNaN(num)) return;
    let result;
    const rad = num * (Math.PI / 180);
    
    switch (action) {
      case 'sin': result = Math.sin(rad); break;
      case 'cos': result = Math.cos(rad); break;
      case 'tan': result = Math.tan(rad); break;
      case 'sinh': result = Math.sinh(num); break;
      case 'cosh': result = Math.cosh(num); break;
      case 'tanh': result = Math.tanh(num); break;
      case 'log': result = num > 0 ? Math.log10(num) : NaN; break;
      case 'ln': result = num > 0 ? Math.log(num) : NaN; break;
      case 'e': result = Math.E; break;
      case 'sqr': result = Math.pow(num, 2); break;
      case 'cube': result = Math.pow(num, 3); break;
      case 'sqrt': result = num >= 0 ? Math.sqrt(num) : NaN; break;
      case 'cbrt': result = Math.cbrt(num); break;
      case 'pi': result = Math.PI; break;
      default: return;
    }
    
    state.expression = `${action}(${formatNumber(String(num))}) =`;
    state.current = isNaN(result) ? 'Error' : String(result);
    state.overwrite = true;
    state.justEvaluated = true;
    updateDisplay();
  }

  function highlightOperator(activeOp) {
    document.querySelectorAll('.key.operator').forEach(btn => btn.classList.toggle('active', btn.dataset.op === activeOp));
  }
  function clearOperatorHighlight() {
    document.querySelectorAll('.key.operator').forEach(btn => btn.classList.remove('active'));
  }

  function createRipple(e, btn) {
    const circle = document.createElement('span');
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const radius = diameter / 2;
    const rect = btn.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${clientX - rect.left - radius}px`;
    circle.style.top = `${clientY - rect.top - radius}px`;
    circle.classList.add('ripple');
    
    const existing = btn.querySelector('.ripple');
    if (existing) existing.remove();
    btn.appendChild(circle);
  }

  el.keys.addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (!btn) return;
    
    createRipple(e, btn);
    playClickSound();
    
    if (btn.dataset.num !== undefined) return inputDigit(btn.dataset.num);
    if (btn.dataset.op !== undefined) return chooseOperator(btn.dataset.op);
    
    switch (btn.dataset.action) {
      case 'clear': clearAll(); break;
      case 'negate': negate(); break;
      case 'percent': percent(); break;
      case 'decimal': inputDecimal(); break;
      case 'equals': evaluate(); break;
      case 'pow': chooseOperator('^'); break;
      default:
        if (btn.dataset.action) applyScientific(btn.dataset.action);
    }
  });

  window.addEventListener('keydown', (e) => {
    playClickSound();
    if (e.key >= '0' && e.key <= '9') inputDigit(e.key);
    else if (e.key === '.') inputDecimal();
    else if (e.key === '+') chooseOperator('+');
    else if (e.key === '-') chooseOperator('−');
    else if (e.key === '*') chooseOperator('×');
    else if (e.key === '/') { e.preventDefault(); chooseOperator('÷'); }
    else if (e.key === 'Enter' || e.key === '=') evaluate();
    else if (e.key === 'Escape') clearAll();
    else if (e.key === 'Backspace') {
      state.current = state.current.length > 1 ? state.current.slice(0, -1) : '0';
      updateDisplay();
    }
  });

  updateDisplay();
})();