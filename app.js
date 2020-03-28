import DrawingTool from "./lib/DrawingTool.js";
import { createCanvas, Image } from "canvas";
import fs from "fs";
import { image_quantize } from "./lib/utils"
import QrGenerator from "./lib/ACNLQRGenerator";
import os from "os";
let dt = new DrawingTool();

const targv = require('yargs').usage('$0 <input>').argv

const argv = require('yargs').usage('$0 <input>', "the file to convert. should be square.")
  .command('output', "the file to output. defaults to out.png", {
    title: {
      desciption: "the file to output. defaults to out.png",
      alias: 'o',
      type: 'string'
    }
  })
  .command('title', "the title of the generated Pattern. defaults 'Empty'", {
    title: {
      desciption: "the title of the generated Pattern. defaults 'Empty'",
      alias: 't',
      type: 'string'
    }
  }).default('title', 'Empty')
  .command('creator', "the creator of the generated Pattern. defaults to your username", {
    title: {
      desciption: "the creator of the generated Pattern. defaults to your username",
      alias: 'c',
      type: 'string'
    }
  }).default('creator', os.userInfo().username)
  .command('town', "the town of the generated Pattern. defaults to your computer's hostname.", {
    title: {
      desciption: "the town of the generated Pattern. defaults to your computer's hostname.",
      alias: 'T',
      type: 'string'
    }
  }).default('town', os.hostname())
  .boolean("scale")
  .default('output', 'out.png').argv


const canvas = createCanvas(32, 32);
const ctx = canvas.getContext('2d');

let buffer;
try {

  buffer = fs.readFileSync(`./${argv.input}`)
} catch (error) {
  console.log(`could not find ${argv.input}`)
  process.exit();
}

let img = new Image();
if (argv.scale) {
  img.onload = () => ctx.drawImage(img, 0, 0, 32, 32);
} else {
  img.onload = () => ctx.drawImage(img, 0, 0);
}
img.onerror = (err) => console.error(err)
img.src = buffer;


image_quantize(ctx.getImageData(0, 0, 32, 32), dt);

dt.title = argv.title;
dt.creator = argv.creator;
dt.town = argv.town;

QrGenerator(dt).then(data => fs.writeFileSync(argv.output, data));