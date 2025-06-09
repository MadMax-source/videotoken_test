import CreateToken from "@/components/createToken";
import Header from "@/components/header";
//import SendSol from "@/components/sendSol";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Header />
      <CreateToken />
    </main>
  );
}
