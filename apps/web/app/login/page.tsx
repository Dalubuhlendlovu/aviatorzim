import { AuthForm } from "../../src/components/auth-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="badge">Secure authentication</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Login</h1>
      </div>
      <AuthForm mode="login" />
    </div>
  );
}
