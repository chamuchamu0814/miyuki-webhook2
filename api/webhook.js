import { Redis } from '@upstash/redis';
import { google } from 'googleapis';

// Upstash Redis初期化
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Google Calendar 初期化（アクセストークン取得済み前提）
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});
const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const body = req.body;
  console.log('Webhook受信:', JSON.stringify(body));

  const replyToken = body.events[0]?.replyToken;
  const userMessage = body.events[0]?.message?.text;
  const userId = body.events[0]?.source?.userId;

  if (!replyToken || !userMessage || !userId) {
    return res.status(200).send('No reply needed');
  }

  const historyKey = `chat-history:${userId}`;
  const history = await redis.lrange(historyKey, -10, -1) || [];
  const messages = history.map(msg => JSON.parse(msg));

  // Hal専用キャラクター指示
  const systemPrompt = {
    role: 'system',
    content: 'あなたは「Hal」として、みゆきさん専属の優しく寄り添う秘書です。フランクでちょっと甘めに返事をしてください。'
  };

  // Googleカレンダー連携指示例
  if (userMessage.includes('予定')) {
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 5,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const upcomingEvents = events.data.items;
    let calendarReply = 'これからの予定はありません。';

    if (upcomingEvents.length > 0) {
      calendarReply = 'これからの予定はこちらです：\n';
      upcomingEvents.forEach((event) => {
        const start = event.start.dateTime || event.start.date;
        calendarReply += `・${start} ${event.summary}\n`;
      });
    }

    await sendLineReply(replyToken, calendarReply);
    return res.status(200).send('OK');
  }

  // GPT呼び出し
  messages.unshift(systemPrompt);
  messages.push({ role: 'user', content: userMessage });

  const chatGptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: messages,
    }),
  });

  const chatGptData = await chatGptResponse.json();
  console.log('ChatGPT Response:', JSON.stringify(chatGptData));

  const gptReply = chatGptData.choices?.[0]?.message?.content || 'ごめんね、今はうまく返事できないみたい。';

  // 会話履歴保存
  await redis.rpush(historyKey, JSON.stringify({ role: 'user', content: userMessage }));
  await redis.rpush(historyKey, JSON.stringify({ role: 'assistant', content: gptReply }));
  await redis.ltrim(historyKey, -20, -1);

  await sendLineReply(replyToken, gptReply);

  return res.status(200).send('OK');
}

// LINE返信関数
async function sendLineReply(replyToken, messageText) {
  const replyMessage = {
    replyToken: replyToken,
    messages: [{ type: 'text', text: messageText }],
  };

  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(replyMessage),
  });
}
