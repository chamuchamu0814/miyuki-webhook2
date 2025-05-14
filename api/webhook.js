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

  let gptReply = 'ごめんね、今はうまく返事できないみたい。';

  try {
    const chatGptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: userMessage }
        ],
      }),
    });

    const chatGptData = await chatGptResponse.json();
    console.log('ChatGPT Response:', JSON.stringify(chatGptData));

    gptReply = chatGptData.choices?.[0]?.message?.content || gptReply;

  } catch (error) {
    console.error('ChatGPT API Error:', error);
  }

  const replyMessage = {
    replyToken: replyToken,
    messages: [
      {
        type: 'text',
        text: gptReply,
      },
    ],
  };

  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lineToken}`,
    },
    body: JSON.stringify(replyMessage),
  });

  console.log('LINE Reply Response:', response.status);

  return res.status(200).send('OK');
}
