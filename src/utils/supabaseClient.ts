import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Public (anon) Supabase configuration.
 * The anon key is public by design, but it is never logged: only its presence
 * is reported so that a misconfigured deployment is easy to spot.
 */
const readEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const supabaseUrl = readEnvValue(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = readEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

/** True when both public env vars are present and the client could be created. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing). Cloud features are disabled.'
  );
}

/**
 * `null` when the app runs without Supabase credentials. Every helper below
 * degrades gracefully instead of throwing so the UI never crashes.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export type Database = {
  public: {
    Tables: {
      recordings: {
        Row: {
          id: string;
          title: string;
          user_id: string;
          url: string;
          thumbnail: string | null;
          duration: number | null;
          size: number | null;
          resolution: string | null;
          format: string | null;
          favorite: boolean | null;
          folder: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          user_id: string;
          url: string;
          thumbnail?: string | null;
          duration?: number | null;
          size?: number | null;
          resolution?: string | null;
          format?: string | null;
          favorite?: boolean | null;
          folder?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          user_id?: string;
          url?: string;
          thumbnail?: string | null;
          duration?: number | null;
          size?: number | null;
          resolution?: string | null;
          format?: string | null;
          favorite?: boolean | null;
          folder?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      recording_tags: {
        Row: {
          id: string;
          recording_id: string;
          tag: string;
        };
        Insert: {
          id?: string;
          recording_id: string;
          tag: string;
        };
        Update: {
          id?: string;
          recording_id?: string;
          tag?: string;
        };
      };
    };
  };
};

type RecordingRow = Database['public']['Tables']['recordings']['Row'];

export type Recording = RecordingRow & {
  tags: string[];
};

export type RecordingTag = Database['public']['Tables']['recording_tags']['Row'];

export type NewRecording = Omit<Database['public']['Tables']['recordings']['Insert'], 'user_id'> & {
  tags?: string[];
};

export type RecordingUpdate = Partial<
  Omit<Database['public']['Tables']['recordings']['Update'], 'user_id' | 'id'>
> & {
  tags?: string[];
};

/** Result of a write that returns a row. `error` is a user-safe message. */
export interface MutationResult<T> {
  data: T | null;
  error: string | null;
}

/** Result of a write that returns nothing. */
export interface ActionResult {
  error: string | null;
}

export const NOT_CONFIGURED_MESSAGE =
  'Cloud storage is unavailable because the app is not connected to Supabase.';
export const NOT_AUTHENTICATED_MESSAGE = 'Please sign in to manage your recordings.';
export const NOT_FOUND_MESSAGE =
  'That recording no longer exists or you do not have access to it.';

const MAX_TITLE_LENGTH = 200;
const MAX_FOLDER_LENGTH = 100;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS = 20;

const SAFE_URL_PROTOCOLS = ['http:', 'https:', 'blob:', 'data:'];

/**
 * Blocks `javascript:`/`vbscript:`/`file:` URLs before they reach the database
 * (and therefore before they end up in a `src`/`href` attribute).
 */
export const isSafeMediaUrl = (url: string | null | undefined): boolean => {
  if (typeof url !== 'string') return false;
  const value = url.trim();
  if (!value) return false;

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return SAFE_URL_PROTOCOLS.includes(new URL(value, base).protocol);
  } catch {
    return false;
  }
};

const errorMessage = (error: { message?: string } | null | undefined, fallback: string): string =>
  error && typeof error.message === 'string' && error.message.length > 0 ? error.message : fallback;

const sanitizeNumber = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const sanitizeFolder = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, MAX_FOLDER_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
};

const sanitizeTags = (tags: string[] | undefined): string[] => {
  if (!Array.isArray(tags)) return [];
  const unique = new Set<string>();

  tags.forEach((tag) => {
    if (typeof tag !== 'string') return;
    const trimmed = tag.trim().slice(0, MAX_TAG_LENGTH);
    if (trimmed) unique.add(trimmed);
  });

  return [...unique].slice(0, MAX_TAGS);
};

/** Resolves the signed-in user id, or `null` when there is no session. */
const getCurrentUserId = async (): Promise<string | null> => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
};

// Helpers for working with recordings
export const getRecordings = async (): Promise<Recording[]> => {
  if (!supabase) return [];

  // Get all recordings visible to the current user (RLS scopes this to them)
  const { data: recordings, error: recordingsError } = await supabase
    .from('recordings')
    .select('*')
    .order('created_at', { ascending: false });

  if (recordingsError) {
    console.error('Error fetching recordings:', recordingsError.message);
    return [];
  }

  const rows = (recordings ?? []) as RecordingRow[];

  // PostgREST rejects `in.()` with an empty list, so skip the tags query
  if (rows.length === 0) return [];

  const recordingIds = rows.map((rec) => rec.id);
  const { data: tags, error: tagsError } = await supabase
    .from('recording_tags')
    .select('*')
    .in('recording_id', recordingIds);

  if (tagsError || !tags) {
    if (tagsError) console.error('Error fetching recording tags:', tagsError.message);
    return rows.map((rec) => ({ ...rec, tags: [] }));
  }

  // Group tags once instead of scanning the tag list per recording
  const tagsByRecording = new Map<string, string[]>();
  (tags as RecordingTag[]).forEach((tag) => {
    const existing = tagsByRecording.get(tag.recording_id);
    if (existing) {
      existing.push(tag.tag);
    } else {
      tagsByRecording.set(tag.recording_id, [tag.tag]);
    }
  });

  return rows.map((recording) => ({
    ...recording,
    tags: tagsByRecording.get(recording.id) ?? [],
  }));
};

