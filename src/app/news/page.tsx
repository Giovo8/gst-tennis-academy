import AdminNewsBoard from "@/components/news/AdminNewsBoard";

export const metadata = {
  title: "News | GST Tennis Academy",
};

export default function NewsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-16">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9fb6a6]">News</p>
        <h1 className="text-3xl font-semibold text-white">Aggiornamenti dall&apos;Academy</h1>
        <p className="text-sm text-[#c6d8c9]">
          Pubblica e gestisci i post. Integrazione con backend/DB arriverà in seguito.
        </p>
      </div>
      <AdminNewsBoard />
    </main>
  );
}


