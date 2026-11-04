/* Brand-accurate contact icons (inline SVG) + contact links that work on phone and desktop. */
(function () {
  const I = {
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#34C759"/><path fill="#fff" d="M8.3 5.3c.4-.1.8.1 1 .5l1.1 2.4c.2.4.1.8-.2 1.1l-1 .9c.7 1.6 1.9 2.8 3.5 3.5l.9-1c.3-.3.7-.4 1.1-.2l2.4 1.1c.4.2.6.6.5 1l-.4 1.8c-.1.4-.5.7-.9.7C10.9 17.1 6.9 13.1 6.9 7.7c0-.4.3-.8.7-.9l.7-.2z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#25D366"/><g transform="translate(4 4) scale(.6667)"><path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></g></svg>',
    gmail: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" fill="#fff"/><g transform="translate(4 6) scale(.8333)"><path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z"/><path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z"/><polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17"/><path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z"/><path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0C43.076,8,45,9.924,45,12.298z"/></g></svg>',
    map: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#EA4335"/><path fill="#fff" d="M12 5a4.6 4.6 0 00-4.6 4.6c0 3.4 4.6 8.4 4.6 8.4s4.6-5 4.6-8.4A4.6 4.6 0 0012 5zm0 6.3a1.7 1.7 0 110-3.4 1.7 1.7 0 010 3.4z"/></svg>'
  };
  window.ICONS = I;
  const touch = matchMedia('(hover:none)').matches;
  const EMAIL = 'sae.sathya@gmail.com';
  // Gmail compose on desktop; the phone's own mail app (Gmail on Android) on touch devices.
  window.mailLink = (subject = '', body = '') => touch
    ? `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const paint = () => {
    document.querySelectorAll('[data-ico]').forEach(el => { if (!el.dataset.done) { el.innerHTML = I[el.dataset.ico] || ''; el.dataset.done = 1; } });
    document.querySelectorAll('a[data-mail]').forEach(a => { a.href = mailLink(a.dataset.mail || 'Enquiry – Sri Anjaneya Enterprises'); if (!touch) { a.target = '_blank'; a.rel = 'noopener'; } });
  };
  window.paintIcons = paint;
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', paint) : paint();
})();
