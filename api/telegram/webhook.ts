import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const WEBAPP_URL = 'https://mopkrauz.vercel.app';

async function sendMessage(chatId: number, text: string, extra: Record<string, any> = {}) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  });
}

async function answerCallback(callbackId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text, show_alert: false }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // Verify secret token
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Invalid secret' });
  }

  try {
    const update = req.body;

    // Handle /commands
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const firstName = update.message.from?.first_name || 'Боец';

      if (text === '/start') {
        await sendMessage(chatId,
          `⚔️ <b>Приветствую, ${firstName}!</b>\n\n` +
          `Добро пожаловать в <b>МОП KRAUZ — Академию Продаж</b>.\n\n` +
          `4-недельный интенсив, который превратит тебя в профессионала.\n\n` +
          `👇 Нажми кнопку ниже, чтобы начать:`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🎓 Открыть Академию', web_app: { url: WEBAPP_URL } }],
                [
                  { text: '📊 Прогресс', callback_data: 'progress' },
                  { text: '📚 Расписание', callback_data: 'schedule' },
                ],
                [{ text: '💬 Поддержка', callback_data: 'support' }],
              ],
            },
          }
        );
      } else if (text === '/help') {
        await sendMessage(chatId,
          `📖 <b>Справка</b>\n\n` +
          `/start — Главное меню\n` +
          `/progress — Мой прогресс\n` +
          `/schedule — Расписание модулей\n\n` +
          `Нажми кнопку «🎓 Академия» внизу, чтобы открыть приложение.`
        );
      } else if (text === '/progress') {
        await sendMessage(chatId,
          `📊 <b>Твой прогресс</b>\n\n` +
          `Открой приложение, чтобы увидеть детальную статистику.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📊 Смотреть прогресс', web_app: { url: `${WEBAPP_URL}/profile` } }],
              ],
            },
          }
        );
      } else if (text === '/schedule') {
        await sendMessage(chatId,
          `📚 <b>Расписание</b>\n\n` +
          `<b>Неделя 1:</b> Основа — мышление и опора\n` +
          `<b>Неделя 2:</b> Мастерская героев — инструменты\n` +
          `<b>Неделя 3:</b> Золотые доспехи — мастерство\n` +
          `<b>Неделя 4:</b> Штурм великих врат — практика\n\n` +
          `Открой приложение для деталей.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📚 Открыть модули', web_app: { url: `${WEBAPP_URL}/modules` } }],
              ],
            },
          }
        );
      }
    }

    // Handle callback queries
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const data = cb.data;

      await answerCallback(cb.id, '✅');

      if (data === 'progress' && chatId) {
        await sendMessage(chatId, '📊 Открой приложение, чтобы увидеть прогресс:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 Мой прогресс', web_app: { url: `${WEBAPP_URL}/profile` } }],
            ],
          },
        });
      } else if (data === 'schedule' && chatId) {
        await sendMessage(chatId, '📚 Расписание доступно в приложении:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📚 Открыть модули', web_app: { url: `${WEBAPP_URL}/modules` } }],
            ],
          },
        });
      } else if (data === 'support' && chatId) {
        await sendMessage(chatId,
          '💬 <b>Поддержка</b>\n\n' +
          'Напиши свой вопрос прямо в этот чат, и мы ответим в ближайшее время.'
        );
      }
    }

    // Handle web_app_data (from sendData)
    if (update.message?.web_app_data) {
      const chatId = update.message.chat.id;
      try {
        const payload = JSON.parse(update.message.web_app_data.data);
        if (payload.type === 'task_completed') {
          await sendMessage(chatId,
            `🏆 <b>Задание выполнено!</b>\n\n` +
            `${payload.taskTitle || 'Задание'}\n` +
            `+${payload.xp || 0} XP`
          );
        } else if (payload.type === 'module_started') {
          await sendMessage(chatId,
            `📖 <b>Модуль начат!</b>\n\n${payload.moduleName || 'Новый модуль'}`
          );
        }
      } catch { /* silent */ }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true }); // Always 200 for Telegram
  }
}
