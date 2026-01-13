export default {
  tempoVote: {
    type: 'float',
    default: 80,
    min: 80,
    max: 400,
  },
  keyVote: {
    type: 'any',
    nullable: true,
    default: null,
  },
}
