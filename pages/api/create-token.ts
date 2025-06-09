import type { NextApiRequest, NextApiResponse } from 'next';
import { createFungible, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { createTokenIfMissing, findAssociatedTokenPda, getSplAssociatedTokenProgramId, mintTokensTo } from '@metaplex-foundation/mpl-toolbox';
import { createGenericFile, percentAmount, signerIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import bs58 from 'bs58';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const busboy = require('busboy');
  const bb = busboy({ headers: req.headers });
  let fields: any = {};
  let imageBuffer: Uint8Array[] = [];
  let imageFile: any = null;

  bb.on('file', (name: string, file: any, info: any) => {
    imageFile = info;
    file.on('data', (data: Buffer) => imageBuffer.push(new Uint8Array(data)));
  });

  bb.on('field', (name: string, val: string) => {
    fields[name] = val;
  });

  bb.on('finish', async () => {
    try {
      const { name, symbol, description, decimals, supply } = fields;
      const buffer = Buffer.concat(imageBuffer);
      const uint8ArrayBuffer = new Uint8Array(buffer);

      const umi = createUmi('https://api.devnet.solana.com')
        .use(mplTokenMetadata())
        .use(irysUploader());

      // WARNING: This uses a hardcoded private key for demonstration.
      // For production, use a secure method or a wallet adapter on the client.
      const PRIVATE_KEY_STRING = '34sP7iU74k1rDuHUXdkVHbsNyisAQSno4L53nut3bzTVWdNfGzK5QNFiGt4uQ8Bsc1PgGBkxzUuQmgVoi7Yp9guj';
      const secretKeyBuffer = bs58.decode(PRIVATE_KEY_STRING);
      const secretKeyBytes = new Uint8Array(secretKeyBuffer.buffer, secretKeyBuffer.byteOffset, secretKeyBuffer.length);
      const keypair = umi.eddsa.createKeypairFromSecretKey(secretKeyBytes);
      const signer = createSignerFromKeypair(umi, keypair);
      umi.use(signerIdentity(signer));

      const umiImageFile = createGenericFile(uint8ArrayBuffer, imageFile.filename, {
        tags: [{ name: 'Content-Type', value: imageFile.mimeType }],
      });

      const [imageUri] = await umi.uploader.upload([umiImageFile]);
      const metadata = { name, symbol, description, image: imageUri };
      const metadataUri = await umi.uploader.uploadJson(metadata);

      const mintKeypair = umi.eddsa.generateKeypair();
      const mintSigner = createSignerFromKeypair(umi, mintKeypair);

      const createFungibleIx = createFungible(umi, {
        mint: mintSigner,
        name,
        symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(0),
        decimals: parseInt(decimals),
      });

      const createTokenIx = createTokenIfMissing(umi, {
        mint: mintSigner.publicKey,
        owner: umi.identity.publicKey,
        ataProgram: getSplAssociatedTokenProgramId(umi),
      });

      const mintTokensIx = mintTokensTo(umi, {
        mint: mintSigner.publicKey,
        token: findAssociatedTokenPda(umi, {
          mint: mintSigner.publicKey,
          owner: umi.identity.publicKey,
        }),
        amount: BigInt(Number(supply)) * BigInt(10 ** parseInt(decimals)),
      });

      const tx = await createFungibleIx.add(createTokenIx).add(mintTokensIx).sendAndConfirm(umi);
      const signature = base58.deserialize(tx.signature)[0];

      res.status(200).json({
        txUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        mintUrl: `https://explorer.solana.com/address/${mintSigner.publicKey}?cluster=devnet`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  req.pipe(bb);
}

