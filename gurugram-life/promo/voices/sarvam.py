# Human-sounding voices for every spoken line in the game, from Sarvam AI's Bulbul text-to-speech (Indian Hindi/English voices).
# Replaces the clips under the same names, so the game needs no other change:
#   NPC and fight lines  -> public/audio/v/<key>_<m|f>.mp3   (npc_lines.tsv; the roman text is how the game looks a line up)
#   radio RJ, ads, vendors -> public/audio/<key>.mp3         (radio_lines.json; jingles/dings added as before)
#   intro film narrator    -> promo/intro/vo<N>.wav, then score.py remixes public/audio/intro/intro.mp3
# usage: SARVAM_API_KEY=... python3 promo/voices/sarvam.py [npc|radio|intro|all] [--only key1,key2] [--probe]
import os, sys, json, base64, wave, subprocess, urllib.request, urllib.error, random, time
HERE = os.path.dirname(os.path.abspath(__file__)); GAME = os.path.dirname(os.path.dirname(HERE)); WORK = os.path.join(HERE, 'work')
KEY = os.environ.get('SARVAM_API_KEY')  # in Claude cloud sessions the network proxy adds the key for api.sarvam.ai, so this can be empty
MODEL = os.environ.get('SARVAM_MODEL', 'bulbul:v3')
URL = 'https://api.sarvam.ai/text-to-speech'
# Bulbul speakers: men for the chhore, drivers, elders, cops and the RJ; women for the female lines. Tough lines get the deeper voices.
ALL_MEN = 'aditya,ashutosh,rahul,rohan,amit,dev,ratan,varun,manan,sumit,kabir,aayan,shubh,advait,anand,tarun,sunny,mani,gokul,vijay,mohit,rehan,soham'.split(',')
ALL_WOMEN = 'ritu,priya,neha,pooja,simran,kavya,ishita,shreya,roopa,tanya,shruti,suhani,kavitha,rupali'.split(',')
# picked by measured pitch and liveliness: deep and expressive for the rowdy lines, mid for everyone else, the liveliest for the RJ
ROWDY = os.environ.get('SARVAM_ROWDY', 'kabir,soham,rehan').split(',')
MEN = os.environ.get('SARVAM_MEN', 'anand,amit,ratan').split(',')
WOMEN = os.environ.get('SARVAM_WOMEN', 'priya,roopa,simran').split(',')
RJ = os.environ.get('SARVAM_RJ', 'aditya')
NARRATOR = os.environ.get('SARVAM_NARRATOR', 'anand')
TOUGH = ('ang', 'hit', 'agg', 'give', 'run', 'ko', 'jack', 'peh', 'ch', 'bad', 'don', 'r9', 'r10', 'mo', 'ja', 'ro', 'cs')

def tts(text, speaker, lang='hi-IN', pace=1.0):
    body = {'text': text, 'target_language_code': lang, 'speaker': speaker, 'model': MODEL, 'pace': pace, 'speech_sample_rate': 24000}
    for attempt in range(9):
        if attempt: time.sleep(min(60, 3 * 2 ** attempt))  # rate limits: back off up to a minute
        hd = {'Content-Type': 'application/json'}
        if KEY: hd['api-subscription-key'] = KEY
        req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers=hd)
        try:
            with urllib.request.urlopen(req, timeout=60) as r: d = json.loads(r.read())
            return b''.join(base64.b64decode(a) for a in d['audios'])
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')
            if e.code == 429 or e.code >= 500: print('  Sarvam', e.code, '- waiting'); continue
            sys.exit(f'Sarvam said {e.code}: {msg[:600]}')
    sys.exit('Sarvam kept failing; try again later.')

DONE = os.path.join(WORK, 'done.txt')  # clips made in an earlier run that stopped part-way, so a re-run resumes
def done(out): return os.path.exists(DONE) and out in open(DONE).read().split('\n')
def mark(out): open(DONE, 'a').write(out + '\n')
def save_mp3(wav_bytes, out, radio=False, pre=None):
    os.makedirs(WORK, exist_ok=True); w = os.path.join(WORK, 'tmp.wav'); open(w, 'wb').write(wav_bytes)
    fx = ('highpass=f=140,lowpass=f=6500,acompressor=threshold=-20dB:ratio=4:attack=5:release=120,loudnorm=I=-16:TP=-1.5' if radio
          else 'highpass=f=90,acompressor=threshold=-18dB:ratio=3,loudnorm=I=-15:TP=-1.5,apad=pad_dur=0.1')
    if pre: cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', pre, '-i', w, '-filter_complex', f'[0][1]concat=n=2:v=0:a=1,{fx}', '-ac', '1', '-ar', '22050', '-b:a', '48k', out]
    else: cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', w, '-af', fx, '-ac', '1', '-ar', '22050', '-b:a', '32k' if not radio else '48k', out]
    subprocess.run(cmd, check=True)

