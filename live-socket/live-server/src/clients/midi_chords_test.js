import Max from 'max-api';

Max.addHandler("midiNoteFreq", (value) => {
  Max.post('received midi note', value)
  Max.outlet('array clear');
  // global.set('availableNotes', value)
});
