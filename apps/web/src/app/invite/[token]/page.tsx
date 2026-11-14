import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { AcceptForm } from './accept-form';

export default function InvitePage({ params }: PageProps<'/invite/[token]'>) {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <Card className="w-full max-w-md">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading invitation…</p>}>
          <Invitation params={params} />
        </Suspense>
      </Card>
    </main>
  );
}

async function Invitation({ params }: { params: PageProps<'/invite/[token]'>['params'] }) {
  const { token } = await params;
  const supabase = await createClient();

  const [{ data: invite }, { data: claims }] = await Promise.all([
    supabase.rpc('get_invitation', { invite_token: token }).maybeSingle(),
    supabase.auth.getClaims(),
  ]);

  if (!invite || invite.is_accepted || invite.is_expired) {
    return (
      <>
        <h1 className="text-xl font-semibold">This invitation isn’t valid</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {invite?.is_accepted
            ? 'It has already been used. '
            : invite?.is_expired
              ? 'It has expired. '
              : ''}
          Ask your coach to send you a new link.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm underline">
          Go to sign in
        </Link>
      </>
    );
  }

  const signedInEmail = claims?.claims?.email?.toLowerCase();
  const roleLabel = invite.role === 'athlete' ? 'an athlete' : `a ${invite.role.replace('_', ' ')}`;

  return (
    <>
      <p className="text-sm text-zinc-500">{invite.organization_name}</p>
      <h1 className="mt-1 text-xl font-semibold">
        {invite.invited_by_name ?? 'Your coach'} invited you to join as {roleLabel}
      </h1>
      {signedInEmail && signedInEmail !== invite.email ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          You’re signed in as {signedInEmail}, but this invitation is for {invite.email}. Sign out
          and open the link again.
        </p>
      ) : (
        <AcceptForm token={token} email={invite.email} signedIn={Boolean(signedInEmail)} />
      )}
    </>
  );
}
