const { Midi } = require("@tonejs/midi");
const midi = new Midi();
midi.header.setTempo(120);
const track = midi.addTrack();
console.log("adding note...");
track.addNote({ name: "C4", time: 0, duration: 0.09 });
console.log("added! notes:", track.notes.length);
