import * as Ably from 'ably';
import { NextResponse } from 'next/server';

// App Router Route Handler equivalent of the previous pages/api/createTokenRequest.js.
// The Ably realtime client is constructed per request (server-side only) so the
// secret API key never reaches the browser; it returns a short-lived token
// request that the client SDK exchanges for a token over the wire.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const client = new Ably.Realtime(process.env.ABLY_API_KEY);
  const tokenRequestData = await client.auth.createTokenRequest({ clientId });
  console.log('tokenRequestData:', tokenRequestData);
  return NextResponse.json(tokenRequestData);
}
