// Вставьте сюда URL опубликованного Cloudflare Worker (см. README.md).
const TELEGRAM_ENDPOINT = "https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev";

const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
menuButton?.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});
nav?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  nav.classList.remove("open");
  menuButton?.setAttribute("aria-expanded", "false");
}));
document.getElementById("year").textContent = new Date().getFullYear();

const form = document.getElementById("contactForm");
const statusBox = document.getElementById("formStatus");
const submitButton = form.querySelector("button[type=submit]");
const buttonText = submitButton.querySelector(".button-text");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusBox.textContent = "";
  statusBox.className = "form-status";

  if (!form.reportValidity()) return;
  if (TELEGRAM_ENDPOINT.includes("YOUR-WORKER-NAME")) {
    statusBox.textContent = "Форма пока не подключена. Администратору необходимо завершить настройку по инструкции README.";
    statusBox.classList.add("error");
    return;
  }

  const payload = Object.fromEntries(new FormData(form).entries());
  payload.consent = document.getElementById("consent").checked;
  submitButton.disabled = true;
  buttonText.textContent = "Отправляем...";

  try {
    const response = await fetch(TELEGRAM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось отправить сообщение");
    statusBox.textContent = "Спасибо! Ваше обращение отправлено администрации школы.";
    statusBox.classList.add("success");
    form.reset();
  } catch (error) {
    statusBox.textContent = "Не удалось отправить обращение. Попробуйте позже или свяжитесь со школой другим способом.";
    statusBox.classList.add("error");
  } finally {
    submitButton.disabled = false;
    buttonText.textContent = "Отправить обращение";
  }
});
