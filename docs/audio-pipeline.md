# Crimson Society Audio Pipeline

Crimson Sounds is intentionally internal-first: admins upload app-owned,
commissioned, or royalty-free audio, and riders can only attach approved tracks.
Do not import music from Spotify, Apple Music, YouTube, TikTok, Instagram, or
other consumer streaming catalogs.

## Storage

- `sound-originals`: private bucket for admin-uploaded masters.
- `sound-renders`: public bucket for mobile playback renders and cover images.

For now the admin upload stores the same verified file in both places. A future
worker should transcode from `sound-originals` into optimized playback renders.

## Limits

- Accepted formats: MP3, M4A/AAC, WAV.
- Max file size: 50 MB.
- Max duration: 180 seconds.
- Feed and picker playback is user initiated; no sound files are preloaded in
  the feed.

## Recommended Renders

- Primary mobile render: AAC in M4A, 128-192 kbps, 44.1 kHz stereo.
- Preview render: AAC in M4A, 96-128 kbps, trimmed to 15-30 seconds.
- Archive original: keep the uploaded master privately.

These settings are a good balance for iPhone playback, night footage edits, and
smooth feed scrolling.

## Copyright-Safe Intake

Before approval, every track needs:

- license type
- rights owner
- source or receipt URL
- verified source checkbox
- pending/approved moderation state

Approved tracks should only come from app-owned sessions, direct creator
licenses, CC0/public-domain sources with commercial reuse, or paid
royalty-free libraries with receipts retained.

## Future Worker

A production transcoder should:

- read private originals from `sound-originals`
- create AAC/M4A playback renders in `sound-renders`
- generate short preview clips
- write codec, bitrate, and waveform metadata to `audio_tracks`
- reject files that exceed duration/size/license rules
