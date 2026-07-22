import { Component, type ErrorInfo, type PropsWithChildren } from "react";
import { Center } from "@/shared/components/layout/Center";
import { ErrorState } from "@/shared/components/ErrorState";

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last line of defense for uncaught render errors. Without this, any
 * exception thrown during render (a null-pointer in a component, a bad
 * prop, etc.) unmounts the entire React tree and leaves a blank white
 * page — no message, no recovery, nothing to screenshot for a bug
 * report. That's a real gap for something meant to be demoed live.
 *
 * Per the debugging rule "never hide errors, always show error.name/
 * error.message": the fallback surfaces the actual exception rather
 * than a generic "Something went wrong," same principle already
 * applied to describeCameraError().
 */
export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[RockLink] Uncaught render error:", error.name, error.message, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Center className="px-4">
        <ErrorState
          variant="fullPanel"
          message={`${error.name}: ${error.message || "An unexpected error occurred."}`}
          actionLabel="Reload"
          onAction={() => window.location.reload()}
        />
      </Center>
    );
  }
}
