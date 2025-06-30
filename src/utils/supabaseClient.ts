import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export type Recording = Database['public']['Tables']['recordings']['Row'] & {
  tags: string[];
};

export type RecordingTag = Database['public']['Tables']['recording_tags']['Row'];

// Helpers for working with recordings
export const getRecordings = async (): Promise<Recording[]> => {
  // Get all recordings for the current user
  const { data: recordings, error: recordingsError } = await supabase
    .from('recordings')
    .select('*')
    .order('created_at', { ascending: false });

  if (recordingsError) {
    console.error('Error fetching recordings:', recordingsError);
    return [];
  }

  // Get all tags for these recordings
  const recordingIds = recordings.map(rec => rec.id);
  const { data: tags, error: tagsError } = await supabase
    .from('recording_tags')
    .select('*')
    .in('recording_id', recordingIds);

  if (tagsError) {
    console.error('Error fetching recording tags:', tagsError);
    return recordings.map(rec => ({ ...rec, tags: [] }));
  }

  // Attach tags to each recording
  return recordings.map(recording => {
    const recordingTags = tags
      .filter(tag => tag.recording_id === recording.id)
      .map(tag => tag.tag);
    
    return {
      ...recording,
      tags: recordingTags
    };
  });
};

export const addRecording = async (recording: Omit<Database['public']['Tables']['recordings']['Insert'], 'user_id'> & { tags?: string[] }): Promise<Recording | null> => {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('No authenticated user found');
    return null;
  }

  // Insert the recording
  const { data, error } = await supabase
    .from('recordings')
    .insert({
      ...recording,
      user_id: user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding recording:', error);
    return null;
  }

  // Add tags if provided
  const tags = recording.tags || [];
  if (tags.length > 0) {
    const tagInserts = tags.map(tag => ({
      recording_id: data.id,
      tag
    }));

    const { error: tagError } = await supabase
      .from('recording_tags')
      .insert(tagInserts);

    if (tagError) {
      console.error('Error adding recording tags:', tagError);
    }
  }

  return { ...data, tags };
};

export const updateRecording = async (id: string, updates: Partial<Omit<Database['public']['Tables']['recordings']['Update'], 'user_id'>> & { tags?: string[] }): Promise<boolean> => {
  // Update the recording
  const { tags, ...recordingUpdates } = updates;
  if (Object.keys(recordingUpdates).length > 0) {
    const { error } = await supabase
      .from('recordings')
      .update(recordingUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating recording:', error);
      return false;
    }
  }

  // Update tags if provided
  if (tags) {
    // First delete all existing tags
    const { error: deleteError } = await supabase
      .from('recording_tags')
      .delete()
      .eq('recording_id', id);

    if (deleteError) {
      console.error('Error deleting recording tags:', deleteError);
      return false;
    }

    // Then add the new tags
    if (tags.length > 0) {
      const tagInserts = tags.map(tag => ({
        recording_id: id,
        tag
      }));

      const { error: insertError } = await supabase
        .from('recording_tags')
        .insert(tagInserts);

      if (insertError) {
        console.error('Error inserting recording tags:', insertError);
        return false;
      }
    }
  }

  return true;
};

export const deleteRecording = async (id: string): Promise<boolean> => {
  // Delete the recording (tags will be deleted automatically due to ON DELETE CASCADE)
  const { error } = await supabase
    .from('recordings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting recording:', error);
    return false;
  }

  return true;
};

export const getFolders = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('recordings')
    .select('folder')
    .not('folder', 'is', null);

  if (error) {
    console.error('Error fetching folders:', error);
    return [];
  }

  // Get unique folder names
  return [...new Set(data.map(item => item.folder).filter(Boolean))];
};