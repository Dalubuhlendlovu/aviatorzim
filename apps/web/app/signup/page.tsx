import { AuthForm } from "../../src/components/auth-form";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="badge">KYC-ready onboarding</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Create your account</h1>
      </div>
      <AuthForm mode="signup" />
    </div>
  );
}
