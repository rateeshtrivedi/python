#!/bin/bash
# Compose a day's deliverables: DAY=2026-10-17 N=1 ./make.sh   (needs days/$DAY/video.mp4 from cap.cjs)
set -e; cd "$(dirname "$0")/days/$DAY"; K=..; OUT=out; mkdir -p $OUT
python3 ../../mix.py $DAY
[ -f bg.jpg ] || ffmpeg -loglevel error -y -ss 0.9 -i video.mp4 -frames:v 1 -q:v 2 bg.jpg   # prefer the clean frame from THUMB=
DAY=$DAY node ../../cards.cjs
ET=$(python3 -c "import json;print(json.load(open('sound.json')).get('end',4.0))"); F=$(python3 -c "print(int($ET*30))")
ffmpeg -loglevel error -y -loop 1 -t $ET -framerate 30 -i end.png -vf "format=yuv420p,scale=1080:1920,zoompan=z='1+0.0008*on':d=$F:s=1080x1920:fps=30" -frames:v $F -c:v libx264 -preset medium -crf 16 end.mp4
for A in music sfx; do
  ffmpeg -loglevel error -y -i video.mp4 -i end.mp4 -i audio_$A.wav -filter_complex "[0:v]setsar=1[a];[1:v]setsar=1[b];[a][b]concat=n=2:v=1:a=0,format=yuv420p[v]" -map "[v]" -map 2:a -c:v libx264 -preset slow -crf 20 -profile:v high -c:a aac -b:a 160k -ar 44100 -movflags +faststart -shortest final_$A.mp4
done
P=gurugram-day$N; cp final_music.mp4 $OUT/$P-REEL.mp4; cp final_sfx.mp4 $OUT/$P-REEL-nomusic.mp4; cp final_music.mp4 $OUT/$P-SHORT.mp4; cp final_sfx.mp4 $OUT/$P-SHORT-nomusic.mp4
for V in REEL SHORT; do ffmpeg -loglevel error -y -i final_sfx.mp4 -f lavfi -i anullsrc=r=44100:cl=mono -map 0:v -map 1:a -c:v copy -c:a aac -b:a 64k -shortest $OUT/$P-$V-silent.mp4; done   # the user adds the song in the app
cp thumb.png $OUT/$P-thumbnail-9x16.png; [ -f thumb_wide.png ] && cp thumb_wide.png $OUT/$P-thumbnail-16x9.png
cp youtube.txt $OUT/$P-youtube.txt; cp instagram.txt $OUT/$P-instagram.txt
ffmpeg -loglevel error -y -i final_music.mp4 -vf "fps=1/2.6,scale=216:384,tile=9x1" -frames:v 1 sheet_final.jpg; ls -la $OUT