export const addRecording = async (recording: NewRecording): Promise<MutationResult<Recording>> => {
  if (!supabase) return { data: null, error: NOT_CONFIGURED_MESSAGE };

  const { tags, ...fields } = recording;

  // Validate before hitting the API so we never send a request that 400s
  const title = typeof fields.title === 'string' ? fields.title.trim().slice(0, MAX_TITLE_LENGTH) : '';
  if (!title) {
    return { data: null, error: 'Please provide a title for this recording.' };
  }
  if (!isSafeMediaUrl(fields.url)) {
    return { data: null, error: 'This recording has no valid video URL to save.' };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: NOT_AUTHENTICATED_MESSAGE };
  }

  const { data, error } = await supabase
    .from('recordings')
    .insert({
      ...fields,
      title,
      thumbnail: isSafeMediaUrl(fields.thumbnail) ? fields.thumbnail : null,
      duration: sanitizeNumber(fields.duration),
      size: sanitizeNumber(fields.size),
      folder: sanitizeFolder(fields.folder),
      user_id: userId,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error adding recording:', errorMessage(error, 'unknown error'));
    return { data: null, error: errorMessage(error, 'Could not save this recording.') };
  }

  const cleanTags = sanitizeTags(tags);
  const saved: Recording = { ...(data as RecordingRow), tags: cleanTags };

  if (cleanTags.length > 0) {
    const { error: tagError } = await supabase
      .from('recording_tags')
      .insert(cleanTags.map((tag) => ({ recording_id: saved.id, tag })));

    if (tagError) {
      console.error('Error adding recording tags:', tagError.message);
      return {
        data: { ...saved, tags: [] },
        error: 'The recording was saved, but its tags could not be saved.',
      };
    }
  }

  return { data: saved, error: null };
};

export const updateRecording = async (
  id: string,
  updates: RecordingUpdate
): Promise<ActionResult> => {
  if (!supabase) return { error: NOT_CONFIGURED_MESSAGE };
  if (!id) return { error: 'A recording id is required.' };

  const userId = await getCurrentUserId();
  if (!userId) return { error: NOT_AUTHENTICATED_MESSAGE };

  const { tags, ...rest } = updates;
  const recordingUpdates: Record<string, unknown> = { ...rest };

  if ('title' in recordingUpdates) {
    const title =
      typeof rest.title === 'string' ? rest.title.trim().slice(0, MAX_TITLE_LENGTH) : '';
    if (!title) return { error: 'A recording title cannot be empty.' };
    recordingUpdates.title = title;
  }
  if ('url' in recordingUpdates) {
    if (!isSafeMediaUrl(rest.url)) return { error: 'That video URL is not valid.' };
  }
  if ('thumbnail' in recordingUpdates) {
    recordingUpdates.thumbnail = isSafeMediaUrl(rest.thumbnail) ? rest.thumbnail : null;
  }
  if ('duration' in recordingUpdates) recordingUpdates.duration = sanitizeNumber(rest.duration);
  if ('size' in recordingUpdates) recordingUpdates.size = sanitizeNumber(rest.size);
  if ('folder' in recordingUpdates) recordingUpdates.folder = sanitizeFolder(rest.folder);

  if (Object.keys(recordingUpdates).length > 0) {
    recordingUpdates.updated_at = new Date().toISOString();

    // `user_id` filter is defence in depth: RLS already enforces ownership
    const { data, error } = await supabase
      .from('recordings')
      .update(recordingUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      console.error('Error updating recording:', error.message);
      return { error: errorMessage(error, 'Could not update this recording.') };
    }
    if (!data || data.length === 0) {
      return { error: NOT_FOUND_MESSAGE };
    }
  }

  if (tags) {
    // Replace the tag set: delete first, then insert the sanitized values
    const { error: deleteError } = await supabase
      .from('recording_tags')
      .delete()
      .eq('recording_id', id);

    if (deleteError) {
      console.error('Error deleting recording tags:', deleteError.message);
      return { error: errorMessage(deleteError, 'Could not update the tags for this recording.') };
    }

    const cleanTags = sanitizeTags(tags);
    if (cleanTags.length > 0) {
      const { error: insertError } = await supabase
        .from('recording_tags')
        .insert(cleanTags.map((tag) => ({ recording_id: id, tag })));

      if (insertError) {
        console.error('Error inserting recording tags:', insertError.message);
        return { error: errorMessage(insertError, 'Could not save the tags for this recording.') };
      }
    }
  }

  return { error: null };
};

export const deleteRecording = async (id: string): Promise<ActionResult> => {
  if (!supabase) return { error: NOT_CONFIGURED_MESSAGE };
  if (!id) return { error: 'A recording id is required.' };

  const userId = await getCurrentUserId();
  if (!userId) return { error: NOT_AUTHENTICATED_MESSAGE };

  // Tags are removed automatically through ON DELETE CASCADE
  const { data, error } = await supabase
    .from('recordings')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id');

  if (error) {
    console.error('Error deleting recording:', error.message);
    return { error: errorMessage(error, 'Could not delete this recording.') };
  }
  if (!data || data.length === 0) {
    return { error: NOT_FOUND_MESSAGE };
  }

  return { error: null };
};

export const getFolders = async (): Promise<string[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('recordings')
    .select('folder')
    .not('folder', 'is', null);

  if (error) {
    console.error('Error fetching folders:', error.message);
    return [];
  }

  // Get unique, non-empty folder names
  const folders = new Set<string>();
  ((data ?? []) as Array<{ folder: string | null } | null>).forEach((item) => {
    const folder = sanitizeFolder(item?.folder);
    if (folder) folders.add(folder);
  });

  return [...folders].sort((a, b) => a.localeCompare(b));
};
