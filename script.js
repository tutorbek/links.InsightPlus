/* ==========================================================
   InsightPlus O'quv Markazi — Asosiy JavaScript (script.js)
   Telegram Bot orqali arizani qabul qilish va yuborish
   ========================================================== */

// 1. Telegram Bot sozlamalari
// @linklarniqabulqilbot boti tokeni va admin chat ID si
const BOT_TOKEN = "8909727171:AAFxOxkki4LfkYkWFg2xwTyn9-6p9agKZNk";
const CHAT_ID = "7949632456";

// 2. Kerakli DOM elementlarini chaqirib olamiz
const arizaForm = document.getElementById("arizaForm");
const submitBtn = document.getElementById("submitBtn");
const statusMsg = document.getElementById("statusMsg");

// 3. Forma yuborilishi (submit) hodisasini tinglaymiz
arizaForm.addEventListener("submit", async function (event) {
  // Sahifa yangilanib ketishining oldini olamiz
  event.preventDefault();

  // Holat xabarini tozalaymiz
  statusMsg.style.display = "none";
  statusMsg.className = "status-message";

  // 4. FormData orqali barcha maydon qiymatlarini yig'ib olamiz
  const formData = new FormData(arizaForm);

  const fullname = formData.get("fullname")?.trim();
  const phone = formData.get("phone")?.trim();
  const birthyear = formData.get("birthyear") || formData.get("birthdate");
  const course = formData.get("course");
  const level = formData.get("level");
  const time = formData.get("time");
  
  // Format maydoni checkbox bo'lgani uchun barcha belgilangan qiymatlarni olamiz
  const formats = formData.getAll("format");
  const formatText = formats.length > 0 ? formats.join(", ") : "Ko'rsatilmadi";
  
  const notes = formData.get("notes")?.trim() || "Mavjud emas";

  // 5. Telefon raqami va majburiy maydonlarni tekshirish (Validatsiya)
  if (!phone || phone.length < 7) {
    statusMsg.innerText = "Iltimos, to'g'ri telefon raqamingizni kiriting.";
    statusMsg.className = "status-message status-error";
    statusMsg.style.display = "block";
    return;
  }

  // 6. Tugmani yuklanish holatiga o'tkazamiz
  const originalBtnText = submitBtn.innerText;
  submitBtn.disabled = true;
  submitBtn.innerText = "Yuborilmoqda...";

  // 7. Telegramga yuboriladigan xabar matnini shakllantiramiz
  const escapeHtml = (str) => {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  // Telefon raqamidan faqat raqamlarni ajratib olish (Telegram va WhatsApp havolalari uchun)
  let cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.length === 9) {
    cleanPhone = "998" + cleanPhone;
  }

  const now = new Date();
  const timeFormatted = now.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }) + ", " + now.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const xabarMatni = 
