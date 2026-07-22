/**
 * Maps getUserMedia's DOMException names to plain-language copy for
 * ErrorState, per Design-System.md's rule: state what happened and what
 * to do next, never a raw exception message.
 */
/**
 * Maps getUserMedia's DOMException names to plain-language copy for
 * ErrorState, per Design-System.md's rule: state what happened and what
 * to do next, never a raw exception message.
 *
 * Every branch still ends with the actual error name (and, for
 * unrecognized DOMExceptions or non-DOMException errors, the message
 * too) appended in parentheses. The original all-purpose fallback gave
 * no way to tell a permission denial apart from a missing-camera,
 * insecure-context, or truly unexpected error — this keeps the
 * friendly copy but makes the real cause visible for diagnosis.
 */
export function describeCameraError(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Camera access is off. Turn it on in your browser's site settings to continue.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "No camera was found on this device. Connect a camera and try again.";
      case "NotReadableError":
      case "TrackStartError":
        return "Your camera is already in use by another app. Close it there and try again.";
      case "OverconstrainedError":
      case "ConstraintNotSatisfiedError":
        return "Your camera doesn't support the requested video settings.";
      case "SecurityError":
        return "Camera access is blocked on this page — it may need to be opened over HTTPS, or the embedding frame needs camera permission enabled.";
      case "AbortError":
        return "Camera access was interrupted before it finished starting. Please try again.";
      default:
        return `Something went wrong accessing your camera (${error.name}). Please try again.`;
    }
  }

  if (error instanceof TypeError) {
    // Thrown when navigator.mediaDevices / getUserMedia doesn't exist at
    // all — typically an insecure context (non-HTTPS/non-localhost) or a
    // sandboxed iframe without camera permission delegated. This never
    // reaches the DOMException branch above because it isn't one.
    return "Your browser blocked camera access on this page (TypeError: camera API unavailable). This usually means the page isn't served over HTTPS, or an embedding frame hasn't allowed camera access.";
  }

  if (error instanceof Error) {
    return `Something went wrong accessing your camera (${error.name}: ${error.message}). Please try again.`;
  }

  return "Something went wrong accessing your camera. Please try again.";
}
