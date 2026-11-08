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
  const mapObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    mapObserver.disconnect();
    loadLocationMap();
  }, { rootMargin: '180px 0px' });
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
  if (!courseSelect.contains(event.target) && event.target !== document.getElementById('submitBtn')) setCoursesOpen(false);
});
// Labels can briefly blur the field before activating their checkbox.
// Close only when focus actually arrives outside the whole selector.
document.addEventListener('focusin', event => {
  if (!courseSelect.contains(event.target) && event.target !== document.getElementById('submitBtn')) setCoursesOpen(false);
});

arizaForm.addEventListener("submit", event => {
  event.preventDefault();
  setCoursesOpen(false);
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
