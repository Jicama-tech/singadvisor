/**
 * Values that the schema stores as plain strings for Postgres/SQLite
 * portability. Keeping them here gives us the type-safety an enum would,
 * without locking the schema to one database's enum syntax.
 */

export const TRAINING_CATEGORIES = [
  "Student",
  "Corporate",
  "Professional",
] as const;
export type TrainingCategory = (typeof TRAINING_CATEGORIES)[number];

export const TRAINING_FORMATS = ["In-person", "Online", "Hybrid"] as const;
export type TrainingFormat = (typeof TRAINING_FORMATS)[number];

export const ENGAGEMENT_MODELS = [
  "Retainer",
  "Project-based",
  "Advisory",
] as const;
export type EngagementModel = (typeof ENGAGEMENT_MODELS)[number];

export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const WORK_MODES = ["On-site", "Remote", "Hybrid"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const REGISTRATION_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const ENQUIRY_STATUSES = ["new", "contacted", "won", "lost"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const APPLICATION_STATUSES = [
  "received",
  "screening",
  "interview",
  "offer",
  "rejected",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "200+"] as const;

/** Blog categories mirror the four practice areas, plus general commentary. */
export const BLOG_CATEGORIES = [
  "Trainings",
  "Events",
  "Consultancy",
  "Careers",
  "Insights",
] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

/** Average adult reading speed, used to estimate an article's length. */
export const WORDS_PER_MINUTE = 225;

/** Resume uploads: what we accept and how large. */
export const RESUME_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const RESUME_ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
export const RESUME_ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

export const SITE = {
  name: "SingAdvisor",
  tagline: "Training, events, consultancy and careers — built around people.",
  email: "hello@singadvisor.com",
  phone: "+65 8000 0000",
  whatsapp: "6580000000",
  address: "3 Tampines Grande, Singapore 528733",
} as const;