`🎓 <b>InsightPlus: Kursga yangi ro'yxatdan o'tish</b>
━━━━━━━━━━━━━━━━━━━
👤 <b>Ism:</b> ${escapeHtml(fullname)}
📞 <b>Telefon:</b> <a href="tel:+${cleanPhone}">${escapeHtml(phone)}</a>
🎂 <b>Tug'ilgan yil:</b> ${escapeHtml(birthyear || "Ko'rsatilmadi")}
📚 <b>Kurs:</b> ${escapeHtml(course || "Tanlanmagan")}
📊 <b>Daraja:</b> ${escapeHtml(level || "Boshlang'ich")}
⏰ <b>Vaqt:</b> ${escapeHtml(time || "Ko'rsatilmadi")}
🏫 <b>Format:</b> ${escapeHtml(formatText)}
📝 <b>Izoh:</b> ${escapeHtml(notes)}
━━━━━━━━━━━━━━━━━━━
⏱ <i>Yuborilgan vaqt: ${timeFormatted}</i>`;

  // Inline tugmalar: 
  // 1. Telegram (agar ochiq bo'lsa)
  // 2. Qo'ng'iroq qilish
  const inlineButtons = [];

  // 1. Agar ochiq bo'lsa telegram orqali yozish
  if (cleanPhone.length >= 9) {
    inlineButtons.push([
      {
        text: "💬 Telegram (agar ochiq bo'lsa)",
        url: `https://t.me/+${cleanPhone}`
      }
    ]);
  }

  // 2. Qo'ng'iroq qilish tugmasi
  inlineButtons.push([
    {
      text: "📞 Qo'ng'iroq qilish",
      url: `https://links.insightplus.uz/call.html?phone=${cleanPhone}`
    }
  ]);

  // 8. Telegram Bot API ga fetch orqali so'rov yuborish
  try {
    // Agar bot tokeni hali kiritilmagan bo'lsa (demo holat uchun)
    if (BOT_TOKEN === "YOUR_BOT_TOKEN_HERE" || CHAT_ID === "YOUR_CHAT_ID_HERE") {
      console.warn("DIQQAT: script.js faylida BOT_TOKEN va CHAT_ID kiritilmagan. Xabar konsolga chiqarildi:");
      console.log(xabarMatni);

      // Sun'iy 1 soniya kutish effekti
      await new Promise(resolve => setTimeout(resolve, 800));

      statusMsg.innerText = "Rahmat! Siz muvaffaqiyatli ro'yxatdan o'tdingiz. (Eslatma: Haqiqiy botga borishi uchun script.js da BOT_TOKEN va CHAT_ID ni kiriting)";
      statusMsg.className = "status-message status-success";
      statusMsg.style.display = "block";

      // Formani tozalash
      arizaForm.reset();
      resetCustomSelect();
      updateChoiceStyles();
      return;
    }

    // Haqiqiy Telegram Bot API so'rovi (Bir martalik to'liq so'rov)
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        parse_mode: "HTML",
        text: xabarMatni,
        reply_markup: {
          inline_keyboard: inlineButtons
        }
      })
    });

    const result = await response.json();

    if (result.ok) {

      // Muvaffaqiyatli yuborildi
      statusMsg.innerText = "Rahmat! Siz muvaffaqiyatli ro'yxatdan o'tdingiz. Tez orada siz bilan bog'lanamiz.";
      statusMsg.className = "status-message status-success";
      statusMsg.style.display = "block";

      // Formani tozalash
      arizaForm.reset();
      resetCustomSelect();
      updateChoiceStyles();
    } else {
      // Telegram bot xatoligi
      console.error("Telegram API xatosi:", result);
      statusMsg.innerText = `Xatolik yuz berdi: ${result.description || "Xabar yuborilmadi"}`;
      statusMsg.className = "status-message status-error";
      statusMsg.style.display = "block";
    }

  } catch (error) {
    // Tarmoq yoki server xatosi
    console.error("Tarmoq xatosi:", error);
    statusMsg.innerText = "Tarmoqda xatolik yuz berdi. Iltimos, internetingizni tekshirib qayta urinib ko'ring.";
    statusMsg.className = "status-message status-error";
    statusMsg.style.display = "block";
  } finally {
    // Tugmani yana faol holatga qaytaramiz
    submitBtn.disabled = false;
    submitBtn.innerText = originalBtnText;
  }
});

// ==========================================================
// 9. Ichki sahifalarni (Sections) almashtirish mantiqi
// ==========================================================
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPages = document.querySelectorAll(".tab-page");

// Sahifani ochish funksiyasi
function switchTab(targetPageId) {
  // Barcha sahifalardan active klassini olib tashlash
  tabPages.forEach(page => {
    page.classList.remove("active");
  });

  // Barcha tab tugmalaridan active klassini olib tashlash
  tabButtons.forEach(btn => {
    btn.classList.remove("active");
  });

  // Kerakli sahifani ko'rsatish
  const targetPage = document.getElementById(targetPageId);
  if (targetPage) {
    targetPage.classList.add("active");
  }

  // Kerakli tugmani faol holatga o'tkazish
  const targetBtn = document.querySelector(`.tab-btn[data-tab="${targetPageId}"]`);
  if (targetBtn) {
    targetBtn.classList.add("active");
  }
}

// Headerdagi har bir tugmaga bosish hodisasini bog'lash
tabButtons.forEach(button => {
  button.addEventListener("click", function () {
    const pageId = this.getAttribute("data-tab");
    switchTab(pageId);
    if (pageId === "kurslar-page") window.location.hash = "kurslar";
    else if (pageId === "tarmoqlar-page") window.location.hash = "tarmoqlar";
    else if (pageId === "ariza-page") window.location.hash = "ariza";
  });
});

