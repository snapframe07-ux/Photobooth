/**
 * Camera Module (SnapFrame)
 * Handles webcam stream initialization, live preview, camera switching, error handling, and countdown timer.
 */

let currentStream = null;
let currentFacingMode = 'user'; // 'user' (front) or 'environment' (back)
let countdownInterval = null;

/**
 * Formats user-friendly error messages in Thai for camera permission / hardware errors.
 * @param {Error} error 
 * @returns {string}
 */
function getErrorMessage(error) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return 'เบราว์เซอร์ของคุณไม่รองรับการใช้งานกล้องถ่ายรูป';
  }

  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'ไม่ได้รับสิทธิ์การใช้งานกล้อง กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์ของคุณ';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'ไม่พบอุปกรณ์กล้องบนอุปกรณ์นี้';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'ไม่สามารถเข้าถึงกล้องได้ กล้องอาจถูกใช้งานโดยแอปพลิเคชันอื่นอยู่ในขณะนี้';
    case 'OverconstrainedError':
      return 'กล้องไม่รองรับคุณสมบัติที่คำขอระบุ';
    case 'SecurityError':
      return 'ระบบความปลอดภัยของเบราว์เซอร์ไม่อนุญาตให้ใช้งานกล้อง (โปรดใช้ HTTPS หรือ localhost)';
    default:
      return `เกิดข้อผิดพลาดในการเปิดใช้งานกล้อง: ${error.message || error.name}`;
  }
}

/**
 * Initializes and starts the camera stream on a <video> element.
 * @param {HTMLVideoElement} videoElement - The target video element to render stream
 * @param {Object} [options={}] - Configuration options (facingMode, width, height)
 * @returns {Promise<MediaStream>}
 */
export async function initCamera(videoElement, options = {}) {
  if (!videoElement || !(videoElement instanceof HTMLVideoElement)) {
    throw new Error('กรุณาระบุ <video> element ที่ถูกต้องสำหรับแสดงผลกล้อง');
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('เบราว์เซอร์ของคุณไม่รองรับการใช้งานกล้องถ่ายรูป');
  }

  // Stop any existing active stream before starting a new one
  stopCamera();

  const facingMode = options.facingMode || currentFacingMode;

  const constraints = {
    video: {
      facingMode: facingMode,
      width: options.width ? { ideal: options.width } : { ideal: 1280 },
      height: options.height ? { ideal: options.height } : { ideal: 720 }
    },
    audio: false
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentStream = stream;
    currentFacingMode = facingMode;

    videoElement.srcObject = stream;
    videoElement.setAttribute('playsinline', 'true'); // Required for iOS Safari compatibility
    await videoElement.play();

    return stream;
  } catch (error) {
    const friendlyMessage = getErrorMessage(error);
    console.error('Camera Init Error:', error);
    throw new Error(friendlyMessage);
  }
}

/**
 * Stops the active camera stream and releases media tracks.
 */
export function stopCamera() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  if (currentStream) {
    currentStream.getTracks().forEach((track) => {
      track.stop();
    });
    currentStream = null;
  }
}

/**
 * Switches between front ('user') and back ('environment') camera on mobile/supported devices.
 * @param {HTMLVideoElement} videoElement - The target video element
 * @returns {Promise<MediaStream>}
 */
export async function switchCamera(videoElement) {
  const nextFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
  return await initCamera(videoElement, { facingMode: nextFacingMode });
}

/**
 * Starts a countdown timer (e.g., 3-2-1) before photo capture.
 * @param {number} [seconds=3] - Number of seconds to count down
 * @param {function(number): void} [onTick] - Callback invoked every second with remaining time
 * @param {function(): void} [onComplete] - Callback invoked when countdown finishes
 */
export function startCountdown(seconds = 3, onTick = () => {}, onComplete = () => {}) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  let remaining = Math.max(1, parseInt(seconds, 10) || 3);

  // Initial tick for starting second
  if (typeof onTick === 'function') {
    onTick(remaining);
  }

  countdownInterval = setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      if (typeof onTick === 'function') {
        onTick(remaining);
      }
    } else {
      clearInterval(countdownInterval);
      countdownInterval = null;
      if (typeof onTick === 'function') {
        onTick(0);
      }
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }
  }, 1000);
}

/**
 * Returns the active MediaStream instance if available.
 * @returns {MediaStream|null}
 */
export function getCurrentStream() {
  return currentStream;
}

/**
 * Returns current facingMode ('user' or 'environment').
 * @returns {string}
 */
export function getFacingMode() {
  return currentFacingMode;
}
