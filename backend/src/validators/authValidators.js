const { z } = require("zod");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain a special character");

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name cannot exceed 80 characters"),
    email: z
      .string()
      .trim()
      .email("Invalid email address")
      .transform((value) => value.toLowerCase()),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .transform((value) => value.toLowerCase()),
});

const verifyResetOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .transform((value) => value.toLowerCase()),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
});

const resendResetOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .transform((value) => value.toLowerCase()),
});

const resetPasswordSchema = z
  .object({
    resetToken: z.string().min(1, "Reset token is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((data, context) => {
    if (data.newPassword !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((data, context) => {
    if (data.newPassword !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

module.exports = {
  passwordSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resendResetOtpSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
