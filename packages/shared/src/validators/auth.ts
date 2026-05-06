import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const InviteCoachSchema = z.object({
  email: z.string().email("Enter a valid email"),
  name: z.string().min(1, "Name required").max(100, "Name too long"),
});

export const SetPasswordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[0-9]/, "Include at least one number"),
});

export type TLoginInput = z.infer<typeof LoginSchema>;
export type TInviteCoachInput = z.infer<typeof InviteCoachSchema>;
export type TSetPasswordInput = z.infer<typeof SetPasswordSchema>;
