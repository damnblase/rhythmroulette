export function computeKeyMean(data) {
  const keyVotes = data
    .filter(item => item !== null)
    .map(item => item.name);

  const keyVotesCount = {};

  keyVotes.forEach((value) => {
    keyVotesCount[value] = (keyVotesCount[value] || 0) + 1;
  });

  let targetKey;
  let targetValue = -Infinity;

  for (let name in keyVotesCount) {
    if (keyVotesCount[name] > targetValue) {
      targetKey = name;
      targetValue = keyVotesCount[name];
    }
  }

  // -----------
  // ALTERNATIVE
  // -----------

  // const keys = Object.keys(keyVotesCount);
  // const values = Object.values(keyVotesCount);
  // const max = Math.max(...values);
  // const index = values.indexOf(max);
  // const targetKey = keys[index];

  return targetKey;
}
