const detectionCallbacks = [];
let scannerStream = null;
let scannerAnimationId = null;
let barcodeDetector = null;
let zxingReader = null;
let audioContext = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureZXing() {
  if (typeof ZXing !== "undefined") return;
  await loadScript("https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js");
  await loadScript("https://unpkg.com/@zxing/browser@0.1.0/umd/index.min.js");
}

function beep() {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.2;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.12);
  } catch {
    // Web Audio indisponível (ex.: contexto bloqueado) - ignora o sinal sonoro
  }
}

function flash(frame) {
  requestAnimationFrame(() => {
    frame.classList.add("flash");
    setTimeout(() => frame.classList.remove("flash"), 250);
  });
}

function handleDetection(code, frame) {
  flash(frame);
  beep();
  stop();
  detectionCallbacks.forEach(callback => callback(code));
}

export function onDetected(callback) {
  detectionCallbacks.push(callback);
}

async function scanFrame(video, frame) {
  if (!scannerStream) return;
  try {
    const codes = await barcodeDetector.detect(video);
    if (codes[0]) {
      handleDetection(codes[0].rawValue, frame);
      return;
    }
  } catch {
    // frame ilegível neste instante - tenta novamente no próximo
  }
  scannerAnimationId = requestAnimationFrame(() => scanFrame(video, frame));
}

export async function start() {
  const video = document.querySelector("#barcodeVideo");
  const frame = document.querySelector("#scannerFrame");
  const status = document.querySelector("#scannerStatus");
  const stopButton = document.querySelector("#stopCameraButton");
  if (!video || !frame) return;

  if ("BarcodeDetector" in window) {
    try {
      barcodeDetector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a"] });
      scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = scannerStream;
      video.setAttribute("playsinline", "true");
      video.muted = true;
      await video.play();
      frame.classList.add("scanning");
      if (stopButton) stopButton.hidden = false;
      scanFrame(video, frame);
      return;
    } catch {
      if (status) status.textContent = "A tentar leitor alternativo...";
    }
  }

  try {
    await ensureZXing();
    video.setAttribute("playsinline", "true");
    video.muted = true;
    frame.classList.add("scanning");
    if (stopButton) stopButton.hidden = false;
    zxingReader = new ZXing.BrowserMultiFormatReader();
    await zxingReader.decodeFromVideoDevice(undefined, video, result => {
      if (result && result.getText()) handleDetection(result.getText(), frame);
    });
  } catch {
    if (status) status.textContent = "Câmara indisponível.";
  }
}

export async function stop() {
  cancelAnimationFrame(scannerAnimationId);
  try {
    if (zxingReader) {
      await zxingReader.reset();
      zxingReader = null;
    }
  } catch {
    // leitor já libertado - ignora
  }
  if (scannerStream) {
    scannerStream.getTracks().forEach(track => track.stop());
    scannerStream = null;
  }
  document.querySelector("#scannerFrame")?.classList.remove("scanning");
  const stopButton = document.querySelector("#stopCameraButton");
  if (stopButton) stopButton.hidden = true;
}

export function init() {
  document.querySelector("#startCameraButton")?.addEventListener("click", start);
  document.querySelector("#stopCameraButton")?.addEventListener("click", stop);
}
