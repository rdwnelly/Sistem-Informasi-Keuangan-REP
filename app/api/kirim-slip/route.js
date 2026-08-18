export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const rawBotUrl = process.env.WA_BOT_URL || process.env.NEXT_PUBLIC_WA_BOT_URL || 'http://localhost:3001';
    const apiKey = process.env.WA_API_KEY || '121DW4N311y';

    const baseUrl = rawBotUrl.replace(/\/$/, '');
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

    // On Vercel, localhost is not accessible because the bot runs on user's machine
    if (process.env.VERCEL && isLocalhost) {
      return Response.json(
        {
          status: 'error',
          error: 'Server Vercel tidak dapat terhubung ke localhost. Atur WA_BOT_URL di Vercel Environment Variables dengan URL publik WhatsApp Bot (misal: via Ngrok atau Railway).'
        },
        { status: 500 }
      );
    }

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
    let errorDetails = error.message || 'Connection failed';
    if (errorDetails.includes('fetch failed') || errorDetails.includes('ECONNREFUSED')) {
      errorDetails = 'Koneksi ke WhatsApp Bot Server ditolak. Pastikan WA_BOT_URL aktif dan dapat diakses dari internet.';
    }
    return Response.json(
      {
        status: 'error',
        error: `Gagal terhubung ke WhatsApp Bot Server: ${errorDetails}`
      },
      { status: 500 }
    );
  }
}
