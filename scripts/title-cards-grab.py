"""Download the first 40s of each opening video and build a contact sheet of frames every 2s."""
import os, re, subprocess, sys
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
COURSES = r"C:\Users\steph\Claude\chesscoach\src\data\courses.ts"

src = open(COURSES, encoding="utf-8").read()
videos = re.findall(r"slug: '([a-z0-9-]+)'[\s\S]*?video: '([A-Za-z0-9_-]+)'", src)
print(len(videos), "videos")

only = sys.argv[1:]  # optional slugs
for slug, vid in videos:
    if only and slug not in only:
        continue
    clip = os.path.join(HERE, f"{slug}.mp4")
    if not os.path.exists(clip):
        cmd = [
            sys.executable, "-m", "yt_dlp", "--quiet", "--no-warnings",
            "--ffmpeg-location", os.path.join(HERE, "bin"),
            "-f", "bestvideo[height<=720][ext=mp4]/bestvideo[height<=720]/best[height<=720]",
            "--download-sections", "*0-40", "--force-keyframes-at-cuts",
            "-o", clip, f"https://www.youtube.com/watch?v={vid}",
        ]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0 or not os.path.exists(clip):
            print(slug, "download failed:", r.stderr[-300:])
            continue
    sheet = os.path.join(HERE, f"{slug}-sheet.jpg")
    # one frame every 2s, 5 columns, small tiles, timestamp burned in
    vf = "fps=1/2,drawtext=text='%{pts\\:hms}':x=8:y=8:fontsize=28:fontcolor=yellow:box=1:boxcolor=black@0.6,scale=320:-1,tile=5x4"
    r = subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", clip, "-vf", vf, "-frames:v", "1", sheet], capture_output=True, text=True)
    if r.returncode != 0:
        # drawtext may be unavailable in this build; fall back without labels
        vf = "fps=1/2,scale=320:-1,tile=5x4"
        r = subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", clip, "-vf", vf, "-frames:v", "1", sheet], capture_output=True, text=True)
    print(slug, "ok" if r.returncode == 0 else "sheet failed: " + r.stderr[-200:])
