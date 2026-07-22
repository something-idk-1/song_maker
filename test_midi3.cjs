const { Midi } = require("@tonejs/midi");
const midi = new Midi();
midi.header.tempos = [{ bpm: 120, ticks: 0 }];
const track = midi.addTrack();
console.log("adding notes one by one...");
for (let i = 0; i < 20; i++) {
  console.log("adding note", i);
  track.addNote({ name: "C4", time: i * 0.1, duration: 0.09 });
  console.log("added note", i);
}
console.log("done");
