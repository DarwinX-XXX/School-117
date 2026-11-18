// Cloudflare Worker: безопасный мост между формой сайта и Telegram Bot API.
// TELEGRAM_BOT_TOKEN, TELEGRAM_PERSONAL_CHAT_ID и TELEGRAM_ADMIN_GROUP_ID
// задаются в настройках Worker, а не хранятся в репозитории GitHub.

const corsHeaders = (origin, allowedOrigin) => ({
  "Access-Control-Allow-Origin": origin === allowedOrigin ? origin : "null",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin"
});

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "";
    const headers = corsHeaders(origin, allowedOrigin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    const json = (data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8" }
    });

    if (origin !== allowedOrigin) return json({ ok: false, error: "Origin not allowed" }, 403);
    if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_PERSONAL_CHAT_ID || !env.TELEGRAM_ADMIN_GROUP_ID) {
      return json({ ok: false, error: "Server is not configured" }, 500);
    }

    try {
      const data = await request.json();
      const name = clean(data.name, 80);
      const phone = clean(data.phone, 30);
      const topic = clean(data.topic, 100);
      const message = clean(data.message, 1500);
      if (!name || !phone || !topic || !message || data.consent !== true) {
        return json({ ok: false, error: "Заполните обязательные поля и подтвердите согласие." }, 400);
      }
      if (!/^[+()\d\s-]{7,30}$/.test(phone)) {
        return json({ ok: false, error: "Проверьте номер телефона." }, 400);
      }

      const text = [
        "📩 <b>НОВАЯ ЗАЯВКА С САЙТА ШКОЛЫ №117</b>",
        "",
        `<b>Имя:</b> ${escapeHtml(name)}`,
        `<b>Телефон:</b> ${escapeHtml(phone)}`,
        `<b>Тема:</b> ${escapeHtml(topic)}`,
        `<b>Сообщение:</b> ${escapeHtml(message)}`,
        "",
        "<i>Источник: официальный сайт школы</i>"
      ].join("\n");

      const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const recipients = [env.TELEGRAM_PERSONAL_CHAT_ID, env.TELEGRAM_ADMIN_GROUP_ID];
      const deliveries = await Promise.all(recipients.map(async (chatId) => {
        const response = await fetch(telegramUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true
          })
        });
        const result = await response.json();
        return response.ok && result.ok;
      }));
      if (deliveries.some((delivered) => !delivered)) {
        return json({ ok: false, error: "Не удалось доставить заявку во все чаты Telegram." }, 502);
      }
      return json({ ok: true });
    } catch {
      return json({ ok: false, error: "Invalid request" }, 400);
    }
  }
};

function clean(value, maxLength) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLength);
}
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
