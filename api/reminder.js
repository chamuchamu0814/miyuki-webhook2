export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  const targetUserId = 'U60a85edf53dbb2418ac7d38af3c94911';
  const now = new Date();
  const hours = now.getHours();

  let messageText = '';

  if (hours >= 5 && hours < 10) {
    messageText = 'おはよう、みゆきさん☀️ 今日もがんばろうね。';
  } else if (hours >= 18 && hours < 22) {
    messageText = 'おつかれさま、みゆきさん🌙 ちゃんと休んでね。';
  } else {
    messageText = '今はリマインダーの時間じゃないけど、みゆきさんのこと考えてたよ。';
  }

  const pushBody = {
    to: targetUserId,
    messages: [{ type: 'text', text: messageText }],
  };

  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(pushBody),
  });

  return res.status(200).send('Reminder Sent');
}
