import { z } from "zod";

export const emailSchema = z.string().trim().min(1, "Email is required").email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const gstModeSchema = z.enum(["standard", "custom", "none"]);

export const loadInputSchema = z
  .object({
    weight: z.coerce.number({ message: "Enter a valid weight" }).positive("Enter a valid weight greater than 0"),
    vehicleNumber: z.string().trim().min(1, "Vehicle number is required").max(20, "Vehicle number is too long"),
    companyName: z.string().trim().min(1, "Select or enter a company").max(100, "Company name is too long"),
    partyName: z.string().trim().min(1, "Select or enter a party").max(100, "Party name is too long"),
    rate: z.coerce.number({ message: "Enter a valid rate" }).min(0, "Rate cannot be negative"),
    driverAdvance: z.coerce.number().min(0, "Driver advance cannot be negative").default(0),
    vehicleRent: z.coerce.number().min(0, "Vehicle rent cannot be negative").default(0),
    dieselCost: z.coerce.number().min(0, "Diesel cost cannot be negative").default(0),
    gstMode: gstModeSchema,
    customGstPercentage: z.coerce.number().min(0).max(100).optional(),
    loadDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  })
  .transform((data) => {
    const gstEnabled = data.gstMode !== "none";
    const gstPercentage = data.gstMode === "custom" ? (data.customGstPercentage ?? 0) : data.gstMode === "standard" ? 18 : 0;
    return {
      ...data,
      gstEnabled,
      gstPercentage,
    };
  })
  .refine((data) => data.gstMode !== "custom" || data.customGstPercentage !== undefined, {
    message: "Enter a GST percentage between 0 and 100",
    path: ["customGstPercentage"],
  });

export type LoadInput = z.infer<typeof loadInputSchema>;

export const nameEntrySchema = z.string().trim().min(1, "Required").max(100, "Too long");

export const paymentInputSchema = z.object({
  partyName: z.string().trim().min(1, "Select or enter a party").max(100, "Party name is too long"),
  amount: z.coerce.number({ message: "Enter a valid amount" }).positive("Enter an amount greater than 0"),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;
