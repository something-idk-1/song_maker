import { Midi } from "@tonejs/midi";

function midiToNoteName(midi) {
  const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

// simulate ALL_DRUM_ROW_LABELS_ORDERED from BEAT_KITS row labels
const rowLabelsSets = [
  ["Snare","Kick"], ["block1","block2"], ["Snare","Kick"], ["conga1","conga2"],
  ["Kick","Snare","HiHat"],
  Array.from({length:12},(_,i)=>String(i+1)),
  Array.from({length:12},(_,i)=>String(i+1)),
  Array.from({length:10},(_,i)=>String(i+1)),
  ["장구1","장구2","징","좌고","꽹과리","꽹과리2","꽹과리3"],
];
const ALL = Array.from(new Set(rowLabelsSets.flat()));
const DRUM_TRIGGER_NOTE = {};
ALL.forEach((label,i)=>{ DRUM_TRIGGER_NOTE[label]=midiToNoteName(36+i); });
console.log("drum note map size", Object.keys(DRUM_TRIGGER_NOTE).length, DRUM_TRIGGER_NOTE);

const bpm = 96;
const stepSec = (60/bpm)/4;

const midi = new Midi();
midi.header.tempos = [{ bpm, ticks: 0 }];
const track = midi.addTrack();

// simulate a small simple-mode grid: melody rows C4.. + drum rows Snare/Kick
const noteRows = ["C5","B4","A4","G4","F4","E4","D4","C4","Snare","Kick"];
const activeCells = new Set(["0:0","7:2","8:1","9:3"]);

activeCells.forEach((key) => {
  const [rowStr, stepStr] = key.split(":");
  const rowIndex = Number(rowStr);
  const stepIndex = Number(stepStr);
  const label = noteRows[rowIndex];
  if (!label) return;
  const isDrum = ["Snare","Kick","HiHat"].includes(label) || label in DRUM_TRIGGER_NOTE && !/^[A-G]/.test(label);
  const noteName = (label === "Snare" || label === "Kick") ? (DRUM_TRIGGER_NOTE[label] ?? label) : label;
  console.log("adding note", noteName, stepIndex*stepSec);
  track.addNote({
    name: noteName,
    time: stepIndex * stepSec,
    duration: stepSec * 0.9,
  });
});

console.log("about to call toArray");
const bytes = midi.toArray();
console.log("done, bytes length", bytes.length);
