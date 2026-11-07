// Har bir yangi ochilish va reload sayt boshidan boshlanadi.
history.scrollRestoration = "manual";
if (window.location.hash) {
  history.replaceState(history.state, "", window.location.pathname + window.location.search);
}
window.scrollTo({ top: 0, left: 0, behavior: "instant" });

// Ro‘yxatdan o‘tish: admin chatini tayyor xabar bilan ochish.
const ADMIN_USERNAME = "Insight_plus_admin";
const arizaForm = document.getElementById("arizaForm");
const statusMsg = document.getElementById("statusMsg");

function showRegistrationError(message, field) {
  statusMsg.textContent = message;
  statusMsg.className = "status-message status-error";
  statusMsg.style.display = "block";
  field.focus();
}

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

  const message = [
    "Assalomu alaykum! InsightPlus kursiga ro‘yxatdan o‘tmoqchiman.",
    "",
    `Ism: ${fullname}`,
    `Telefon: +${phoneDigits}`,
    `Tug‘ilgan yil: ${birthyear}`
  ];
  window.location.href = `https://t.me/${ADMIN_USERNAME}?text=${encodeURIComponent(message.join("\n"))}`;
});

// Sahifa ichidagi tugmalar va orqaga qaytish navigatsiyasi.
function checkHash() {
  const hash = window.location.hash;
  const isRegistration = hash === "#ariza" || hash === "#royxatdan-otish";
  document.getElementById("ariza-page").hidden = !isRegistration;
  const targetId = isRegistration ? "ariza-page" :
    hash === "#kurslar" ? "kurslar-page" :
    hash === "#tarmoqlar" ? "tarmoqlar-page" : null;
  if (targetId) document.getElementById(targetId).scrollIntoView({ behavior: "smooth" });
}
window.addEventListener("hashchange", checkHash);

// Umumiy ro‘yxatdan o‘tish formasini ochish.
function openRegistration() {
  statusMsg.style.display = "none";
  document.getElementById("ariza-page").hidden = false;
  window.location.hash = "ariza";
  document.getElementById("registrationTitle").focus({ preventScroll: true });
  document.getElementById("ariza-page").scrollIntoView({ behavior: "smooth" });
}

document.querySelector(".float-register").addEventListener("click", event => {
  event.preventDefault();
  openRegistration();
});
