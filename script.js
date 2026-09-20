(function () {
  'use strict';

  /* ---------------- Sound ---------------- */
  let isMuted = false;
  const soundBtn = document.getElementById('soundBtn');
  const soundIcon = document.getElementById('soundIcon');

  const muteSvg = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
  const unMuteSvg = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      soundIcon.innerHTML = isMuted ? muteSvg : unMuteSvg;
      soundBtn.style.opacity = isMuted ? '0.5' : '1';
    });
  }

  const clickAudio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJzP32KGe3p6fX6Xk5OTk5OTh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4g=");

  function playClickSound() {
    if (isMuted) return;
    try {
      clickAudio.currentTime = 0;
      clickAudio.play().catch(e => {
        // Audio might block if no user interaction, ignoring silently
      });
    } catch (e) {
      // Ignored
    }
  }

  /* ---------------- Elements ---------------- */
  const el = {
    calculator: document.getElementById('calculator'),
    modeToggleBtn: document.getElementById('modeToggleBtn'),
    expression: document.getElementById('expression'),
    current: document.getElementById('current'),
    keys: document.getElementById('keys'),
    historyBtn: document.getElementById('historyBtn'),
    closeHistoryBtn: document.getElementById('closeHistoryBtn'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    historyPanel: document.getElementById('historyPanel'),
    historyList: document.getElementById('historyList'),
    backspaceBtn: document.getElementById('backspaceBtn')
  };

  const state = { 
    expr: '', 
    expression: '', 
    justEvaluated: false 
  };

  /* ---------------- Scientific Mode Toggle ---------------- */
  let sciMode = false;
  if (el.modeToggleBtn) {
    el.modeToggleBtn.addEventListener('click', () => {
      sciMode = !sciMode;
      
      // Toggle button classes for sliding effect
      el.modeToggleBtn.classList.toggle('active', sciMode);
      
      // Toggle text highlight
      const texts = el.modeToggleBtn.querySelectorAll('.switch-text');
      if(texts.length === 2) {
        texts[0].classList.toggle('active', !sciMode);
        texts[1].classList.toggle('active', sciMode);
      }

      // Toggle calculator mode
      el.calculator.classList.toggle('sci-mode', sciMode);
      
      playClickSound();
    });
  }

  /* ---------------- Display helpers ---------------- */
  function formatNumber(value) {
    if (value === 'Error') {
      return value;
    }
    const num = Number(value);
    if (!isFinite(num)) {
      return 'Error';
    }
    
    let str = String(value);
    if (str.includes('.')) {
      const parts = str.split('.');
      if (parts[1].length > 8) {
        str = num.toFixed(8).replace(/\.?0+$/, '');
      }
    }
    return str;
  }

  function updateDisplay() {
    el.expression.textContent = state.expression || '\u00A0';
    const shown = state.expr === '' ? '0' : state.expr;
    el.current.textContent = shown;
    
    const len = shown.length;
    el.current.classList.toggle('shrink', len > 10 && len <= 17);
    el.current.classList.toggle('shrink-more', len > 17);
    
    syncOperatorHighlight();
  }

  function syncOperatorHighlight() {
    const last = state.expr.slice(-1);
    document.querySelectorAll('.key.operator').forEach(btn => {
      btn.classList.toggle('active', !state.justEvaluated && last === btn.dataset.op);
    });
  }

  /* ---------------- Expression engine ---------------- */
  // Use exact Unicode chars to match HTML (Minus = \u2212, Multiply = \u00D7, Divide = \u00F7)
  const OP_CHARS = '+\u2212\u00D7\u00F7^';
  const isOperator = (ch) => OP_CHARS.includes(ch);
  const canPrecedeImplicitMultiply = (ch) => /[0-9)πe]/.test(ch || '');

  function toJsExpr(expr) {
    let s = expr;
    const open = (s.match(/\(/g) || []).length;          const close = (s.match(/\)/g) || []).length;
    
    if (open > close) {
      s += ')'.repeat(open - close);
    }
    
    // Convert math symbols to JavaScript operators
    s = s.replace(/\u00D7/g, '*') // × to *
         .replace(/\u00F7/g, '/') // ÷ to /
         .replace(/\u2212/g, '-') // − to -
         .replace(/\^/g, '**')
         .replace(/π/g, 'Math.PI')
         .replace(/e/g, 'Math.E');
         
    return s;
  }

  function evaluateJs(jsExpr) {
    const stripped = jsExpr.replace(/Math\.(PI|E)/g, '1');
    if (!/^[0-9+\-*/().\s]*$/.test(stripped)) {
      return NaN;
    }
    try {
      const result = new Function('"use strict"; return (' + jsExpr + ')')();
      return typeof result === 'number' ? result : NaN;
    } catch (e) { 
      return NaN; 
    }
  }

  function evaluateCurrent() {
    if (state.expr === '' || state.expr === 'Error') {
      return 0;
    }
    return evaluateJs(toJsExpr(state.expr));
  }

  function closedExprString() {
    const open = (state.expr.match(/\(/g) || []).length;          const close = (state.expr.match(/\)/g) || []).length;
    return state.expr + ')'.repeat(Math.max(0, open - close));
  }

  /* ---------------- Input handlers ---------------- */
  function resetIfJustEvaluated() {
    if (state.justEvaluated) { 
      state.expr = ''; 
      state.expression = ''; 
      state.justEvaluated = false; 
    }
  }

  function inputDigit(d) {
    resetIfJustEvaluated();
    const last = state.expr.slice(-1);
    
    if (last === ')') {
      state.expr += '\u00D7'; // Insert ×
    }
    if (state.expr.replace(/[^0-9]/g, '').length >= 15) {
      return;
    }
    
    state.expr += d;
    updateDisplay();
  }

  function inputDecimal() {
    if (state.justEvaluated) { 
      state.expr = '0.'; 
      state.expression = ''; 
      state.justEvaluated = false; 
      updateDisplay(); 
      return; 
    }
    
    const m = state.expr.match(/([0-9]*\.?[0-9]*)$/);
    const seg = m ? m[0] : '';
    
    if (seg.includes('.')) {
      return;
    }
    
    state.expr += (seg === '' ? '0.' : '.');
    updateDisplay();
  }

  function inputOperator(op) {
    resetIfJustEvaluated();
    
    if (state.expr === '' || state.expr === 'Error') { 
      if (op === '\u2212') { // Minus
        state.expr = '\u2212'; 
        updateDisplay(); 
      } 
      return; 
    }
    
    const last = state.expr.slice(-1);
    
    if (isOperator(last)) {
      state.expr = state.expr.slice(0, -1) + op;
    } else if (last === '(') { 
      if (op === '\u2212') {
        state.expr += op;
      }
    } else {
      state.expr += op;
    }
    
    updateDisplay();
  }

  function insertConstant(sym) {
    resetIfJustEvaluated();
    const last = state.expr.slice(-1);
    
    if (canPrecedeImplicitMultiply(last)) {
      state.expr += '\u00D7' + sym; // × sym
    } else {
      state.expr += sym;
    }
    updateDisplay();
  }

  function insertParen() {
    resetIfJustEvaluated();
    
    const open = (state.expr.match(/\(/g) || []).length;          const close = (state.expr.match(/\)/g) || []).length;
    const last = state.expr.slice(-1);
    
    if (open > close && canPrecedeImplicitMultiply(last)) { 
      state.expr += ')'; 
      updateDisplay(); 
      return; 
    }
    
    if (canPrecedeImplicitMultiply(last)) {
      state.expr += '\u00D7('; // ×(
    } else {
      state.expr += '(';
    }
    updateDisplay();
  }

  function percent() {
    const m = state.expr.match(/([0-9]*\.?[0-9]+)$/);
    if (!m) {
      return;
    }
    const numStr = m[0];
    const num = parseFloat(numStr) / 100;
    state.expr = state.expr.slice(0, state.expr.length - numStr.length) + String(num);
    updateDisplay();
  }

  function clearAll() { 
    state.expr = ''; 
    state.expression = ''; 
    state.justEvaluated = false; 
    updateDisplay(); 
  }

  function backspace() {
    if (state.justEvaluated) { 
      clearAll(); 
      return; 
    }
    if (state.expr.length <= 1) {
      state.expr = '';
    } else {
      state.expr = state.expr.slice(0, -1);
    }
    updateDisplay();
  }

  function equals() {
    if (state.expr === '' || state.expr === 'Error') {
      return;
    }
    
    const finalExpr = closedExprString();
    const result = evaluateJs(toJsExpr(finalExpr));
    
    state.expression = finalExpr + ' =';
    
    if (!isFinite(result) || isNaN(result)) { 
      state.expr = 'Error'; 
    } else { 
      const resStr = formatNumber(String(result)); 
      addHistory(finalExpr, resStr); 
      state.expr = resStr; 
    }
    
    state.justEvaluated = true;
    updateDisplay();
  }

  const SCI_LABELS = { 
    sin: 'sin', cos: 'cos', tan: 'tan', 
    asin: 'sin⁻¹', acos: 'cos⁻¹', atan: 'tan⁻¹', 
    log: 'log₁₀', ln: 'ln', sqr: 'sq', 
    cube: 'cube', sqrt: '√', cbrt: '∛' 
  };

  function applyScientific(action) {
    const num = evaluateCurrent();
    if (isNaN(num)) {
      return;
    }
    let result;
    const rad = num * (Math.PI / 180);
    
    switch (action) {
      case 'sin': 
        if (num % 180 === 0) result = 0; 
        else result = Math.sin(rad); 
        break;
      case 'cos': 
        if (Math.abs(num % 180) === 90) result = 0; 
        else result = Math.cos(rad); 
        break;
      case 'tan': 
        if (Math.abs(num % 180) === 90) result = NaN; 
        else if (num % 180 === 0) result = 0;
        else result = Math.tan(rad); 
        break;
      case 'asin': 
        result = (num >= -1 && num <= 1) ? (Math.asin(num) * (180 / Math.PI)) : NaN; 
        break;
      case 'acos': 
        result = (num >= -1 && num <= 1) ? (Math.acos(num) * (180 / Math.PI)) : NaN; 
        break;
      case 'atan': 
        result = Math.atan(num) * (180 / Math.PI); 
        break;
      case 'log': result = num > 0 ? Math.log10(num) : NaN; break;
      case 'ln': result = num > 0 ? Math.log(num) : NaN; break;
      case 'sqr': result = Math.pow(num, 2); break;
      case 'cube': result = Math.pow(num, 3); break;
      case 'sqrt': result = num >= 0 ? Math.sqrt(num) : NaN; break;
      case 'cbrt': result = Math.cbrt(num); break;
      default: return;
    }
    
    const label = SCI_LABELS[action] || action;
    const numLabel = formatNumber(String(num));
    state.expression = `${label}(${numLabel}) =`;
    
    if (isNaN(result) || !isFinite(result)) { 
      state.expr = 'Error'; 
    } else { 
      const resStr = formatNumber(String(result)); 
      addHistory(`${label}(${numLabel})`, resStr); 
      state.expr = resStr; 
    }
    
    state.justEvaluated = true;
    updateDisplay();
  }

  /* ---------------- History ---------------- */
  const HISTORY_KEY = 'nirnoy_calc_history';
  let history = [];
  try { 
    history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); 
  } catch (e) { 
    history = []; 
  }

  function escapeHtml(s) { 
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); 
  }
  
  function saveHistory() { 
    try { 
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); 
    } catch (e) {
      // Ignored
    } 
  }

  function addHistory(exprStr, resultStr) {
    history.unshift({ expr: exprStr, result: resultStr });
    if (history.length > 50) {
      history.pop();
    }
    saveHistory();
    if (el.historyPanel.classList.contains('open')) {
      renderHistory();
    }
  }

  function renderHistory() {
    el.historyList.innerHTML = '';
    if (history.length === 0) { 
      el.historyList.innerHTML = '<div class="history-empty">No history yet</div>'; 
      return; 
    }
    
    history.forEach((h) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `<div class="h-expr">${escapeHtml(h.expr)}</div><div class="h-result">=${escapeHtml(h.result)}</div>`;
      item.addEventListener('click', () => { 
        playClickSound(); 
        state.expr = h.result; 
        state.expression = ''; 
        state.justEvaluated = true; 
        updateDisplay(); 
        closeHistory(); 
      });
      el.historyList.appendChild(item);
    });
  }

  function openHistory() { 
    renderHistory(); 
    el.historyPanel.classList.add('open'); 
  }
  
  function closeHistory() { 
    el.historyPanel.classList.remove('open'); 
  }

  if (el.historyBtn) {
    el.historyBtn.addEventListener('click', () => { playClickSound(); openHistory(); });
  }
  
  if (el.closeHistoryBtn) {
    el.closeHistoryBtn.addEventListener('click', () => { playClickSound(); closeHistory(); });
  }
  
  if (el.clearHistoryBtn) {
    el.clearHistoryBtn.addEventListener('click', () => { playClickSound(); history = []; saveHistory(); renderHistory(); });
  }
  
  if (el.backspaceBtn) {
    el.backspaceBtn.addEventListener('click', () => { playClickSound(); backspace(); });
  }

  /* ---------------- Ripple & Events ---------------- */
  function createRipple(e, btn) {
    const circle = document.createElement('span');
    const d = Math.max(btn.clientWidth, btn.clientHeight);
    const r = d / 2;
    const rect = btn.getBoundingClientRect();
    
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    
    circle.style.width = circle.style.height = `${d}px`;
    circle.style.left = `${cx - rect.left - r}px`;
    circle.style.top = `${cy - rect.top - r}px`;
    circle.classList.add('ripple');
    
    const existing = btn.querySelector('.ripple');
    if (existing) {
      existing.remove();
    }
    
    btn.appendChild(circle);
  }

  if (el.keys) {
    el.keys.addEventListener('click', (e) => {
      const btn = e.target.closest('.key');
      if (!btn) return;
      
      createRipple(e, btn); 
      playClickSound();
      
      if (btn.dataset.num !== undefined) return inputDigit(btn.dataset.num);
      if (btn.dataset.op !== undefined) return inputOperator(btn.dataset.op);
      
      switch (btn.dataset.action) {
        case 'clear': clearAll(); break;
        case 'paren': insertParen(); break;
        case 'percent': percent(); break;
        case 'decimal': inputDecimal(); break;
        case 'equals': equals(); break;
        case 'pow': inputOperator('^'); break;
        case 'pi': insertConstant('π'); break;
        case 'e': insertConstant('e'); break;
        default: if (btn.dataset.action) applyScientific(btn.dataset.action);
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') { playClickSound(); inputDigit(e.key); }
    else if (e.key === '.') { playClickSound(); inputDecimal(); }
    else if (e.key === '+') { playClickSound(); inputOperator('+'); }
    else if (e.key === '-') { playClickSound(); inputOperator('\u2212'); }
    else if (e.key === '*') { playClickSound(); inputOperator('\u00D7'); }
    else if (e.key === '/') { e.preventDefault(); playClickSound(); inputOperator('\u00F7'); }
    else if (e.key === '(' || e.key === ')') { playClickSound(); insertParen(); }
    else if (e.key === '%') { playClickSound(); percent(); }
    else if (e.key === 'Enter' || e.key === '=') { playClickSound(); equals(); }
    else if (e.key === 'Escape') { playClickSound(); clearAll(); }
    else if (e.key === 'Backspace') { playClickSound(); backspace(); }
  });

  updateDisplay();
  renderHistory();
})();
