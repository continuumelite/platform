import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { Card } from '@/components/ui';
import { PasswordForm } from './password-form';

export default function AccountPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const user = await getCurrentUser();
  const membership = user.memberships[0];
  return (
    <>
      <h1 className="text-4xl text-zinc-50">Account</h1>
      <Card>
        <p className="text-sm text-zinc-400">Signed in as</p>
        <p className="font-semibold">{user.fullName ?? user.email}</p>
        <p className="text-sm text-zinc-400">
          {user.email}
          {membership
            ? ` · ${membership.organizationName} (${membership.role.replace('_', ' ')})`
            : ''}
        </p>
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">Change password</h2>
        <PasswordForm />
      </Card>
    </>
  );
}
