(function staticFeedbackWidget() {
  if (window.__pocketSteakFeedbackWidgetLoaded) return;
  window.__pocketSteakFeedbackWidgetLoaded = true;

  const script = document.currentScript;
  const endpointUrl = script?.dataset.feedbackEndpoint || 'https://baseball-betting-app.vercel.app/api/send-feedback';
  const appName = script?.dataset.appName || document.title || 'Pocket Steak App';
  const MIN_FEEDBACK_LENGTH = 3;
  const MAX_FEEDBACK_LENGTH = 1000;
  const SUCCESS_MESSAGE = 'Thanks! Pocket Steak has your feedback on the grill.';
  const EMPTY_MESSAGE = 'Please describe the issue before submitting.';
  const ERROR_MESSAGE = 'Something went wrong. Please try again.';
  const FEEDBACK_WIDGET_SELECTOR = '[data-feedback-widget]';

  const style = document.createElement('style');
  style.dataset.feedbackWidget = 'true';
  style.textContent = `
    .ps-feedback-button { position: fixed; right: 16px; bottom: calc(24px + env(safe-area-inset-bottom)); z-index: 2147483000; border: 1px solid rgba(148, 163, 184, 0.28); border-radius: 10px; background: rgba(17,24,39,.94); color: #f8fafc; box-shadow: 0 14px 40px rgba(15,23,42,.28); cursor: pointer; font: 600 14px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: 0; padding: .9rem 1rem; }
    .ps-feedback-overlay { position: fixed; inset: 0; z-index: 2147483001; display: none; align-items: center; justify-content: center; padding: 16px; background: rgba(15,23,42,.72); }
    .ps-feedback-overlay.is-open { display: flex; }
    .ps-feedback-modal { width: 100%; max-width: 560px; border: 1px solid rgba(148,163,184,.24); border-radius: 12px; background: #fff; box-shadow: 0 30px 80px rgba(15,23,42,.28); color: #111827; padding: 20px; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .ps-feedback-modal h2 { margin: 0 0 16px; font-size: 20px; line-height: 1.2; letter-spacing: 0; }
    .ps-feedback-modal label { display: block; margin-bottom: 8px; color: #1f2937; font-size: 14px; font-weight: 600; }
    .ps-feedback-modal textarea { width: 100%; min-height: 144px; box-sizing: border-box; resize: vertical; border: 1px solid rgba(148,163,184,.5); border-radius: 10px; background: #fff; color: #111827; font: 14px/1.5 inherit; outline: none; padding: .85rem .95rem; }
    .ps-feedback-row { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; color: #6b7280; font-size: 12px; }
    .ps-feedback-message { margin: 12px 0 0; color: #b91c1c; font-size: 14px; line-height: 1.5; }
    .ps-feedback-message.is-success { color: #166534; }
    .ps-feedback-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
    .ps-feedback-actions button { border-radius: 10px; cursor: pointer; font: 600 14px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: .8rem 1rem; }
    .ps-feedback-cancel { border: 1px solid rgba(148,163,184,.5); background: #fff; color: #1f2937; }
    .ps-feedback-submit { border: 1px solid #111827; background: #111827; color: #f9fafb; }
    .ps-feedback-actions button:disabled, .ps-feedback-modal textarea:disabled { cursor: not-allowed; opacity: .7; }
    @media (max-width: 1023px) { .ps-feedback-button { bottom: calc(96px + env(safe-area-inset-bottom)); } }
  `;
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.className = 'ps-feedback-button';
  button.dataset.feedbackWidget = 'true';
  button.type = 'button';
  button.textContent = 'Send Feedback';

  const overlay = document.createElement('div');
  overlay.className = 'ps-feedback-overlay';
  overlay.dataset.feedbackWidget = 'true';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="ps-feedback-modal">
      <h2>Send Feedback</h2>
      <form>
        <label for="ps-feedback-text">What happened or what would you like to share?</label>
        <textarea id="ps-feedback-text" maxlength="${MAX_FEEDBACK_LENGTH}" placeholder="Type your feedback here..." rows="6"></textarea>
        <div class="ps-feedback-row"><span>We'll include the page details automatically.</span><span data-count>0/${MAX_FEEDBACK_LENGTH}</span></div>
        <p class="ps-feedback-message" hidden></p>
        <div class="ps-feedback-actions">
          <button class="ps-feedback-cancel" type="button">Cancel</button>
          <button class="ps-feedback-submit" type="submit">Submit</button>
        </div>
      </form>
    </div>
  `;

  document.body.append(button, overlay);

  const form = overlay.querySelector('form');
  const textarea = overlay.querySelector('textarea');
  const count = overlay.querySelector('[data-count]');
  const message = overlay.querySelector('.ps-feedback-message');
  const submit = overlay.querySelector('.ps-feedback-submit');
  const cancel = overlay.querySelector('.ps-feedback-cancel');
  let state = 'idle';

  function setMessage(text, success = false) {
    message.textContent = text;
    message.hidden = !text;
    message.classList.toggle('is-success', success);
  }

  function setLocked(locked) {
    textarea.disabled = locked;
    submit.disabled = locked;
    cancel.disabled = state === 'sending';
    submit.textContent = state === 'sending' ? 'Sending...' : state === 'success' ? 'Sent' : 'Submit';
  }

  function openModal() {
    state = 'idle';
    textarea.value = '';
    count.textContent = `0/${MAX_FEEDBACK_LENGTH}`;
    setMessage('');
    setLocked(false);
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    textarea.focus();
  }

  function closeModal() {
    if (state === 'sending') return;
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function validateFeedback(value) {
    const trimmed = value.trim();
    if (!trimmed) return EMPTY_MESSAGE;
    if (trimmed.length < MIN_FEEDBACK_LENGTH) return `Feedback must be at least ${MIN_FEEDBACK_LENGTH} characters.`;
    if (trimmed.length > MAX_FEEDBACK_LENGTH) return `Feedback must be ${MAX_FEEDBACK_LENGTH.toLocaleString()} characters or fewer.`;
    return null;
  }

  function getScreenSize() {
    return `${window.screen.width}x${window.screen.height}`;
  }

  function getFullPageDimensions() {
    const body = document.body;
    const element = document.documentElement;
    const width = Math.ceil(Math.max(body.scrollWidth, body.offsetWidth, element.clientWidth, element.scrollWidth, element.offsetWidth, window.innerWidth));
    const height = Math.ceil(Math.max(body.scrollHeight, body.offsetHeight, element.clientHeight, element.scrollHeight, element.offsetHeight, window.innerHeight));
    const scaleLimitByDimension = Math.min(16000 / width, 16000 / height);
    const scaleLimitByPixels = Math.sqrt(18000000 / Math.max(1, width * height));
    const scale = Math.max(0.25, Math.min(window.devicePixelRatio || 1, 1, scaleLimitByDimension, scaleLimitByPixels));
    return { height, scale, width };
  }

  function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-html2canvas-loader="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.html2canvas), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const html2canvasScript = document.createElement('script');
      html2canvasScript.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      html2canvasScript.async = true;
      html2canvasScript.dataset.html2canvasLoader = 'true';
      html2canvasScript.onload = () => resolve(window.html2canvas);
      html2canvasScript.onerror = reject;
      document.head.appendChild(html2canvasScript);
      window.setTimeout(() => reject(new Error('html2canvas timed out')), 5000);
    });
  }

  function getBestDataUrl(canvas) {
    for (const quality of [0.72, 0.58, 0.44, 0.32]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length > 3000 && dataUrl.length <= 6500000) return dataUrl;
    }
    return null;
  }

  function isElementVisible(element) {
    const styles = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return styles.display !== 'none' && styles.visibility !== 'hidden' && Number(styles.opacity) > 0 && rect.width > 0 && rect.height > 0;
  }

  function getVisiblePageText() {
    const root = document.querySelector('main') || document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const lines = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      const text = node.textContent?.replace(/\s+/g, ' ').trim();
      if (!parent || !text || parent.closest(FEEDBACK_WIDGET_SELECTOR) || !isElementVisible(parent)) continue;
      if (!lines.includes(text)) lines.push(text);
      if (lines.length >= 28) break;
    }
    return lines;
  }

  function wrapText(context, text, maxWidth) {
    const lines = [];
    let current = '';
    for (const word of text.split(' ')) {
      const test = current ? `${current} ${word}` : word;
      if (context.measureText(test).width <= maxWidth) current = test;
      else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function buildFallbackScreenshot() {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = '#020617';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#0f172a';
    context.fillRect(0, 0, canvas.width, 96);
    context.fillStyle = '#38bdf8';
    context.fillRect(0, 94, canvas.width, 2);
    context.fillStyle = '#f8fafc';
    context.font = '700 34px system-ui, sans-serif';
    context.fillText('Feedback screenshot fallback', 44, 52);
    context.fillStyle = '#cbd5e1';
    context.font = '18px system-ui, sans-serif';
    context.fillText('The browser could not render the live page, so page context was attached.', 44, 80);
    const dimensions = getFullPageDimensions();
    const metadata = [`URL: ${window.location.href}`, `Viewport: ${window.innerWidth}x${window.innerHeight}`, `Full page: ${dimensions.width}x${dimensions.height}`, `Screen: ${window.screen.width}x${window.screen.height}`, `Time: ${new Date().toLocaleString()}`];
    let y = 136;
    context.fillStyle = '#e2e8f0';
    context.font = '600 20px system-ui, sans-serif';
    for (const item of metadata) {
      context.fillText(item, 44, y);
      y += 32;
    }
    y += 20;
    context.fillStyle = '#f8fafc';
    context.font = '700 24px system-ui, sans-serif';
    context.fillText('Visible page text', 44, y);
    y += 36;
    context.fillStyle = '#cbd5e1';
    context.font = '18px system-ui, sans-serif';
    const pageText = getVisiblePageText();
    for (const text of pageText.length ? pageText : ['No visible page text was detected.']) {
      for (const line of wrapText(context, text, canvas.width - 88).slice(0, 2)) {
        if (y > canvas.height - 48) return canvas.toDataURL('image/jpeg', 0.76);
        context.fillText(line, 44, y);
        y += 26;
      }
      y += 8;
    }
    return canvas.toDataURL('image/jpeg', 0.76);
  }

  async function captureScreenshot() {
    const widgets = Array.from(document.querySelectorAll(FEEDBACK_WIDGET_SELECTOR));
    const previousDisplay = new Map();
    const previousOverflow = document.body.style.overflow;
    try {
      const dimensions = getFullPageDimensions();
      widgets.forEach((element) => {
        previousDisplay.set(element, element.style.display);
        element.style.display = 'none';
      });
      document.body.style.overflow = 'visible';
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(document.body, {
        allowTaint: false,
        backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
        height: dimensions.height,
        ignoreElements: (element) => element instanceof HTMLElement && element.matches(FEEDBACK_WIDGET_SELECTOR),
        logging: false,
        removeContainer: true,
        scale: dimensions.scale,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        width: dimensions.width,
        windowHeight: dimensions.height,
        windowWidth: dimensions.width,
        x: 0,
        y: 0,
      });
      return getBestDataUrl(canvas) || buildFallbackScreenshot();
    } catch (error) {
      console.warn('Feedback screenshot capture failed.', error);
      return buildFallbackScreenshot();
    } finally {
      document.body.style.overflow = previousOverflow;
      widgets.forEach((element) => {
        element.style.display = previousDisplay.get(element) || '';
      });
    }
  }

  button.addEventListener('click', openModal);
  cancel.addEventListener('click', closeModal);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.classList.contains('is-open')) closeModal();
  });
  textarea.addEventListener('input', () => {
    count.textContent = `${textarea.value.length}/${MAX_FEEDBACK_LENGTH}`;
    if (state !== 'success') setMessage('');
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const validationError = validateFeedback(textarea.value);
    if (validationError) {
      setMessage(validationError);
      return;
    }
    state = 'sending';
    setMessage('');
    setLocked(true);
    let screenshot = null;
    try {
      screenshot = await captureScreenshot();
    } catch {
      screenshot = null;
    }
    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName, feedback: textarea.value.trim(), pageUrl: window.location.href, timestamp: new Date().toISOString(), userAgent: navigator.userAgent, screenSize: getScreenSize(), screenshot }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error || ERROR_MESSAGE);
      state = 'success';
      setMessage(SUCCESS_MESSAGE, true);
      setLocked(true);
      setTimeout(closeModal, 1600);
    } catch {
      state = 'error';
      setMessage(ERROR_MESSAGE);
      setLocked(false);
    }
  });
})();
