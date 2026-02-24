'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName,
          phone,
          company,
          license_number: licenseNumber,
        },
      },
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg(
      'Account created successfully! Please check your email (including Spam/Junk) and click the verification link to activate your account.'
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
      }}
    >
      <form
        onSubmit={onSignup}
        style={{
          width: 360,
          background: 'white',
          padding: 24,
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          display: 'grid',
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center' }}>
          Sign up
        </h1>

        <input
          type="text"
          placeholder="Full name"
          value={fullName}
          required
          onChange={(e) => setFullName(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        />

        <input
          type="tel"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        />

        <input
          type="text"
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        />

        <input
          type="text"
          placeholder="License number"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          required
          minLength={6}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 10,
            borderRadius: 8,
            border: '1px solid #111',
            background: '#111',
            color: 'white',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Creating…' : 'Create account'}
        </button>

        {msg && (
          <div
            style={{
              marginTop: 4,
              padding: 10,
              borderRadius: 8,
              background: '#e5e7eb',
              color: '#111827',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            {msg}
          </div>
        )}

        <p style={{ marginTop: 4, textAlign: 'center', fontSize: 14 }}>
          Already have an account?{' '}
          <Link
            href="/login"
            style={{ fontWeight: 600, textDecoration: 'underline' }}
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}