def pick(lst, key): return lst[sum(map(ord, key)) % len(lst)]  # same speaker for a key every run

def npc(only):
    n = 0
    for line in open(os.path.join(HERE, 'npc_lines.tsv'), encoding='utf8'):
        if line.startswith('#') or not line.strip(): continue
        k, who, roman, dev = line.rstrip('\n').split('\t')
        if only and k not in only: continue
        for g in who:
            spk = (pick(ROWDY, k) if k.startswith(TOUGH) else pick(MEN, k)) if g == 'm' else pick(WOMEN, k)
            pace = 1.12 if k.startswith(('hit', 'ko', 'agg', 'jack', 'run')) else 1.0
            out = os.path.join(GAME, 'public/audio/v', f'{k}_{g}.mp3')
            if done(out): continue
            save_mp3(tts(dev, spk, pace=pace), out); mark(out); n += 1; print(k, g, spk, roman)
    print(n, 'NPC clips')

def radio(only):
    L = json.load(open(os.path.join(HERE, 'radio_lines.json'), encoding='utf8')); jingle = os.path.join(WORK, 'jingle.wav'); ding = os.path.join(WORK, 'ding.wav')
    if not os.path.exists(jingle):  # the same two-note idents as before
        import numpy as np
        def tone(f, d, a=0.3):
            t = np.arange(int(24000 * d)) / 24000; return a * np.exp(-t * 5) * np.minimum(1, t * 200) * (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t))
        def seq(ns, gap):
            out = np.zeros(int(24000 * (gap * len(ns) + 1.2)))
            for i, f in enumerate(ns): s = tone(f, 1.1); o = int(i * gap * 24000); out[o:o + len(s)] += s
            return out
        for p, a in ((jingle, seq([523.25, 659.25, 783.99, 1046.5], 0.11)), (ding, seq([880, 1318.5], 0.09) * 0.8)):
            os.makedirs(WORK, exist_ok=True); f = wave.open(p, 'wb'); f.setnchannels(1); f.setsampwidth(2); f.setframerate(24000); f.writeframes((np.clip(a, -1, 1) * 32767).astype('int16').tobytes()); f.close()
    for k, v in L.items():
        if only and k not in only: continue
        en = v['lang'] == 'en'; spk = RJ if k.startswith('rj') or en else (pick(WOMEN, k) if v.get('sid') in (3, 31, 32) else pick(MEN, k))
        is_radio = not k.startswith('v_'); pre = jingle if ('_id' in k or k.startswith('rj_')) else (ding if '_ad' in k or k.startswith('ad_') else None)
        out = os.path.join(GAME, 'public/audio', f'{k}.mp3')
        if done(out): continue
        save_mp3(tts(v['text'], spk, 'en-IN' if en else 'hi-IN', pace=1.05), out, radio=is_radio, pre=pre); mark(out); print(k, spk)

def intro(only):
    sys.path.insert(0, os.path.join(GAME, 'promo/intro'))
    lines = [('1', 'राजीव चौक। जेब में पाँच सौ रुपये।'), ('2', 'रात फ़ुटपाथ पे… आँखों में सपने।'), ('3', 'अपना आलीशान घर।'), ('4', 'लंबी गाड़ी।'), ('5', 'जीवनसाथी।'), ('6', 'पैसा। ज़ेवर। इज़्ज़त।'), ('7', 'सपनों का शहर। फ़ुटपाथ से फ़ार्महाउस तक।')]
    d = os.path.join(GAME, 'promo/intro')
    for k, t in lines:
        open(os.path.join(d, f'vo{k}.wav'), 'wb').write(tts(t, NARRATOR, pace=0.95)); print('intro', k)
    subprocess.run(['python3', 'score.py'], cwd=d, check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(d, 'intro.wav'), '-af', 'highpass=f=40,loudnorm=I=-15:TP=-1.5', '-ac', '1', '-ar', '44100', '-b:a', '64k', os.path.join(GAME, 'public/audio/intro/intro.mp3')], check=True)

if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'all'
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    if '--probe' in sys.argv:  # one test line per speaker, to hear them before regenerating everything
        os.makedirs(os.path.join(WORK, 'probe'), exist_ok=True)
        for s in ALL_MEN: save_mp3(tts(f'मैं {s}. ओए! मेरे ते हाथ उठाया? बिना बात के? आजा फिर!', s), os.path.join(WORK, 'probe', f'm_{s}.mp3')); print('probe', s)
        for s in ALL_WOMEN: save_mp3(tts(f'मैं {s}. आ गए? खाना लग गया है! चाय बना दूँ?', s), os.path.join(WORK, 'probe', f'f_{s}.mp3')); print('probe', s)
        sys.exit()
    if what in ('npc', 'all'): npc(only)
    if what in ('radio', 'all'): radio(only)
    if what in ('intro', 'all'): intro(only)
