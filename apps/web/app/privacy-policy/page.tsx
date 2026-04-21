export default function PrivacyPolicyPage() {
  return (
    <div className="card max-w-4xl space-y-6 p-6 text-neutral-200">
      <div>
        <p className="badge">Privacy Policy</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Data handling overview</h1>
      </div>
      <p>
        Aviator Zim Game collects account, transaction, and gameplay data to operate the platform, meet security obligations, and support
        responsible-gambling interventions. Before launch, this policy should be reviewed by qualified legal counsel for Zimbabwean and
        cross-border privacy compliance requirements.
      </p>
      <ul className="list-disc space-y-3 pl-6">
        <li>Collect only the data necessary for onboarding, payments, security, and compliance.</li>
        <li>Protect account and payment data with encryption, access controls, and audit logging.</li>
        <li>Retain records only as long as legally and operationally required.</li>
        <li>Provide support for access requests, corrections, and account restriction controls.</li>
      </ul>
    </div>
  );
}
