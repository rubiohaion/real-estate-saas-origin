"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      setError(error?.message || "Login failed");
      setLoading(false);
      return;
    }

    // ✅ session is now stored in the browser
    window.location.href = "/";
  }

  async function handleResendVerification() {
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError("Please enter your email first.");
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
    });

    if (error) {
      setError(error.message);
      return;
    }

    setInfo("Verification email sent. Please check your inbox (and Spam/Junk).");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 360,
          background: "white",
          padding: 24,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          display: "grid",
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, textAlign: "center" }}>
          Login
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #111",
            background: "#111",
            color: "white",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Logging in…" : "Login"}
        </button>

        {/* ✅ Added signup link */}
        <p style={{ textAlign: "center", fontSize: 14 }}>
          Not registered yet?{" "}
          <a href="/signup" style={{ fontWeight: 600, textDecoration: "underline" }}>
            Click here
          </a>
        </p>

        {/* ✅ Resend verification email */}
        <p style={{ textAlign: "center", fontSize: 13, marginTop: -6 }}>
          Didn&apos;t get the verification email?{" "}
          <button
            type="button"
            onClick={handleResendVerification}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            Resend verification email
          </button>
        </p>

        {info && (
          <div
            style={{
              marginTop: 4,
              padding: 10,
              borderRadius: 8,
              background: "#e5e7eb",
              color: "#111827",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {info}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 4,
              padding: 10,
              borderRadius: 8,
              background: "#fee2e2",
              color: "#991b1b",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}
      </form>
    </div>
  );
}

