import DrawingTool from "./DrawingTool";


/**
 * 
 * @param {*} imgdata 
 * @param {DrawingTool} drawingTool 
 * @param {*} convert_trans 
 */
export function image_quantize(imgdata, drawingTool, convert_trans = 127) {
  let pixelCount = drawingTool.pixelCount * 4;
  let pixels = [];
  for (let i = 0; i < pixelCount; i += 4) {
    if (imgdata.data[i + 3] < convert_trans) { // filter by transparency
      continue;
    }
    pixels.push({
      r: imgdata.data[i],
      g: imgdata.data[i + 1],
      b: imgdata.data[i + 2]
    });
  }
  const medianCut = pixels => {
    let l = Math.floor(pixels.length / 2);
    let r_min = null;
    let r_max = null;
    let g_min = null;
    let g_max = null;
    let b_min = null;
    let b_max = null;
    for (let i in pixels) {
      if (pixels[i].r < r_min || r_min === null) {
        r_min = pixels[i].r;
      }
      if (pixels[i].r > r_max || r_max === null) {
        r_max = pixels[i].r;
      }
      if (pixels[i].g < g_min || g_min === null) {
        g_min = pixels[i].g;
      }
      if (pixels[i].g > g_max || g_max === null) {
        g_max = pixels[i].g;
      }
      if (pixels[i].b < b_min || b_min === null) {
        b_min = pixels[i].b;
      }
      if (pixels[i].b > b_max || b_max === null) {
        b_max = pixels[i].b;
      }
    }
    let r_dist = r_max - r_min;
    let g_dist = g_max - g_min;
    let b_dist = b_max - b_min;
    if (r_dist >= g_dist && r_dist >= b_dist) {
      //Sort on red
      pixels.sort((a, b) => a.r - b.r);
    } else if (g_dist >= r_dist && g_dist >= b_dist) {
      //Sort on green
      pixels.sort((a, b) => a.g - b.g);
    } else {
      //Sort on blue
      pixels.sort((a, b) => a.b - b.b);
    }
    return [pixels.slice(0, l), pixels.slice(l)];
  };
  const medianMultiCut = buckets => {
    let res = [];
    for (let i in buckets) {
      const newBuck = medianCut(buckets[i]);
      if (newBuck[0].length) {
        res.push(newBuck[0]);
      }
      if (newBuck[1].length) {
        res.push(newBuck[1]);
      }
    }
    return res;
  };
  let buckets = medianCut(pixels); //creates 2 buckets
  buckets = medianMultiCut(buckets); //splits into 4
  buckets = medianMultiCut(buckets); //splits into 8
  buckets = medianMultiCut(buckets); //splits into 16

  //Now we have 16 buckets.
  let colors = [];
  let uniqCol = new Set();

  //Pushes average color of given bucket onto colors.
  const pushAvg = b => {
    let r_avg = 0;
    let g_avg = 0;
    let b_avg = 0;
    for (let i in b) {
      r_avg += b[i].r;
      g_avg += b[i].g;
      b_avg += b[i].b;
    }
    let rgb = [
      Math.round(r_avg / b.length),
      Math.round(g_avg / b.length),
      Math.round(b_avg / b.length)
    ];
    let idx = drawingTool.findRGB(rgb);
    if (!uniqCol.has(idx)) {
      colors.push(idx);
      uniqCol.add(idx);
    }
  };

  //Average the insides for colors.
  for (let i in buckets) {
    pushAvg(buckets[i]);
  }
  //console.info("Unique colors: " + uniqCol.size);

  if (uniqCol.size < 15) {
    //We could add more colors. Quantize some more and cross fingers!
    buckets = medianMultiCut(buckets); //splits into 32
    for (let i in buckets) {
      pushAvg(buckets[i]);
    }
    //console.info("Unique colors after further quantize: " + uniqCol.size);
    if (uniqCol.size < 15) {
      buckets = medianMultiCut(buckets); //splits into 64
      for (let i in buckets) {
        pushAvg(buckets[i]);
      }
      //console.info("Unique colors after further quantize: " + uniqCol.size);
      if (uniqCol.size < 15) {
        buckets = medianMultiCut(buckets); //splits into 128
        for (let i in buckets) {
          pushAvg(buckets[i]);
        }
        //console.info(
        //"Unique colors after further quantize: " + uniqCol.size
        //);
      }
    }
  } else if (uniqCol.size > 15) {
    //We have 16 colors (one for each bucket)
    //Find the closest two colors and merge them
    let minDist = 255 * 255 * 3;
    let bucketA = null;
    let bucketB = null;
    for (let i in colors) {
      for (let j in colors) {
        if (i >= j) {
          continue;
        }
        let rD = colors[i][0] - colors[j][0];
        let gD = colors[i][1] - colors[j][1];
        let bD = colors[i][2] - colors[j][2];
        let match = rD * rD + gD * gD + bD * bD;
        if (match < minDist) {
          minDist = match;
          bucketA = i;
          bucketB = j;
        }
      }
    }
    //Merge bucket A and B into C
    let bucketC = buckets[bucketA].concat(buckets[bucketB]);
    colors.splice(bucketB); //Must remove B first, since B is guaranteed to be the latter entry
    colors.splice(bucketA); //Now we can remove A too, since it was before B and thus couldn't have shifted
    pushAvg(bucketC);
    uniqcol = new Set(colors);
    //console.info(
    //"Unique colors after merge of closest two: " + uniqCol.size
    //);
  }

  //Set palette to chosen colors
  let cNum = 0;
  for (let c of uniqCol) {
    if (cNum > 14) {
      break;
    }
    //console.info("Setting color " + cNum + " to " + c);
    drawingTool.setPalette(cNum, c);
    cNum++;
  }

  //Set each pixel to the nearest color from the palette
  for (let i = 0; i < pixelCount; i += 4) {
    let x = (i >> 2) % drawingTool.width;
    let y = Math.floor((i >> 2) / drawingTool.width);
    if (imgdata.data[i + 3] < convert_trans) {
      drawingTool.setPixel(x, y, 15);
    } else {
      drawingTool.setPixel(x, y, [
        imgdata.data[i],
        imgdata.data[i + 1],
        imgdata.data[i + 2]
      ]);
    }
  }
  drawingTool.onLoad();
}
