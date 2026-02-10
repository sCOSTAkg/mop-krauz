import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7732365646:AAEFDAjpOFlFwliHdV7nN490PT7gEQx00zg';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'krauz_wh_2026';
const WEBAPP_URL = 'https://mopkrauz.vercel.app';

async function tgApi(method: string, body: Record<string, any>) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function sendMessage(chatId: number, text: string, extra: Record<string, any> = {}) {
  await tgApi('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Invalid secret' });
  }

  try {
    const update = req.body;

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
        await sendMessage(chatId, `📊 <b>Твой прогресс</b>\n\nОткрой приложение для деталей.`, {
          reply_markup: { inline_keyboard: [[{ text: '📊 Смотреть прогресс', web_app: { url: `${WEBAPP_URL}/profile` } }]] },
        });
      } else if (text === '/schedule') {
        await sendMessage(chatId,
          `📚 <b>Расписание</b>\n\n` +
          `<b>Нед 1:</b> Основа — мышление\n<b>Нед 2:</b> Мастерская героев\n<b>Нед 3:</b> Золотые доспехи\n<b>Нед 4:</b> Штурм великих врат`,
          { reply_markup: { inline_keyboard: [[{ text: '📚 Модули', web_app: { url: `${WEBAPP_URL}/modules` } }]] } }
        );
      }
    }

    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      await tgApi('answerCallbackQuery', { callback_query_id: cb.id, text: '✅' });

      if (chatId) {
        if (cb.data === 'progress') {
          await sendMessage(chatId, '📊 Открой приложение:', {
            reply_markup: { inline_keyboard: [[{ text: '📊 Прогресс', web_app: { url: `${WEBAPP_URL}/profile` } }]] },
          });
        } else if (cb.data === 'schedule') {
          await sendMessage(chatId, '📚 Расписание:', {
            reply_markup: { inline_keyboard: [[{ text: '📚 Модули', web_app: { url: `${WEBAPP_URL}/modules` } }]] },
          });
        } else if (cb.data === 'support') {
          await sendMessage(chatId, '💬 <b>Поддержка</b>\n\nНапиши вопрос в этот чат.');
        }
      }
    }

    if (update.message?.web_app_data) {
      const chatId = update.message.chat.id;
      try {
        const payload = JSON.parse(update.message.web_app_data.data);
        if (payload.type === 'task_completed') {
          await sendMessage(chatId, `🏆 <b>Задание выполнено!</b>\n\n${payload.taskTitle || 'Задание'}\n+${payload.xp || 0} XP`);
        }
      } catch {}
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true });
  }
}
