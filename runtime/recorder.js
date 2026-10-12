// Runs in untrusted pages. It can append bounded teaching metadata, never execute actions.
(() => {
  if (window !== window.top || window.__computerRecorder) return;
  window.__computerRecorder = true;
  function selector(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    while (el?.parentElement && parts.length < 6) {
      const tag = el.tagName.toLowerCase();
      const siblings = Array.from(el.parentElement.children).filter(
        (child) => child.tagName === el.tagName,
      );
      parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(el) + 1})`);
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  function send(event) {
    if (window.__computerDesktopInput) return;
    window.__computerTeach?.(event).catch(() => {});
  }
  document.addEventListener(
    'click',
    (event) => {
      if (!event.isTrusted || !(event.target instanceof Element)) return;
      const el = event.target.closest('button,a,input,select,[role="button"]');
      if (!el || (el instanceof HTMLInputElement && el.type === 'password'))
        return;
      send({ type: 'click', selector: selector(el), url: location.href });
    },
    true,
  );
  const desktopFields = new WeakMap();
  const captureInput = (event) => {
    const el = event.target;
    if (
      !event.isTrusted ||
      !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
    )
      return;
    // A later blur/change must not become a second executable fill after an
    // API desktop type. A subsequent human input restores browser recording.
    if (event.type !== 'change')
      desktopFields.set(el, Boolean(window.__computerDesktopInput));
    if (desktopFields.get(el)) return;
    if (
      el instanceof HTMLInputElement &&
      !['text', 'search', 'email', 'url', 'tel', 'number'].includes(el.type)
    )
      return;
    if (
      /password|token|secret|key|auth|credit|cc-|otp|one.time/i.test(
        [el.type, el.name, el.id, el.autocomplete].join(' '),
      )
    )
      return;
    // Never record typed values. Teach generates parameters to supply explicitly at replay.
    send({ type: 'fill', selector: selector(el), url: location.href });
  };
  document.addEventListener('input', captureInput, true);
  document.addEventListener('change', captureInput, true);
})();