// URL hash bo'yicha tegishli sahifani ochish (Default: Ijtimoiy tarmoqlar)
function checkHash() {
  const hash = window.location.hash;
  if (hash === "#kurslar") {
    switchTab("kurslar-page");
  } else if (hash === "#ariza" || hash === "#royxatdan-otish") {
    switchTab("ariza-page");
  } else {
    switchTab("tarmoqlar-page");
  }
}
window.addEventListener("hashchange", checkHash);
checkHash();

// ==========================================================
// 10. Loyiha dizaynidagi maxsus kurslar tanlovi (Dropdown)
// ==========================================================
const customSelectTrigger = document.getElementById("customSelectTrigger");
const customSelectMenu = document.getElementById("customSelectMenu");
const customOptions = document.querySelectorAll(".custom-option");
const courseSelect = document.getElementById("course");

// Kursni tanlash funksiyasi
function selectCourse(courseName) {
  if (!courseName) return;

  // 1. Asl yashirin select qiymatini yangilash (FormData va Telegram uchun)
  if (courseSelect) {
    courseSelect.value = courseName;
  }

  // 2. Maxsus tugmadagi matnni yangilash
  if (customSelectTrigger) {
    customSelectTrigger.innerText = courseName;
    customSelectTrigger.classList.add("has-value");
  }

  // 3. Variantlardan tanlanganni ajratib ko'rsatish
  customOptions.forEach(opt => {
    if (opt.getAttribute("data-value") === courseName) {
      opt.classList.add("selected");
    } else {
      opt.classList.remove("selected");
    }
  });

  // 4. Menyuni yopish
  if (customSelectMenu) {
    customSelectMenu.classList.remove("open");
  }
  if (customSelectTrigger) {
    customSelectTrigger.classList.remove("active");
  }
}

// Dropdownni boshlang'ich holatga qaytarish funksiyasi
function resetCustomSelect() {
  if (customSelectTrigger) {
    customSelectTrigger.innerText = "Kursni tanlang...";
    customSelectTrigger.classList.remove("has-value");
    customSelectTrigger.classList.remove("active");
  }
  if (customSelectMenu) {
    customSelectMenu.classList.remove("open");
  }
  customOptions.forEach(opt => opt.classList.remove("selected"));
}

// Maxsus dropdown tugmasi bosilganda ochish/yopish
if (customSelectTrigger && customSelectMenu) {
  customSelectTrigger.addEventListener("click", function (e) {
    e.stopPropagation();
    const isOpen = customSelectMenu.classList.contains("open");
    if (isOpen) {
      customSelectMenu.classList.remove("open");
      customSelectTrigger.classList.remove("active");
    } else {
      customSelectMenu.classList.add("open");
      customSelectTrigger.classList.add("active");
    }
  });

  // Har bir kurs varianti bosilganda
  customOptions.forEach(optionBtn => {
    optionBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const val = this.getAttribute("data-value");
      selectCourse(val);
    });
  });

  // Tashqariga bosilganda menyuni yopish
  document.addEventListener("click", function (e) {
    if (!customSelectTrigger.contains(e.target) && !customSelectMenu.contains(e.target)) {
      customSelectMenu.classList.remove("open");
      customSelectTrigger.classList.remove("active");
    }
  });
}

