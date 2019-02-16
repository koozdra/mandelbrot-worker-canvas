self.importScripts(
  "https://cdn.jsdelivr.net/g/lodash@4(lodash.min.js+lodash.fp.min.js)"
);

const { map, flow } = _;

function mandelbrotRank(timeout, x, y) {
  let i = 0,
    zx = x,
    zy = y;

  while (zx * zx + zy * zy < 4 && i < timeout) {
    let tx = zx * zx - zy * zy + x,
      ty = 2 * zx * zy + y;

    if (tx === zx && ty === zy) {
      i = timeout - 1;
    }

    zx = tx;
    zy = ty;

    i += 1;
  }

  return i;
}

// const colors = [
//   [255, 0, 0],
//   [255, 102, 0],
//   [255, 255, 0],
//   [0, 255, 0],
//   [0, 0, 255],
//   [102, 0, 255]
// ];
const colors = [[0, 0, 0], [255, 255, 255]];
// const colors = [[0, 0, 0], [255, 255, 0], [255, 255, 255], [255, 0, 0]];
// const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255]];
const steps = 23;

function rangeAt(mag, a, b) {
  return a + (b - a) * mag;
}

const rank = rankTimeout => ([x, y]) => mandelbrotRank(rankTimeout, x, y);
const colorRangeAt = (mag, [sr, sg, sb], [tr, tg, tb]) => [
  rangeAt(mag, sr, tr),
  rangeAt(mag, sg, tg),
  rangeAt(mag, sb, tb)
];
const colorize = rankTimeout => rank => {
  if (rank < rankTimeout) {
    const div = Math.floor(rank / steps);
    const mod = rank % steps;
    const currentColor = colors[div % colors.length];
    const destColor = colors[(div + 1) % colors.length];

    return colorRangeAt(mod / steps, currentColor, destColor);
  } else {
    return [0, 0, 0];
  }
};

self.addEventListener("message", event => {
  const { rowData, rowNum, rankTimeout } = event.data;

  self.postMessage({
    rowData: map(
      flow(
        rank(rankTimeout),
        colorize(rankTimeout)
      )
    )(rowData),
    rowNum
  });
});
