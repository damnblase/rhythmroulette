export default {
  data: {
    type: 'any',
    default: {},
  },
  state: {
    type: 'enum',
    list: ['init', 'votes', 'synth', 'end'],
    default: 'init'
  },
  tempo: {
    type: 'float',
    default: 80,
  },
  key: {
    type: 'any',
    default: null,
    nullable: true,
  },
  style: {
    type: 'any',
    default: null,
    nullable: true,
  },
  availableNotes: {
    type: 'any',
    default: null,
    nullable: true,
  },
}
