# 샘플 폴더

여기에 악기별 wav 샘플을 넣으면 됨 (예: `piano/C4.wav`, `piano/D4.wav`, `drum/kick.wav`...).

지금은 `src/hooks/useSequencer.ts`에서 기본 Tone.js 신스(PolySynth/MembraneSynth)로 소리를 내고 있음.
샘플이 준비되면 그 파일의 synth 생성 부분을 `Tone.Sampler`로 바꾸고 `baseUrl`을 이 폴더 경로로 지정하면 됨.
