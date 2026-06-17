import Link from "next/link";
import { AuthForm } from "@/components/store/auth-form";
import { signIn } from "@/app/actions/auth";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold">로그인</h1>
      <p className="mt-2 text-zinc-600">K-Beauty Shop 계정으로 로그인</p>
      <div className="mt-8">
        <AuthForm
          action={signIn}
          submitLabel="로그인"
          footer={
            <p className="text-center text-sm text-zinc-600">
              계정이 없으신가요?{" "}
              <Link href="/signup" className="text-rose-600 hover:underline">
                회원가입
              </Link>
            </p>
          }
        />
      </div>
    </main>
  );
}
