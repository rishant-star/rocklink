import { Hands, type Results } from "@mediapipe/hands";

/**
 * Self-hosted model assets (Blueprint Section 7): locateFile points at
 * /models/ rather than a CDN, so match-time doesn't depend on a
 * third-party network request. The actual .wasm/.tflite/.binarypb
 * files must be present in apps/client/public/models/ — see the
 * README in that directory for exactly what to copy there.
 */
export function createHandsClient(onResults: (results: Results) => void): Hands {
  const hands = new Hands({
    locateFile: (file) => `/models/${file}`,
  });

  hands.setOptions({
    maxNumHands: 1, // Rock/Paper/Scissors only ever needs one hand per player
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
  });

  hands.onResults(onResults);

  return hands;
}
