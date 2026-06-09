"use client";

import { useEffect } from "react";
import { Typography, Alert } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/forms/LoginForm/LoginForm";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { loginRequest, clearError } from "@/store/modules/auth/authSlice";
import { selectAuth } from "@/store/modules/auth/authSelectors";
import type { LoginSchemaValues } from "@/lib/utils/validators";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { isLoading, isAuthenticated, error } = useAppSelector(selectAuth);

  const redirectTo = searchParams.get("redirect") || APP_ROUTES.clients;

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, redirectTo, router]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSubmit = (values: LoginSchemaValues) => {
    dispatch(loginRequest({ email: values.email, password: values.password }));
  };

  return (
    <div className="min-h-screen flex w-full bg-white selection:bg-zinc-900 selection:text-white">
      <div className="hidden lg:flex w-1/2 relative bg-zinc-950 flex-col justify-between p-12 lg:p-24 overflow-hidden">
        <div
          className="absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg">
            <div className="w-4 h-4 bg-zinc-950 rounded-sm" />
          </div>
          <span className="text-white font-bold text-5xl tracking-tight">Apex</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tighter leading-[1.05] mb-6">
            Smarter leads.
            <br />
            Faster deals.
          </h1>
          <p className="text-xl text-zinc-400 font-light max-w-md leading-relaxed">
            AI-powered platform for managing leads, clients, proposals, and team collaboration.
          </p>
        </div>
        <div className="relative z-10 text-zinc-500 text-sm font-medium">
          &copy; {new Date().getFullYear()} Appmotiv. All rights reserved.
        </div>
        <div className="relative z-10 text-zinc-600 text-xs font-medium mt-2">
          Powered by <span className="text-zinc-400 font-semibold">Appmotiv</span>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 relative bg-white">
        <div className="w-full max-w-[420px] space-y-8 relative z-10">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-8 h-8 bg-zinc-950 rounded-lg flex items-center justify-center shadow-lg">
              <div className="w-4 h-4 bg-white rounded-sm" />
            </div>
            <span className="text-zinc-950 font-bold text-xl tracking-tight">Apex</span>
          </div>
          <div className="text-left mb-8">
            <Typography.Title
              level={2}
              className="!mb-2 !font-bold !text-zinc-950 !text-3xl tracking-tight"
            >
              Welcome back
            </Typography.Title>
            <Typography.Text className="text-zinc-500 text-base">
              Please enter your details to sign in.
            </Typography.Text>
          </div>
          {error && <Alert message={error} type="error" showIcon closable className="mb-4" />}
          <div className="mt-8">
            <LoginForm isLoading={isLoading} onSubmit={handleSubmit} />
          </div>
        </div>
      </div>
    </div>
  );
}
