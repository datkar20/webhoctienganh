"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Loader2 } from "lucide-react";
import { AuthMarketingPanel } from "@/components/auth/auth-marketing-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFirebaseErrorMessage } from "@/lib/firebase-errors";
import { auth, db } from "@/lib/firebase";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
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
      toast.error(getFirebaseErrorMessage(error, "Could not create account"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.12fr_0.88fr]">
      <AuthMarketingPanel mode="register" />

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
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">{t("registerTitle")}</CardTitle>
              <CardDescription>{t("registerDescription")}</CardDescription>
            </div>
            <LanguageToggle />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">{t("displayName")}</Label>
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
              <Label htmlFor="password">{t("password")}</Label>
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
              {t("signUp")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            {t("alreadyHaveAccount")}{" "}
            <Link className="font-medium text-teal-700 hover:text-teal-800" href="/login">
              {t("login")}
            </Link>
          </p>
        </CardContent>
      </Card>
      </section>
    </main>
  );
}
