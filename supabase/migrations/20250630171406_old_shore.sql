/*
# Create recordings tables

1. New Tables
  - `recordings`
    - `id` (uuid, primary key)
    - `title` (text)
    - `user_id` (uuid, foreign key to auth.users)
    - `url` (text)
    - `thumbnail` (text)
    - `duration` (float)
    - `size` (bigint)
    - `resolution` (text)
    - `format` (text)
    - `favorite` (boolean)
    - `folder` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  - `recording_tags`
    - `id` (uuid, primary key)
    - `recording_id` (uuid, foreign key to recordings)
    - `tag` (text)
    
2. Security
  - Enable RLS on `recordings` table
  - Add policy for authenticated users to access their own data
  - Enable RLS on `recording_tags` table
  - Add policy for authenticated users to access their own data
*/

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  url text NOT NULL,
  thumbnail text,
  duration float,
  size bigint,
  resolution text,
  format text,
  favorite boolean DEFAULT false,
  folder text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create recording tags table
CREATE TABLE IF NOT EXISTS recording_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid REFERENCES recordings ON DELETE CASCADE NOT NULL,
  tag text NOT NULL
);

-- Enable Row Level Security
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for recordings
CREATE POLICY "Users can view their own recordings"
  ON recordings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recordings"
  ON recordings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings"
  ON recordings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings"
  ON recordings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for recording_tags
CREATE POLICY "Users can view their recording tags"
  ON recording_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recordings
      WHERE recordings.id = recording_id
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their recording tags"
  ON recording_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recordings
      WHERE recordings.id = recording_id
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their recording tags"
  ON recording_tags
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recordings
      WHERE recordings.id = recording_id
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their recording tags"
  ON recording_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recordings
      WHERE recordings.id = recording_id
      AND recordings.user_id = auth.uid()
    )
  );

-- Create index for faster lookup
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recording_tags_recording_id ON recording_tags(recording_id);