// Kurs havolasi bosilganda: Ro'yxatdan o'tish sahifasiga o'tkazish va kursni avtomatik tanlash
const courseLinks = document.querySelectorAll(".course-link");
courseLinks.forEach(link => {
  link.addEventListener("click", function (event) {
    event.preventDefault();
    const selectedCourse = this.getAttribute("data-course");

    // Ro'yxatdan o'tish sahifasini ochish
    switchTab("ariza-page");
    window.location.hash = "ariza";

    // Kursni maxsus dropdown va select'da avtomatik tanlash
    selectCourse(selectedCourse);

    const formHeading = document.getElementById("form-heading") || document.getElementById("arizaForm");
    if (formHeading) {
      formHeading.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// ==========================================================
// 11. Radio va Checkbox chiplarini moslashtirish (Cross-browser fallback)
// ==========================================================
function updateChoiceStyles() {
  const choiceLabels = document.querySelectorAll(".choice-label");
  choiceLabels.forEach(label => {
    const input = label.querySelector("input");
    if (input && input.checked) {
      label.classList.add("selected");
    } else {
      label.classList.remove("selected");
    }
  });
}

const choiceInputs = document.querySelectorAll(".choice-label input");
choiceInputs.forEach(input => {
  input.addEventListener("change", updateChoiceStyles);
});
updateChoiceStyles();

// ==========================================================
// 12. Suzib yuruvchi "Ro'yxatdan o'tish" tugmasi
// ==========================================================
const floatRegisterBtn = document.querySelector(".float-register");
if (floatRegisterBtn) {
  floatRegisterBtn.addEventListener("click", function (e) {
    e.preventDefault();
    switchTab("ariza-page");
    window.location.hash = "ariza";
    const formHeading = document.getElementById("form-heading") || document.getElementById("arizaForm");
    if (formHeading) {
      formHeading.scrollIntoView({ behavior: "smooth" });
    }
  });
}

// ==========================================================
// 13. Ulashish (Share) Tizimi: Web Share API + Maxsus Bottom Sheet Fallback
// ==========================================================
const shareBtn = document.getElementById("shareBtn");
const shareModal = document.getElementById("shareModal");
const shareCloseBtn = document.getElementById("shareCloseBtn");
const shareBackdrop = document.getElementById("shareBackdrop");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const copyLinkText = document.getElementById("copyLinkText");

function getShareData() {
  const cleanUrl = window.location.href.split('#')[0];
  return {
    title: "InsightPlus o'quv markazi",
    text: "Kelajagingizni biz bilan quring — zamonaviy kasblar va chet tillari o'quv markazi",
    url: cleanUrl
  };
}

function openShareModal() {
  if (shareModal) {
    shareModal.classList.add("open");
    shareModal.setAttribute("aria-hidden", "false");
  }
}

function closeShareModal() {
  if (shareModal) {
    shareModal.classList.remove("open");
    shareModal.setAttribute("aria-hidden", "true");
  }
}

if (shareBtn) {
  shareBtn.addEventListener("click", async function (e) {
    e.preventDefault();
    const shareData = getShareData();

    // 1. Agar brauzer Web Share API ni qo'llab-quvvatlasa (Mobile iOS/Android)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Agar foydalanuvchi bekor qilmagan bo'lsa va xato yuz bersa, fallback modal ochiladi
        if (err && err.name !== "AbortError") {
          openShareModal();
        }
      }
    } else {
      // 2. Web Share API mavjud bo'lmasa (Desktop yoki mos kelmagan webview)
      openShareModal();
    }
  });
}

// Modalni yopish hodisalari
if (shareCloseBtn) shareCloseBtn.addEventListener("click", closeShareModal);
if (shareBackdrop) shareBackdrop.addEventListener("click", closeShareModal);

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && shareModal && shareModal.classList.contains("open")) {
    closeShareModal();
  }
});

// Havoladan nusxa olish tugmasi
if (copyLinkBtn && copyLinkText) {
  copyLinkBtn.addEventListener("click", async function (e) {
    e.preventDefault();
    const shareData = getShareData();
    let success = false;

    // 1. Zamonaviy Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareData.url);
        success = true;
      } catch (clipErr) {
        success = false;
      }
    }

    // 2. Fallback nusxalash (iOS Safari oldingi versiyalari, HTTP yoki headless)
    if (!success) {
      try {
        const tempInput = document.createElement("input");
        tempInput.setAttribute("value", shareData.url);
        tempInput.style.position = "fixed";
        tempInput.style.opacity = "0";
        tempInput.style.left = "-9999px";
        document.body.appendChild(tempInput);
        tempInput.focus();
        tempInput.select();
        success = document.execCommand("copy");
        document.body.removeChild(tempInput);
      } catch (fallbackErr) {
        success = false;
      }
    }

    if (success) {
      copyLinkBtn.classList.add("copied");
      copyLinkText.innerText = "Havola nusxalandi! ✓";
      setTimeout(() => {
        copyLinkBtn.classList.remove("copied");
        copyLinkText.innerText = "Havoladan nusxa olish";
      }, 2000);
    } else {
      copyLinkText.innerText = "Havola nusxalandi! ✓";
      setTimeout(() => {
        copyLinkText.innerText = "Havoladan nusxa olish";
      }, 2000);
    }
  });
}
