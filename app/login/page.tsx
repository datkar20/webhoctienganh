"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Loader2 } from "lucide-react";
import { AuthMarketingPanel } from "@/components/auth/auth-marketing-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFirebaseErrorMessage } from "@/lib/firebase-errors";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [authLoading, router, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error, "Could not login"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.12fr_0.88fr]">
      <AuthMarketingPanel mode="login" />

      <section className="flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-slate-200 shadow-soft">
        <CardHeader>
          <div className="mb-4 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-950">VocabVault</p>
              <p className="text-xs text-slate-500">Organized English vocabulary.</p>
            </div>
          </div>
          <CardTitle className="text-2xl">Login to VocabVault</CardTitle>
          <CardDescription>Continue your review queue, topic practice, and progress tracking.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Login
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            New here?{" "}
            <Link className="font-medium text-teal-700 hover:text-teal-800" href="/register">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
      </section>
    </main>
  );
}
