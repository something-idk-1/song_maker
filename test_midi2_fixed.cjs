const { Midi } = require("@tonejs/midi");

function midiToNoteName(midi) {
  const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

const drumLabels = [
  "Snare","Kick","block1","block2","conga1","conga2","HiHat",
  "장구1","장구2","징","좌고","꽹과리","꽹과리2","꽹과리3",
  ...Array.from({length:12}, (_,i)=>String(i+1)),
];
const uniqueLabels = Array.from(new Set(drumLabels));
const DRUM_TRIGGER_NOTE = {};
uniqueLabels.forEach((label, i) => { DRUM_TRIGGER_NOTE[label] = midiToNoteName(36+i); });
console.log("labels:", uniqueLabels.length, DRUM_TRIGGER_NOTE);

// simulate a decent-size grid: 8 melody notes, 3 drum rows, 64 steps, lots of active cells
const noteRows = ["C5","B4","A4","G4","F4","E4","D4","C4","Kick","Snare","HiHat"];
const bpm = 120;
const stepSec = (60/bpm)/4;

const activeCells = new Set();
for (let step = 0; step < 64; step++) {
  activeCells.add(`${step % 8}:${step}`); // melody notes
  if (step % 2 === 0) activeCells.add(`8:${step}`); // Kick
  if (step % 4 === 0) activeCells.add(`9:${step}`); // Snare
  activeCells.add(`10:${step}`); // HiHat every step
}
console.log("activeCells size:", activeCells.size);

console.log("start build");
const t0 = Date.now();
const midi = new Midi();
midi.header.setTempo(bpm);
const track = midi.addTrack();

function isDrumRowLabel(label) { return ["Kick","Snare","HiHat"].includes(label); }

activeCells.forEach((key) => {
  const [rowStr, stepStr] = key.split(":");
  const rowIndex = Number(rowStr);
  const stepIndex = Number(stepStr);
  const label = noteRows[rowIndex];
  if (!label) return;
  const noteName = isDrumRowLabel(label) ? (DRUM_TRIGGER_NOTE[label] ?? label) : label;
  track.addNote({ name: noteName, time: stepIndex * stepSec, duration: stepSec * 0.9 });
});
console.log("notes added:", track.notes.length, "time:", Date.now()-t0, "ms");

console.log("start toArray");
const t1 = Date.now();
const bytes = midi.toArray();
console.log("toArray done, bytes:", bytes.length, "time:", Date.now()-t1, "ms");
