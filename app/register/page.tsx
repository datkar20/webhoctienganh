"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState("");
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
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }

      await setDoc(doc(db, "users", credential.user.uid), {
        displayName: displayName || email.split("@")[0],
        email,
        createdAt: serverTimestamp()
      });

      toast.success("Account created");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden min-h-screen flex-col justify-between bg-slate-950 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-500">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold">VocabVault</p>
            <p className="text-sm text-slate-300">Your English vocabulary command center.</p>
          </div>
        </div>
        <div className="max-w-xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-300">Start clean</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight">Make vocabulary review feel organized.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Sign up, create demo data, then test every workflow from extraction to flashcards in your own Firebase account.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-200">
            {["Topic cards with progress", "Real Firestore data per user", "Quiz history and spaced repetition"].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-teal-300" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-400">No Supabase, no admin SDK, no hardcoded user id.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-slate-200 shadow-soft">
        <CardHeader>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-teal-600 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl">Create your VocabVault</CardTitle>
          <CardDescription>Each account has private topics, words, and quiz history.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
              />
            </div>
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
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign up
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link className="font-medium text-teal-700 hover:text-teal-800" href="/login">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
      </section>
    </main>
  );
}
