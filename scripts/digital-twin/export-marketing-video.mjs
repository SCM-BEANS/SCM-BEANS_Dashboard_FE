import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const outputDir = process.env.MARKETING_VIDEO_OUTPUT || "public/video";
const browser = await chromium.launch({ channel: "chrome", args: ["--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
await mkdir(".playwright-cli/marketing-video", { recursive: true });
await mkdir(outputDir, { recursive: true });

try {
  for (const mode of ["reveal", "reveal-mobile", "login"]) {
    const reveal = mode.startsWith("reveal");
    const page = await browser.newPage({ viewport: { width: mode === "reveal" ? 1280 : 720, height: mode === "reveal-mobile" ? 1280 : 720 }, deviceScaleFactor: 1 });
    page.on("console", (message) => { if (message.type() === "error") console.error(message.text()); });
    await page.route(`${baseURL}/__marketing_capture`, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><html></html>" }));
    await page.goto(`${baseURL}/__marketing_capture`);
    await page.setContent(`<html><head><base href="${baseURL}/"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}#journey-host,#login-host{width:100%;height:100%}.viewer-status{display:none}</style>
      <script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script></head>
      <body><div id="${reveal ? "journey-host" : "login-host"}"></div><div id="teaser-sheen"></div></body></html>`);
    console.log(`Loading ${mode} model…`);
    await page.evaluate(async (mode) => {
      const { createViewer } = await import("/landing/viewer.js");
      const data = await (await fetch("/landing/parts.json")).json();
      const brain = await (await fetch("/landing/brain.json")).json();
      const annotations = { sync() {}, render() {}, pickable() { return []; }, pick() {}, setMarkers() {} };
      const viewer = createViewer(annotations, data, brain, { includeBoards: false, capturePixelRatio: 2 });
      const hostName = mode.startsWith("reveal") ? "journey" : "login";
      viewer.registerHost(hostName, document.getElementById(`${hostName}-host`), { modelId: "body", autoRotate: false, zoom: false, lighting: "studio", view: { az: 35, el: 18 }, shellMode: "show", explode: 0, filmControlled: mode.startsWith("reveal") });
      const body = await viewer.load("body");
      window.captureViewer = viewer;
      window.captureBody = body;
      if (mode.startsWith("reveal")) {
        const { createTeaser } = await import("/landing/teaser.js");
        window.captureTeaser = createTeaser({ viewer });
        window.captureTeaser.ready(body);
      }
    }, mode);
    await page.waitForFunction((mode) => window.captureViewer.isActive(mode.startsWith("reveal") ? "journey" : "login"), mode, { timeout: 120000 });
    console.log(`Recording ${mode}…`);
    const download = page.waitForEvent("download");
    await page.evaluate(async (mode) => {
      const source = document.querySelector("canvas");
      const output = document.createElement("canvas");
      output.width = innerWidth * 1.5; output.height = innerHeight * 1.5;
      const context = output.getContext("2d");
      context.imageSmoothingQuality = "high";
      let frame;
      function draw() {
        context.fillStyle = mode.startsWith("reveal") ? "#f4f3f2" : "#ffffff";
        context.fillRect(0, 0, output.width, output.height);
        context.drawImage(source, 0, 0, output.width, output.height);
        window.captureViewer.requestRender();
        frame = requestAnimationFrame(draw);
      }
      const chunks = [];
      const recorder = new MediaRecorder(output.captureStream(30), { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 14000000 });
      const finished = new Promise((resolve) => { recorder.onstop = resolve; });
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      window.captureViewer.requestRender();
      draw(); recorder.start();
      if (mode.startsWith("reveal")) window.captureTeaser.enable();
      else {
        const shadow = window.captureBody.holder.getObjectByName("studio-soft-shadow");
        if (shadow) shadow.visible = false;
        window.captureViewer.setState("login", { autoRotate: true });
      }
      await new Promise((resolve) => setTimeout(resolve, mode.startsWith("reveal") ? 22000 : 10000));
      recorder.stop(); await finished; cancelAnimationFrame(frame);
      const link = document.createElement("a");
      link.download = mode + ".webm";
      link.href = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
      link.click();
    }, mode);
    const intermediate = `.playwright-cli/marketing-video/${mode}.webm`;
    const destination = `${outputDir}/dolores-machine-${mode}.mp4`;
    await (await download).saveAs(intermediate);
    const loop = mode === "login" ? ["-filter_complex", "[0:v]split[forward][reverse];[reverse]reverse[back];[forward][back]concat=n=2:v=1:a=0[out]", "-map", "[out]"] : [];
    execFileSync(ffmpeg, ["-y", "-i", intermediate, ...loop, "-an", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-movflags", "+faststart", destination], { stdio: "ignore" });
    execFileSync(ffmpeg, ["-y", "-ss", "1.5", "-i", destination, "-frames:v", "1", "-update", "1", `${outputDir}/dolores-machine-${mode}.jpg`], { stdio: "ignore" });
    console.log(`Saved ${destination}`);
    await page.close();
  }
} finally { await browser.close(); }
