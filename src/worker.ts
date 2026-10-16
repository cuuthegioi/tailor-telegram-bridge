/// <reference types="@cloudflare/workers-types" />
// Cloudflare Workers entry point. Workers can't run long-lived processes, so
// instead of polling (see src/index.ts) Telegram pushes updates to this
// Worker via a webhook.
import { handleChatGPTMessage } from './chatgpt';
import { splitMessage } from './helper';

export interface Env {
  OPENAI_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
}

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { username?: string };
    text?: string;
  };
}

async function sendMessage(token: string, chatId: number, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    console.error('Telegram sendMessage failed', res.status, await res.text());
  }
}

async function handleUpdate(update: TelegramUpdate, env: Env) {
  const msg = update.message;
  if (!msg?.text) return;

  const reply = await handleChatGPTMessage(msg.from?.username || '', msg.text, env.OPENAI_API_KEY);
  for (const chunk of splitMessage(reply)) {
    await sendMessage(env.TELEGRAM_BOT_TOKEN, msg.chat.id, chunk);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/webhook') {
      if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }
      const update = (await request.json()) as TelegramUpdate;
      // Ack Telegram right away so it doesn't retry; reply in the background.
      ctx.waitUntil(handleUpdate(update, env));
      return new Response('ok');
    }

    if (request.method === 'POST' && url.pathname === '/ask') {
      const { message } = (await request.json()) as { message: string };
      const reply = await handleChatGPTMessage('', message, env.OPENAI_API_KEY);
      return Response.json({ reply });
    }

    return new Response('Not found', { status: 404 });
  },
};
