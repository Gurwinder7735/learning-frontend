"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Input } from "antd";
import { Controller, useForm } from "react-hook-form";
import { loginSchema, type LoginSchemaValues } from "@/lib/utils/validators";

interface LoginFormProps {
  isLoading?: boolean;
  onSubmit: (values: LoginSchemaValues) => void;
}

export function LoginForm({ isLoading, onSubmit }: LoginFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)} className="w-full" requiredMark={false}>
      <Form.Item
        label={<span className="font-semibold text-zinc-950 text-sm">Email Address</span>}
        validateStatus={errors.email ? "error" : ""}
        help={errors.email?.message}
        className="mb-5"
      >
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input 
              {...field} 
              size="large"
              placeholder="name@example.com" 
              className="py-3 px-4 rounded-lg hover:border-zinc-400 border-zinc-200 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all bg-white text-zinc-900 placeholder:text-zinc-400 shadow-sm"
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label={<span className="font-semibold text-zinc-950 text-sm">Password</span>}
        validateStatus={errors.password ? "error" : ""}
        help={errors.password?.message}
        className="mb-8"
      >
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input.Password 
              {...field} 
              size="large"
              placeholder="Enter your password" 
              className="py-3 px-4 rounded-lg hover:border-zinc-400 border-zinc-200 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all bg-white text-zinc-900 placeholder:text-zinc-400 shadow-sm [&>input]:bg-transparent"
            />
          )}
        />
      </Form.Item>

      <Button 
        type="primary" 
        htmlType="submit" 
        loading={isLoading} 
        size="large"
        className="w-full !bg-zinc-950 hover:!bg-zinc-800 h-12 rounded-lg text-base font-semibold shadow-md shadow-zinc-900/10 transition-all border-none text-white"
      >
        Sign in
      </Button>
    </Form>
  );
}
