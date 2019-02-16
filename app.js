const { map, times, zip } = _;

const buildRow = (width, height, x, y, zoom, rowNum) => {
  return Array.from(Array(width), (a, i) => {
    const px = i;
    const py = rowNum;

    return mapIntoViewPort(width, height, x, y, zoom, px, py, zoom);
  });
};

const rowRenderer = (width, height, ctx) => {
  const ctxRow = ctx.createImageData(width, 1);
  const ctxRowData = ctxRow.data;

  return (rowNum, rowColors) => {
    times(n => {
      const [r, g, b] = rowColors[n];
      ctxRowData[4 * n] = r;
      ctxRowData[4 * n + 1] = g;
      ctxRowData[4 * n + 2] = b;
      ctxRowData[4 * n + 3] = 255;
    })(width);

    ctx.putImageData(ctxRow, 0, rowNum);
  };
};

const mapIntoViewPort = (width, height, x, y, zoom, px, py) => {
  const cx = width / 2;
  const cy = height / 2;

  //distance relative to center
  const dcx = px - cx;
  const dcy = py - cy;

  return [x + dcx / zoom, y + dcy / zoom];
};

function setupCanvas(canvas) {
  if (window.devicePixelRatio > 1) {
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    canvas.width = canvasWidth * window.devicePixelRatio;
    canvas.height = canvasHeight * window.devicePixelRatio;
    canvas.style.width = canvasWidth + "px";
    canvas.style.height = canvasHeight + "px";
  }
}

function init() {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  // setupCanvas(canvas);

  // [-1.9854094356306298,-2.7554374072678024e-8,1759218604441600]
  // [-1.749952964600231,-0.0000038157805435901094,879609302220800]
  const start = [-1, 0, 100];
  // const start = [-1.966764262643953, -2.8361743888249697e-9, 13743895347200];
  let [x, y, zoom] = start;
  // let [x, y, zoom] = [-1.749984055589302, -6.907503122188151e-9, 3435973836800];
  // let [x, y, zoom] = [
  //   -1.749929615576111,
  //   -0.000007003152859400859,
  //   6871947673600
  // ];
  // let [x, y, zoom] = [-1.7499483108520508, -0.00000432968139648366, 419430400];
  // let [x, y, zoom] = [-1.7499482893943785, -0.00000437945127487111, 6710886400];

  // print
  // [-1.966764262643953,-2.8361743888249697e-9,13743895347200]

  // problem exporting
  // [-1.966764262643953,-2.8361743888249697e-9,13743895347200]
  let width = canvas.width;
  let height = canvas.height;
  // let x = ;
  // let y = 0;
  // let zoom = 100;
  let zoomMagnitude = 1;
  let rankTimeout = 4000;

  const workers = [
    new Worker("worker.js"),
    new Worker("worker.js"),
    new Worker("worker.js"),
    new Worker("worker.js"),
    new Worker("worker.js"),
    new Worker("worker.js"),
    new Worker("worker.js")
  ];
  let renderRow = rowRenderer(width, height, ctx);

  map(worker => {
    worker.addEventListener("message", event => {
      const { rowNum, rowData } = event.data;
      renderRow(rowNum, rowData);
    });
  })(workers);

  const postRowMessage = (rowNum, worker) => {
    const rowData = buildRow(width, height, x, y, zoom, rowNum);
    worker.postMessage({ rowNum, rowData, rankTimeout });
  };

  // const postRowMessageThunk = (rowNum, worker) => () =>
  //   postRowMessage(rowNum, worker);
  // const postRowMessageThunk = (...args) => () => postRowMessage(...args);

  const render = () => {
    console.log(JSON.stringify([x, y, zoom]));
    times(rowNum => {
      const worker = workers[rowNum % workers.length];
      postRowMessage(rowNum, worker);
    })(height);
  };

  const clear = () => {
    ctx.clearRect(0, 0, width, height);
  };

  render();
  // const link = document.getElementById("linkDownloadImage");
  // link.onclick = event => {
  //   link.href = canvas.toDataURL("image/jpeg", 0.7);
  //   link.download = `${new Date().getTime()}.jpeg`;
  // };

  canvas.onclick = event => {
    const px = event.offsetX;
    const py = event.offsetY;

    const [nx, ny] = mapIntoViewPort(width, height, x, y, zoom, px, py, zoom);

    x = nx;
    y = ny;

    if (zoomMagnitude > 0) {
      zoom *= 2;
    } else if (zoomMagnitude < 0) {
      zoom /= 2;
    }

    clear();
    render();
  };

  const resize = ([resazeWidth, resizeHeight]) => {
    canvas.width = resazeWidth;
    canvas.height = resizeHeight;

    // setupCanvas(canvas);

    width = canvas.width;
    height = canvas.height;

    renderRow = rowRenderer(width, height, ctx);
  };

  function generateImage() {
    var img = new Image();
    img.src = canvas.toDataURL("image/jpeg", 0.7);
    const output = document.querySelector("div.imageOutput");

    output.appendChild(document.createElement("br"));
    output.appendChild(img);
  }

  const sizes = [[320, 240], [800, 600], [5760, 3600]];
  let sizesIndex = 0;

  resize(sizes[sizesIndex]);
  clear();
  render();

  document.onkeypress = event => {
    const key = event.key;

    if (key === "+" && sizesIndex < sizes.length - 1) {
      sizesIndex = Math.min(sizes.length - 1, sizesIndex + 1);
      resize(sizes[sizesIndex]);
      clear();
      render();
    }

    if (key === "-" && sizesIndex > 0) {
      sizesIndex = Math.max(0, sizesIndex - 1);
      resize(sizes[sizesIndex]);
      clear();
      render();
    }

    if (key === "z") {
      zoomMagnitude = 1;
    }

    if (key === "Z") {
      zoomMagnitude = -1;
    }

    if (key === "c") {
      zoomMagnitude = 0;
    }

    if (key === "]") {
      rankTimeout += 100000;
      clear();
      render();
    }

    if (key === "[") {
      rankTimeout -= 100000;
      clear();
      render();
    }

    if (key === "1") {
      generateImage();
    }

    if (key === "d") {
      canvas.toBlob(blob => {
        const link = document.getElementById("linkDownloadImage");
        link.href = URL.createObjectURL(blob);
        const name = `${new Date().getTime()}.png`;
        link.download = name;
        link.innerHTML = name;
      });
    }

    console.log(event);
  };
}
