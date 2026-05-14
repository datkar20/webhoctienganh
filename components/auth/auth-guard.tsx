"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading) {
    return <LoadingState label="Preparing your workspace..." className="min-h-screen" />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Redirecting to login</CardTitle>
            <CardDescription>{error ?? "You need to login before opening this workspace."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" className="w-full" onClick={() => router.replace("/login")}>
              Go to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
