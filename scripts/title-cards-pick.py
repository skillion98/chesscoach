"""Pick the title-card frame of each clip: the shot between the two scene cuts after the logo.
Writes public/thumbs/<slug>.jpg (1280x720) and a review sheet of all picks."""
import os, re, subprocess, sys
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
OUT = r"C:\Users\steph\Claude\chesscoach\public\thumbs"
COURSES = r"C:\Users\steph\Claude\chesscoach\src\data\courses.ts"

# manual overrides: slug -> timestamp in seconds
OVERRIDE = {k: float(v) for k, v in (a.split('=') for a in sys.argv[1:])}

src = open(COURSES, encoding="utf-8").read()
slugs = [m[0] for m in re.findall(r"slug: '([a-z0-9-]+)'[\s\S]*?video: '([A-Za-z0-9_-]+)'", src)]

def scene_cuts(clip):
    r = subprocess.run([FFMPEG, "-i", clip, "-vf", "select='gt(scene,0.25)',showinfo", "-f", "null", "-"],
                       capture_output=True, text=True)
    return [float(t) for t in re.findall(r"pts_time:([0-9.]+)", r.stderr)]

picks = {}
for slug in slugs:
    clip = os.path.join(HERE, f"{slug}.mp4")
    if not os.path.exists(clip):
        print(slug, "no clip")
        continue
    if slug in OVERRIDE:
        t = OVERRIDE[slug]
    else:
        cuts = [c for c in scene_cuts(clip) if c > 2.0]
        # card starts at the first cut after the logo, ends at the next cut at least 1s later
        start = cuts[0] if cuts else 4.0
        end = next((c for c in cuts if c > start + 1.0), start + 3.0)
        t = max(start + 0.3, end - 0.25)
    picks[slug] = t
    out = os.path.join(OUT, f"{slug}.jpg")
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", clip, "-frames:v", "1",
                    "-vf", "scale=1280:720", "-q:v", "3", out], check=True)
    print(f"{slug:14s} t={t:.2f}s")

# review sheet of every pick
inputs = []
for slug in slugs:
    p = os.path.join(OUT, f"{slug}.jpg")
    if os.path.exists(p):
        inputs += ["-i", p]
n = len(inputs) // 2
cols = 4
rows = (n + cols - 1) // cols
filt = "".join(f"[{i}:v]scale=400:225[v{i}];" for i in range(n)) + "".join(f"[v{i}]" for i in range(n)) + f"xstack=inputs={n}:layout=" + "|".join(f"{(i % cols) * 400}_{(i // cols) * 225}" for i in range(n)) + "[out]"
if n % cols:
    # pad to a full grid so xstack has a rectangle
    pass
subprocess.run([FFMPEG, "-y", "-loglevel", "error", *inputs, "-filter_complex", filt, "-map", "[out]", os.path.join(HERE, "review.jpg")])
print("review sheet written")
