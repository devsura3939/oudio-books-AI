// Hand-maintained types for the EXTERNAL Supabase project (oakikavdnnvxzlcvsovq).
// Keep in sync with supabase/external/001_init.sql.

export type BookStatus = "uploaded" | "parsing" | "ready" | "failed";
export type ChapterStatus = "pending" | "synthesizing" | "done" | "failed";
export type JobKind = "parse" | "synthesize";
export type JobStatus = "queued" | "running" | "done" | "failed";
export type AppRole = "admin" | "moderator" | "user";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  language: string;
  source_filename: string | null;
  pdf_path: string | null;
  cover_url: string | null;
  page_count: number | null;
  total_chapters: number;
  status: BookStatus;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  book_id: string;
  user_id: string;
  chapter_index: number;
  title: string;
  text_content: string;
  word_count: number;
  status: ChapterStatus;
  created_at: string;
  updated_at: string;
}

export interface AudioSegment {
  id: string;
  chapter_id: string;
  book_id: string;
  user_id: string;
  part_index: number;
  storage_path: string;
  voice: string | null;
  duration_seconds: number | null;
  byte_size: number | null;
  created_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  book_id: string | null;
  kind: JobKind;
  status: JobStatus;
  progress: number;
  total: number;
  message: string | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}
