# Opening title cards

`public/thumbs/<slug>.jpg` are the in-video title cards from Dereque Kelley's lessons
(the frame a few seconds in, after the studio logo). To regenerate:

```bash
pip install yt-dlp imageio-ffmpeg
# copy imageio-ffmpeg's binary to a folder as ffmpeg.exe and point grab.py's --ffmpeg-location at it
python scripts/title-cards-grab.py          # downloads the first 40s of each video + contact sheets
python scripts/title-cards-pick.py english=6.0 sicilian=5.0 ruy-lopez=4.5 italian=5.75 queens-gambit=6.5 \
  kings-indian=5.5 nimzo-indian=4.5 queens-indian=5.75 grunfeld=5.0 french=5.0 caro-kann=5.5 dutch=6.0 \
  pirc=5.5 alekhine=6.0 vienna=6.5 four-knights=6.5 kings-gambit=5.75 catalan=5.75 benoni=5.5 kia=5.5
```

Timestamps were chosen by eye from the contact sheets (the card text animates in over about a second).
