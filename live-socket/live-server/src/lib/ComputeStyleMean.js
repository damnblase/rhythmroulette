export function computeStyleMean(data) {
  const styleVotes = data
    .filter(item => item !== null)
    // .map(item => item.name);

  const styleVotesCount = {};

  styleVotes.forEach((value) => {
    styleVotesCount[value] = (styleVotesCount[value] || 0) + 1;
  });

  let targetStyle;
  let targetValue = -Infinity;

  for (let name in styleVotesCount) {
    if (styleVotesCount[name] > targetValue) {
      targetStyle = name;
      targetValue = styleVotesCount[name];
    }
  }

  // -----------
  // ALTERNATIVE
  // -----------

  // const styles = Object.styles(styleVotesCount);
  // const values = Object.values(styleVotesCount);
  // const max = Math.max(...values);
  // const index = values.indexOf(max);
  // const targetstyle = styles[index];

  return targetStyle;
}
