/* Kamera starten (nur nach Antippen), Rückkameras auflisten, Bildschirm wach halten. Klare deutsche Fehlermeldungen. */

let stream = null, wake = null, wakeWanted = false;

export const cameraStream = () => stream;

/** Rückkameras (für Auswahl Weitwinkel/Tele). Namen gibt es erst nach erlaubtem Zugriff. */
export async function listCameras() {
  try { return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'); } catch { return []; }
}

/** Kamera an. deviceId optional (sonst Rückkamera). → Video-Element (playsinline, muted, autoplay) */
export async function startCamera(deviceId = null) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Dieser Browser kann nicht auf die Kamera zugreifen. Bitte Safari (iOS) oder einen aktuellen Browser nutzen – die Seite muss über https geöffnet sein.');
  stopCamera();
  const video = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } };
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { ...video, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }, audio: false });
  } catch (e) {
    stream = null;
    if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') throw new Error('Kamera nicht erlaubt. iPhone/iPad: Einstellungen › Safari › Kamera › „Erlauben“ (oder in der Adressleiste auf „aA“ › Website-Einstellungen › Kamera). Dann die Seite neu laden.');
    if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') throw new Error('Keine passende Kamera gefunden.');
    if (e?.name === 'NotReadableError') throw new Error('Die Kamera wird gerade von einer anderen App benutzt.');
    throw new Error('Kamera konnte nicht gestartet werden.');
  }
  const v = document.createElement('video');
  v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.setAttribute('autoplay', '');
  v.playsInline = true; v.muted = true; v.autoplay = true; v.srcObject = stream;
  await v.play().catch(() => {});
  if (!v.videoWidth) await new Promise((ok) => v.addEventListener('loadedmetadata', ok, { once: true }));
  keepAwake(true);
  return v;
}

/** Weiteres Video-Element mit demselben Bild (z. B. groß in der Kalibrierung) */
export function mirrorVideo() {
  const v = document.createElement('video');
  v.setAttribute('playsinline', ''); v.muted = true; v.autoplay = true; v.playsInline = true; v.srcObject = stream;
  v.play().catch(() => {});
  return v;
}

export function stopCamera() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  keepAwake(false);
}

/* Screen Wake Lock: Display bleibt an; nach dem Zurückholen der App neu anfordern */
async function keepAwake(on) {
  wakeWanted = on;
  try {
    if (on && !wake && 'wakeLock' in navigator) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener?.('release', () => { wake = null; }); }
    if (!on && wake) { await wake.release(); wake = null; }
  } catch { wake = null; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && wakeWanted && !wake) keepAwake(true); });
