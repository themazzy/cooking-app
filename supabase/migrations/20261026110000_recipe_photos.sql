-- Recipe photos go to the same private bucket as videos, under
-- <household id>/<recipe id>-<version>.webp (same member-only policies)
update storage.buckets
  set allowed_mime_types = array['video/webm', 'video/mp4', 'image/webp', 'image/jpeg']
  where id = 'recipe-videos';
