import * as Ably from 'ably';

export default async function handler(req, res) {
    const client = new Ably.Realtime(process.env.ABLY_API_KEY);
    const tokenRequestData = await client.auth.createTokenRequest({ clientId: req.query.clientId });
    console.log('tokenRequestData:', tokenRequestData)
    res.status(200).json(tokenRequestData);
};