import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, MongoDBNamespace } from 'mongodb';

//const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
//const dbName = process.env.MONGODB_DB || 'videotoken';

const uri = "mongodb+srv://joblawal33:joblawal33@createtoken.loau9mg.mongodb.net/?retryWrites=true&w=majority&appName=createtoken"
const  dbName = "videotoken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { mint, amount, videoUri } = req.body;
  if (!mint || !amount || !videoUri) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    const collection = db.collection('tokens');

    await collection.insertOne({ mint, amount, videoUri, createdAt: new Date() });

    client.close();
    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}