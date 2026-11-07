// Har bir yangi ochilish va reload sayt boshidan boshlanadi.
history.scrollRestoration = "manual";
if (window.location.hash) {
  history.replaceState(history.state, "", window.location.pathname + window.location.search);
}
window.scrollTo({ top: 0, left: 0, behavior: "instant" });

// Slow, damped touch momentum. No render loop runs while the page is idle.
function setupSmoothScroll() {
  if (typeof window.Lenis !== 'function') return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const editable = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
  // Older iOS releases use their native touch momentum.
  const iosVersion = navigator.userAgent.match(/(?:iPhone|iPad|iPod).*OS (\d+)_/);
  if (iosVersion && Number(iosVersion[1]) < 16) return;
  let controller;
  let frameId = 0;
  let lastFrame = 0;
  let animationTime = 0;
  let pinching = false;
  let rendering = false;
  let touchVelocity = 0;
  let lastTouchTime = 0;

  function render(time) {
    frameId = 0;
    if (!controller) return;
    animationTime += lastFrame ? Math.min(time - lastFrame, 50) : 1000 / 60;
    lastFrame = time;
    rendering = true;
    controller.raf(animationTime);
    rendering = false;
    if (controller.isScrolling === 'smooth') frameId = requestAnimationFrame(render);
    else lastFrame = 0;
  }

  function wake() {
    if (!frameId && !rendering && !document.hidden) frameId = requestAnimationFrame(render);
  }

  function sync() {
    const useNative = reducedMotion.matches || document.hidden || document.activeElement?.matches(editable);
    if (useNative) {
      cancelAnimationFrame(frameId);
      frameId = lastFrame = 0;
      controller?.destroy();
      controller = undefined;
      pinching = false;
      return;
    }
    if (controller) return;
    controller = new Lenis({
      autoRaf: false,
      smoothWheel: true,
      lerp: .065,
      wheelMultiplier: .65,
      syncTouch: true,
      touchMultiplier: .72,
      anchors: true,
      stopInertiaOnNavigate: true,
      prevent: node => node.matches(editable),
      virtualScroll: ({ event, deltaX, deltaY }) => {
        // Leave pinch zoom and sideways gestures to the browser.
        if (event.touches?.length > 1) {
          pinching = true;
          controller.scrollTo(controller.actualScroll, { immediate: true });
        }
        if (pinching) {
          touchVelocity = 0;
          if (event.type === 'touchend' && event.touches.length === 0) pinching = false;
          return false;
        }
        if (event.ctrlKey || Math.abs(deltaY) < Math.abs(deltaX)) {
          touchVelocity = 0;
          return false;
        }
        const now = performance.now();
        if (event.type === 'touchstart') {
          touchVelocity = 0;
          lastTouchTime = now;
        } else if (event.type === 'touchmove') {
          // Use finger speed rather than frame velocity, which can become
          // zero between touch events on slower phones.
          const speed = deltaY / Math.max(8, now - lastTouchTime);
          touchVelocity = touchVelocity * .35 + speed * .65;
          lastTouchTime = now;
        } else if (event.type === 'touchend') {
          if (now - lastTouchTime < 100 && Math.abs(touchVelocity) > .08) {
            const momentum = Math.sign(touchVelocity) * Math.min(Math.abs(touchVelocity) * 220, innerHeight * .32);
            controller.scrollTo(controller.targetScroll + momentum, { lerp: .06, programmatic: false });
            wake();
          }
          touchVelocity = 0;
          return false;
        }
        return true;
      }
    });
    controller.on('virtual-scroll', wake);
    controller.on('scroll', wake);
  }

  reducedMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('focusin', sync);
  document.addEventListener('focusout', () => queueMicrotask(sync));
  window.addEventListener('touchcancel', () => {
    pinching = false;
    touchVelocity = 0;
    controller?.scrollTo(controller.actualScroll, { immediate: true });
  }, { passive: true });
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frameId);
    frameId = lastFrame = 0;
    controller?.destroy();
    controller = undefined;
    pinching = false;
  });
  window.addEventListener('pageshow', sync);
  sync();
}
setupSmoothScroll();

