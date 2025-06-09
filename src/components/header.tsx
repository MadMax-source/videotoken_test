'use client'

import dynamic from "next/dynamic";
const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const Header = () => {
  return (
    <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex border">
      <div className="flex pt-4 lg:pt-0 w-full items-end justify-center gap-4 dark:from-black dark:via-black lg:static lg:size-auto lg:bg-none">
        <WalletMultiButtonDynamic />
      </div>
    </div>
  );
};

export default Header;
