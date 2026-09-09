import { z } from "zod";
import { CHANNELS } from "./channels";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  fileName: z.string().min(1).max(200),
  html: z.string().min(1).max(512 * 1024), // 512KB 상한
});

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
});

export const createFormSchema = z.object({
  campaignId: z.string().min(1),
  templateId: z.string().min(1),
  title: z.string().min(1).max(100),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "slug는 소문자, 숫자, 하이픈만 허용됩니다")
    .optional(),
  successMessage: z.string().max(300).optional(),
});

export const createLinkSchema = z.object({
  channel: z.enum(CHANNELS),
  label: z.string().max(60).optional(),
});

/** 공개 제출: 브릿지 스크립트가 FormData를 평탄화한 key → string | string[] 맵 */
export const publicSubmissionSchema = z.object({
  code: z.string().max(40).optional(),
  fields: z
    .record(z.string().min(1).max(100), z.union([z.string().max(5000), z.array(z.string().max(5000)).max(50)]))
    .refine((f) => Object.keys(f).length > 0 && Object.keys(f).length <= 100, "fields는 1~100개여야 합니다"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CreateFormInput = z.infer<typeof createFormSchema>;
export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type PublicSubmissionInput = z.infer<typeof publicSubmissionSchema>;