// Reserve the card immediately; request the map shortly before it is visible.
const mapCard = document.getElementById('locationMap');
const mapStatus = mapCard.querySelector('.map-status');
const mapRetry = mapCard.querySelector('.map-retry');
let mapFrame;
let mapTimeout;

function loadLocationMap() {
  clearTimeout(mapTimeout);
  mapFrame?.remove();
  mapCard.classList.remove('is-ready');
  mapCard.setAttribute('aria-busy', 'true');
  mapStatus.textContent = 'Xarita yuklanmoqda…';
  mapRetry.hidden = true;

  const frame = document.createElement('iframe');
  mapFrame = frame;
  frame.className = 'location-map';
  frame.title = 'InsightPlus manzili — Yandex Maps';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  // Hidden frames stay out of keyboard navigation until loading finishes.
  frame.tabIndex = -1;
  const showFallback = () => {
    if (mapFrame !== frame) return;
    clearTimeout(mapTimeout);
    mapCard.setAttribute('aria-busy', 'false');
    mapStatus.textContent = 'Xarita yuklanmadi. Qayta urinib ko‘ring.';
    mapRetry.hidden = false;
  };
  frame.addEventListener('load', () => {
    if (mapFrame !== frame) return;
    clearTimeout(mapTimeout);
    mapCard.classList.add('is-ready');
    mapCard.setAttribute('aria-busy', 'false');
    frame.removeAttribute('tabindex');
    mapRetry.hidden = true;
  }, { once: true });
  frame.addEventListener('error', showFallback, { once: true });
  frame.src = mapCard.dataset.mapSrc;
  mapTimeout = setTimeout(showFallback, 15000);
  mapCard.append(frame);
}

mapRetry.addEventListener('click', loadLocationMap);
if ('IntersectionObserver' in window) {
  let mapIsNear = false;
  let mapLoadTimer;
  // Let native touch momentum / smooth scrolling settle before starting
  // the third-party frame. Listen only until the first map request.
  const scheduleMapLoad = () => {
    clearTimeout(mapLoadTimer);
    if (!mapIsNear) return;
    mapLoadTimer = setTimeout(() => {
      window.removeEventListener('scroll', scheduleMapLoad);
      mapObserver.disconnect();
      loadLocationMap();
    }, 180);
  };
  const mapObserver = new IntersectionObserver(entries => {
    mapIsNear = entries.some(entry => entry.isIntersecting);
    scheduleMapLoad();
  }, { rootMargin: '180px 0px' });
  window.addEventListener('scroll', scheduleMapLoad, { passive: true });
  mapObserver.observe(mapCard);
} else {
  loadLocationMap();
}

// Ro‘yxatdan o‘tish: admin chatini tayyor xabar bilan ochish.
const ADMIN_USERNAME = "Insight_plus_admin";
const arizaForm = document.getElementById("arizaForm");
const statusMsg = document.getElementById("statusMsg");
arizaForm.elements.birthyear.max = String(new Date().getFullYear());

const phoneInput = arizaForm.elements.phone;
const PHONE_PREFIX = '+998 ';
phoneInput.addEventListener('focus', () => {
  if (!phoneInput.value.trim()) phoneInput.value = PHONE_PREFIX;
});
phoneInput.addEventListener('blur', () => {
  if (phoneInput.value.trim() === '+998') phoneInput.value = '';
});
// Accept both local and international numbers from paste/autofill.
function normalizePhoneInput() {
  const raw = phoneInput.value.trim();
  const digits = raw.replace(/\D/g, '');
  if (!raw.startsWith('+') && /^[0-9\s()-]+$/.test(raw)) {
    if (digits.length === 9) phoneInput.value = PHONE_PREFIX + digits;
    else if (digits.length === 12 && digits.startsWith('998')) phoneInput.value = '+' + digits;
  }
}
phoneInput.addEventListener('input', normalizePhoneInput);
phoneInput.addEventListener('change', normalizePhoneInput);
phoneInput.addEventListener('paste', event => {
  const text = event.clipboardData?.getData('text').trim();
  if (!text || !/^\+?[0-9\s()-]+$/.test(text)) return;
  const digits = text.replace(/\D/g, '');
  const local = digits.length === 9 ? digits :
    digits.length === 12 && digits.startsWith('998') ? digits.slice(3) : null;
  if (local === null) return;
  event.preventDefault();
  phoneInput.value = PHONE_PREFIX + local;
  phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length);
  phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
});


