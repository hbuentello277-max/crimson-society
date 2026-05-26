# Pixabay Audio Pipeline

Crimson Society uses Pixabay Music as the approved starter source for
royalty-free, commercial-use-safe tracks. Do not use copyrighted commercial
music, ripped social audio, Spotify, Apple Music, YouTube, TikTok, or Instagram
audio.

## Admin Intake

1. Find a track on https://pixabay.com/music/.
2. Confirm the page says it is free for use under the Pixabay Content License.
3. Download the MP3 from Pixabay.
4. Upload that file in Admin > Crimson Sounds.
5. Paste the original Pixabay Music track URL into Source URL.
6. Set the Pixabay contributor as Rights Owner.
7. Choose one Crimson category:
   hip hop, phonk, dark trap, cinematic, ambient night ride, aggressive street,
   emotional, vlog, or hype.
8. Approve only after the source URL and rights owner are verified.

## Storage

- `sound-originals`: private Supabase bucket for the original Pixabay download.
- `sound-renders`: public Supabase bucket for mobile playback.

The current upload path stores the same verified file as the first playback
render. A later worker should transcode private originals to AAC/M4A preview
clips and optimized stream files.

## Playback Rules

- Autoplay is off by default.
- Feed cards do not preload full audio.
- Picker/admin previews use `preload="none"` and start only on tap.
- Only one Crimson Sound plays globally at a time.

## Limits

- File types: MP3, M4A/AAC, WAV.
- Max file size: 50 MB.
- Max duration: 180 seconds.
