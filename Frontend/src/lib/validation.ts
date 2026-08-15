import { z } from "zod";
import { COMPANY_SIZES } from "@/lib/constants";

/**
 * Every public form is validated here and nowhere else. Client-side `required`
 * attributes are a convenience; these schemas are the actual gate, and they
 * run on the server where they cannot be bypassed.
 */

const name = z
  .string()
  .trim()
  .min(2, "Please enter your name.")
  .max(120, "That name is too long.");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address.")
  .max(200);

const phone = z
  .string()
  .trim()
  .min(6, "Please enter a contact number.")
  .max(30, "That number is too long.")
  .regex(/^[+\d][\d\s()-]*$/, "Please enter a valid contact number.");

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .url("Please enter a full URL, including https://")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const registrationSchema = z.object({
  name,
  email,
  phone,
  company: z.string().trim().max(160).optional(),
  seats: z.coerce
    .number()
    .int("Seats must be a whole number.")
    .min(1, "At least one seat.")
    .max(50, "For more than 50 seats, please contact us directly."),
  message: z.string().trim().max(2000).optional(),
});
export type RegistrationInput = z.infer<typeof registrationSchema>;

export const enquirySchema = z.object({
  name,
  email,
  phone,
  company: z.string().trim().min(2, "Please enter your company.").max(160),
  companySize: z.enum(COMPANY_SIZES).optional(),
  budget: z.string().trim().max(80).optional(),
  timeline: z.string().trim().max(80).optional(),
  message: z
    .string()
    .trim()
    .min(20, "Please give us at least a couple of sentences to work with.")
    .max(4000),
  serviceId: z.string().trim().optional(),
});
export type EnquiryInput = z.infer<typeof enquirySchema>;

export const applicationSchema = z.object({
  name,
  email,
  phone,
  linkedin: optionalUrl,
  portfolio: optionalUrl,
  coverLetter: z
    .string()
    .trim()
    .min(50, "Please tell us a little more — at least a short paragraph.")
    .max(6000),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export const contactSchema = z.object({
  name,
  email,
  phone: phone.optional().or(z.literal("").transform(() => undefined)),
  subject: z.string().trim().min(3, "Please add a subject.").max(160),
  message: z
    .string()
    .trim()
    .min(10, "Please add a little more detail.")
    .max(4000),
});

export const subscribeSchema = z.object({ email });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Please enter your password.").max(200),
});

/** Flatten Zod issues into the { field: message } shape our forms render. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}