function showRegistrationError(message, field) {
  statusMsg.textContent = message;
  statusMsg.className = "status-message status-error";
  statusMsg.style.display = "block";
  field.focus();
}

const coursePicker = document.getElementById('coursePicker');
const courseSelect = document.getElementById('courseSelect');
const courseSelection = document.getElementById('courseSelection');
const courseOptions = document.getElementById('courseOptions');
// Reuse the visible course catalog, including icons and subtitles.
document.querySelectorAll('.course-item').forEach(item => {
  const label = document.createElement('label');
  label.className = 'course-option';
  const title = item.lastElementChild;
  const name = title.firstChild.textContent.trim();
  const subtitle = title.querySelector('small')?.textContent.trim();
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = 'courses';
  checkbox.value = subtitle ? `${name} (${subtitle})` : name;
  label.append(item.firstElementChild.cloneNode(true), title.cloneNode(true), checkbox);
  courseOptions.append(label);
});
function selectedCourses() {
  return [...courseOptions.querySelectorAll('input:checked')].map(input => input.value);
}
courseOptions.addEventListener('change', () => {
  const selected = selectedCourses();
  courseSelection.textContent = selected.length ? selected.join(', ') : 'Kurslarni tanlash';
  coursePicker.title = selected.join(', ');
  coursePicker.classList.toggle('has-selection', selected.length > 0);
  if (selected.length) {
    coursePicker.removeAttribute('aria-invalid');
    statusMsg.style.display = 'none';
  }
 });
function setCoursesOpen(open) {
  courseOptions.hidden = !open;
  coursePicker.setAttribute('aria-expanded', String(open));
}
coursePicker.addEventListener('click', () => setCoursesOpen(courseOptions.hidden));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !courseOptions.hidden) {
    event.preventDefault();
    setCoursesOpen(false);
    coursePicker.focus({ preventScroll: true });
  }
  if (event.key === 'ArrowDown' && event.target === coursePicker) {
    event.preventDefault();
    setCoursesOpen(true);
    courseOptions.querySelector('input')?.focus();
  }
});
document.addEventListener('pointerdown', event => {
  if (!courseSelect.contains(event.target)) setCoursesOpen(false);
});
// Labels can briefly blur the field before activating their checkbox.
// Close only when focus actually arrives outside the whole selector.
document.addEventListener('focusin', event => {
  if (!courseSelect.contains(event.target)) setCoursesOpen(false);
});

