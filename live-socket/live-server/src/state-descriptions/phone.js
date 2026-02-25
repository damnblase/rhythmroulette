export default {
  tempoVote: {
    type: 'float',
    default: 80,
    min: 80,
    max: 160,
  },
  keyVote: {
    type: 'any',
    nullable: true,
    default: null,
  },
  styleVote: {
    type: 'any',
    nullable: true,
    default: null,
  },
}
