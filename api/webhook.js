export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const body = req.body;
  console.log('Webhook受信:', JSON.stringify(body));

  const replyToken = body.events[0]?.replyToken;
  const userMessage = body.events[0]?.message?.text;

  if (!replyToken || !userMessage) {
    return res.status(200).send('No reply needed');
  }

  const replyMessage = {
    replyToken: replyToken,
    messages: [
      {
        type: 'text',
        text: `みゆきさんが言った：「${userMessage}」だね！`
      },
    ],
  };

  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lineToken}`
    },
    body: JSON.stringify(replyMessage),
  });

  console.log('LINE Reply Response:', response.status);

  return res.status(200).send('OK');
}