arizaForm.addEventListener("submit", event => {
  event.preventDefault();
  statusMsg.style.display = "none";
  const nameField = arizaForm.elements.fullname;
  const phoneField = arizaForm.elements.phone;
  const yearField = arizaForm.elements.birthyear;
  const fullname = nameField.value.trim();
  const rawPhone = phoneField.value.trim();
  let phoneDigits = rawPhone.replace(/\D/g, "");
  if (phoneDigits.length === 9) phoneDigits = "998" + phoneDigits;
  const birthyear = yearField.value.trim();

  if (!fullname) {
    showRegistrationError("Iltimos, ismingizni kiriting.", nameField);
    return;
  }
  if (!/^\+?[0-9\s()-]+$/.test(rawPhone) || !/^998[0-9]{9}$/.test(phoneDigits)) {
    showRegistrationError("Telefon raqamingizni +998 90 123 45 67 shaklida kiriting.", phoneField);
    return;
  }
  if (!/^[0-9]{4}$/.test(birthyear) || Number(birthyear) < 1900 || Number(birthyear) > new Date().getFullYear()) {
    showRegistrationError("Iltimos, tug‘ilgan yilingizni 1900 va joriy yil oralig‘ida kiriting.", yearField);
    return;
  }

  const courses = selectedCourses();
  if (!courses.length) {
    coursePicker.setAttribute('aria-invalid', 'true');
    showRegistrationError('Iltimos, kamida bitta kursni tanlang.', coursePicker);
    return;
  }

  const message = [
    "Assalomu alaykum! InsightPlus kursiga ro‘yxatdan o‘tmoqchiman.",
    "",
    `Ism: ${fullname}`,
    `Telefon: +${phoneDigits}`,
    `Tug‘ilgan yil: ${birthyear}`,
    `Kurslar: ${courses.join(", ")}`
  ];
  window.location.href = `https://t.me/${ADMIN_USERNAME}?text=${encodeURIComponent(message.join("\n"))}`;
});

// Separate controllers share motion mechanics, never animation state or timing.
// Only transforms animate; no per-frame JS or layout reads.
function animateColorLayers(selector, settings) {
  const orbs = [...document.querySelectorAll(selector)];
  // Phones keep the same palette without eight permanent animated layers.
  const staticColors = window.matchMedia('(max-width: 699px), (pointer: coarse), (prefers-reduced-motion: reduce)');
  const animations = new Set();
  const random = (min, max) => min + Math.random() * (max - min);
  const transform = ({ x, y }) => `translate(${x}%, ${y}%)`;
  // The button crosses its anchor; the page explores arbitrary directions.
  // Each layer keeps only one active effect.
  const opposite = value => (value > 0 ? -1 : value < 0 ? 1 : (Math.random() < .5 ? -1 : 1));

  function drift(orb, from = { x: 0, y: 0 }, initial = false) {
    let to = {
      x: opposite(from.x) * random(...settings.x),
      y: opposite(from.y) * random(...settings.y)
    };
    if (settings.wander) {
      // Reject tiny steps, but allow sideways and same-quadrant travel too.
      // Limit sampling so even an unlucky random sequence stays inexpensive.
      for (let attempt = 0; attempt < 12; attempt++) {
        const candidate = { x: random(-42, 42), y: random(-34, 34) };
        if (Math.hypot(candidate.x - from.x, candidate.y - from.y) >= 30) {
          to = candidate;
          break;
        }
      }
    }
    const duration = random(...settings.duration);
    const animation = orb.animate([
      { transform: transform(from) }, { transform: transform(to) }
    ], { duration, easing: 'ease-in-out', fill: 'forwards' });
    // Start within the first pass: the background is already flowing on arrival.
    if (initial) animation.currentTime = duration * random(.18, .3);
    animations.add(animation);
    if (document.hidden) animation.pause();
    animation.onfinish = () => {
      animations.delete(animation);
      orb.style.transform = transform(to);
      animation.cancel();
      if (!staticColors.matches) drift(orb, to);
    };
  }

  function syncMotion() {
    if (staticColors.matches) {
      animations.forEach(animation => animation.cancel());
      animations.clear();
      orbs.forEach(orb => { orb.style.transform = ''; });
      return;
    }
    if (!animations.size && typeof Element.prototype.animate === 'function') orbs.forEach(orb => drift(orb, undefined, true));
    animations.forEach(animation => document.hidden ? animation.pause() : animation.play());
  }
  staticColors.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();
}
animateColorLayers('.ambient-orb', { x: [22, 38], y: [16, 28], duration: [6500, 10500], wander: true });
animateColorLayers('.call-color', { x: [25, 45], y: [12, 24], duration: [4500, 7500] });
