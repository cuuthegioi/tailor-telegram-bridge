import express from 'express';
import dotenv from 'dotenv';
import TelegramBot, { Message } from 'node-telegram-bot-api';
dotenv.config();
import { handleChatGPTMessage } from './chatgpt';
import { splitMessage } from './helper';

const app = express();
app.use(express.json());

app.post('/ask', async (req, res) => {
  const { message } = req.body;
  const reply = await handleChatGPTMessage('', message);
  res.send({ reply });
});


const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

bot.on('message', async (msg: Message) => {
  const chatId = msg.chat.id;
  const userText = msg.text || '';
  const reply = await handleChatGPTMessage(msg.from?.username?.toString() || '', userText);
  const chunks = splitMessage(reply);
  for (const chunk of chunks) {
    bot.sendMessage(chatId, chunk);
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
