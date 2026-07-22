const { Midi } = require("@tonejs/midi");
const midi = new Midi();
const track = midi.addTrack();
console.log("try midi number instead of name");
track.addNote({ midi: 60, time: 0, duration: 0.09 });
console.log("done with midi number");
