export default async function handler(req, res) {
  console.log("🔔 Webhook受信:", req.body);

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // LINEに200 OK を返す
  res.status(200).send('OK');

  // メッセージ確認
  const events = req.body.events;
  if (events && events.length > 0) {
    const message = events[0].message.text;
    console.log(`📩 メッセージ受信: ${message}`);
  }
}
