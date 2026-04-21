import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <div className="card mx-auto max-w-3xl space-y-6 p-8 text-neutral-200">
      <div>
        <p className="badge">Payment return</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Deposit flow returned successfully</h1>
      </div>
      <p>
        Your Paynow checkout returned to Aviator Zim Game. Final crediting still depends on confirmed payment status from Paynow,
        so your wallet will update after polling or the result callback confirms the transaction.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="rounded-2xl bg-aviator.yellow px-5 py-3 font-bold text-black">
          Back to dashboard
        </Link>
        <Link href="/game" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-white">
          Go to live game
        </Link>
      </div>
    </div>
  );
}
