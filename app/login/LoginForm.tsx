"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setIsSubmitting(false);
      return;
    }

    // 기존 jeimap 계정 체계: status가 active가 아니면 접근을 막는다.
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", data.user.id)
      .single();

    if (!profile || profile.status !== "active") {
      await supabase.auth.signOut();
      setError("비활성화된 계정입니다. 관리자에게 문의해 주세요.");
      setIsSubmitting(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <div className="mb-3">
        <h1 className="text-xl font-bold tracking-tight">반갑습니다 👋</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">로그인하여 시작하세요</p>
      </div>

      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@jeisys.com"
        aria-label="이메일"
        className="input-field py-3"
      />
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
        aria-label="비밀번호"
        className="input-field py-3"
      />

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button type="submit" disabled={isSubmitting} className="btn-primary mt-3 py-3">
        {isSubmitting ? "로그인 중" : "로그인"}
      </button>
    </form>
  );
}
