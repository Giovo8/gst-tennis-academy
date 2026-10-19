'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// I link di Supabase (reset password / conferma email) possono atterrare sulla
// home: li inoltra a /auth/callback.
export default function AuthCodeHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    if (code) {
      router.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=/auth/reset-password`);
      return;
    }

    if (tokenHash && type) {
      router.replace(
        `/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(
          type,
        )}&next=/auth/reset-password`,
      );
    }
  }, [searchParams, router]);

  return null;
}
