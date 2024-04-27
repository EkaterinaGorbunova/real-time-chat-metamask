import Ably from "ably/promises";

export default async function handler(req, res) {
    const id = `${Math.random().toString(36)}`;
    const client = new Ably.Realtime(process.env.ABLY_API_KEY);
    const tokenRequestData = await client.auth.createTokenRequest({ clientId: req.query.clientId });
    // const tokenRequestData = await client.auth.createTokenRequest({ clientId: id });
    console.log('tokenRequestData:', tokenRequestData)
    res.status(200).json(tokenRequestData);
};