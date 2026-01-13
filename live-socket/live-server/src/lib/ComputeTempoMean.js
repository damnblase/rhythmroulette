export function computeTempoMean(data) {
  let mean;
  // if dataset is empty, compute should return 0
  if (data.length === 0) {
    return mean = 0;
  }

  // MEAN //////
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }

  mean = sum / data.length;

  if (Number.isFinite(mean) && mean !== null) {
    return mean;
  }
}
