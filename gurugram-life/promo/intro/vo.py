import sherpa_onnx, wave, numpy as np, subprocess, sys
M='/tmp/claude-0/-home-user-python/93a9db14-3a8f-54ce-881e-11b23da58715/scratchpad/tts/models/kokoro-multi-lang-v1_0/'
tts=sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(model=M+'model.onnx',voices=M+'voices.bin',tokens=M+'tokens.txt',data_dir=M+'espeak-ng-data',dict_dir=M+'dict',lexicon=M+'lexicon-us-en.txt,lexicon-zh.txt',lang='hi'),num_threads=4)))
LINES=[('1','राजीव चौक। जेब में पाँच सौ रुपये।'),('2','रात फ़ुटपाथ पे… आँखों में सपने।'),('3','अपना आलीशान घर।'),('4','लंबी गाड़ी।'),('5','जीवनसाथी।'),('6','पैसा। ज़ेवर। इज़्ज़त।'),('7','सपनों का शहर। फ़ुटपाथ से फ़ार्महाउस तक।')]
sid=int(sys.argv[1]) if len(sys.argv)>1 else 34
for k,t in LINES:
    a=tts.generate(t,sid=sid,speed=1.0); s=(np.clip(np.asarray(a.samples),-1,1)*32767).astype(np.int16)
    w=wave.open(f'vo{k}.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(a.sample_rate); w.writeframes(s.tobytes()); w.close()
    print(k, round(len(s)/a.sample_rate,2))
