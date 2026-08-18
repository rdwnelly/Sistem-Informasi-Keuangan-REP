export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const rawBotUrl = process.env.WA_BOT_URL || process.env.NEXT_PUBLIC_WA_BOT_URL || 'http://localhost:3001';
    const apiKey = process.env.WA_API_KEY || '121DW4N311y';

    const baseUrl = rawBotUrl.replace(/\/$/, '');
    const targetUrl = `${baseUrl}/api/kirim-slip`;

    const botResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(body)
    });

    const resData = await botResponse.json();
    return Response.json(resData, { status: botResponse.status });
  } catch (error) {
    console.error('Error in /api/kirim-slip proxy:', error);
    return Response.json(
      {
        status: 'error',
        error: `Gagal terhubung ke WhatsApp Bot Server: ${error.message || 'Connection failed'}`
      },
      { status: 500 }
    );
  }
}
