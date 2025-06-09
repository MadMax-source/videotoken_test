'use client';

import { useState } from 'react';
import axios from 'axios';
import { createFungible, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { createTokenIfMissing, findAssociatedTokenPda, getSplAssociatedTokenProgramId, mintTokensTo } from '@metaplex-foundation/mpl-toolbox';
import { percentAmount, createSignerFromKeypair } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import umiWithCurrentWalletAdapter from '../lib/umi/umiWithCurrentWalletAdapter';

const PINATA_API_KEY = 'd9805c7dc7dfcc3b8b32';
const PINATA_API_SECRET = 'dbc9a55e0c0d2c4f01ad3d0ffc62fb4996eb5afe4a65a85b112d0dce05b7d383';

export default function CreateToken() {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    decimals: 9,
    supply: '',
    imageFile: null as File | null,
    videoFile: null as File | null,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'decimals' ? parseInt(value) : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    }
  };

  const uploadToPinata = async (file: File) => {
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    const data = new FormData();
    data.append('file', file);

    const res = await axios.post(url, data, {
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': 'multipart/form-data',
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_API_SECRET,
      },
    });
    return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
  };

  const uploadMetadataToPinata = async (metadata: any) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    const res = await axios.post(url, metadata, {
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_API_SECRET,
      },
    });
    return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
  };

  const handleSubmit = async () => {
    const { name, symbol, description, decimals, supply, imageFile, videoFile } = formData;

    if (!name || !symbol || !description || !imageFile || !videoFile || !supply) {
      setStatus('❌ Please fill in all fields and upload an image and video.');
      return;
    }

    setStatus(null);
    setLoading(true);

    try {
      const imageUri = await uploadToPinata(imageFile);
      const videoUri = await uploadToPinata(videoFile);

      const metadata = { name, symbol, description, image: imageUri, video: videoUri };
      const metadataUri = await uploadMetadataToPinata(metadata);

      const umi = umiWithCurrentWalletAdapter().use(mplTokenMetadata());
      const mintKeypair = umi.eddsa.generateKeypair();
      const mintSigner = createSignerFromKeypair(umi, mintKeypair);

      const createFungibleIx = createFungible(umi, {
        mint: mintSigner,
        name,
        symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(0),
        decimals: parseInt(decimals.toString()),
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
        amount: BigInt(Number(supply)) * BigInt(10 ** parseInt(decimals.toString())),
      });

      const tx = await createFungibleIx.add(createTokenIx).add(mintTokensIx).sendAndConfirm(umi);
      const signature = base58.deserialize(tx.signature)[0];

      await axios.post('/api/save-token', {
        mint: mintSigner.publicKey.toString(),
        amount: supply,
        videoUri,
      });

      setStatus(
        `✅ Token Created!\n\n🔗 Tx: https://explorer.solana.com/tx/${signature}?cluster=devnet\n🔗 Mint Address: https://explorer.solana.com/address/${mintSigner.publicKey}?cluster=devnet`
      );
    } catch (err: any) {
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 border rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        VideoToken LaunchPad
      </h2>
      <h3 className='text-lg font-semibold mb-4'>
        Lean Test
      </h3>
      <input
        type="text"
        name="name"
        placeholder="Token Name"
        className="w-full p-2 border rounded mb-3"
        value={formData.name}
        onChange={handleChange}
      />
      <input
        type="text"
        name="symbol"
        placeholder="Token Symbol"
        className="w-full p-2 border rounded mb-3"
        value={formData.symbol}
        onChange={handleChange}
      />
      <textarea
        name="description"
        placeholder="Token Description"
        className="w-full p-2 border rounded mb-3"
        value={formData.description}
        onChange={handleChange}
      />
      <input
        type="number"
        name="decimals"
        placeholder="Decimals (e.g. 9)"
        className="w-full p-2 border rounded mb-3"
        value={formData.decimals}
        onChange={handleChange}
      />
      <input
        type="number"
        name="supply"
        placeholder="Token Supply"
        className="w-full p-2 border rounded mb-3"
        value={formData.supply}
        onChange={handleChange}
      />
      <div>
        <p className="text-sm text-gray-500 mb-2">
          Upload an image (PNG/JPEG) and a video (MP4/WebM/OGG) for the token.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Note: The image and video will be uploaded to Pinata and linked in the token metadata.
        </p>
      </div>
      <input
        type="file"
        name="imageFile"
        placeholder='Upload Image (PNG/JPEG)'
        accept="image/png, image/jpeg"
        className="mb-3"
        onChange={handleFileChange}
      />
      <div>
        <p className="text-sm text-gray-500 mb-2">
          Upload a video (MP4/WebM/OGG) for the token.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Note: The video will be uploaded to Pinata and linked in the token metadata.
        </p>
      </div>
      <input
        type="file"
        name="videoFile"
        placeholder='Upload Video (MP4/WebM/OGG)'
        accept="video/mp4,video/webm,video/ogg"
        className="mb-3"
        onChange={handleFileChange}
      />
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
      >
        {loading ? 'Creating Token...' : 'Create Token'}
      </button>
      {status && <pre className="mt-4 text-sm whitespace-pre-wrap">{status}</pre>}
    </div>
  );
}
