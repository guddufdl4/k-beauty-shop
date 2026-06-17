import Link from "next/link";
import { AuthForm } from "@/components/store/auth-form";
import { signUp } from "@/app/actions/auth";

export default function SignUpPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold">회원가입</h1>
      <p className="mt-2 text-zinc-600">B2C · 도매 회원 모두 가입 가능 (Phase 2)</p>
      <div className="mt-8">
        <AuthForm
          action={signUp}
          submitLabel="가입하기"
          footer={
            <p className="text-center text-sm text-zinc-600">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-rose-600 hover:underline">
                로그인
              </Link>
            </p>
          }
        />
      </div>
    </main>
  );
}
