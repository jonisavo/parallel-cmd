import { EventEmitter } from "events";

export type AbortEventListener = (event: "abort") => void;

// Define interface missing from @types/node
export interface ExtendedAbortSignal extends AbortSignal {
  addEventListener: (
    type: "abort",
    listener: AbortEventListener,
    options: { once: boolean }
  ) => void;
  removeEventListener: (type: "abort", listener: AbortEventListener) => void;
}

export interface AbortEventEmitter extends EventEmitter {
  emit: (type: "abort") => boolean;
  addListener: (type: "abort", listener: AbortEventListener) => this;
  removeListener: (type: "abort", listener: AbortEventListener) => this;
}

export type AbortEmitter = AbortEventEmitter | AbortController;

function isAbortEmitterAbortController(
  emitter: AbortEmitter
): emitter is AbortController {
  return typeof AbortController === "function" && emitter instanceof AbortController;
}

export function addListenerToAbortEmitter(
  emitter: AbortEmitter,
  listener: AbortEventListener
): void {
  if (isAbortEmitterAbortController(emitter)) {
    const signal = emitter.signal as unknown as ExtendedAbortSignal;
    signal.addEventListener("abort", listener, { once: true });
  } else {
    emitter.once("abort", listener);
  }
}

export function removeListenerFromAbortEmitter(
  emitter: AbortEmitter,
  listener: AbortEventListener
): void {
  if (isAbortEmitterAbortController(emitter)) {
    const signal = emitter.signal as unknown as ExtendedAbortSignal;
    signal.removeEventListener("abort", listener);
  } else {
    emitter.removeListener("abort", listener);
  }
}

export function emitAbortEmitter(emitter: AbortEmitter): void {
  if (isAbortEmitterAbortController(emitter)) {
    emitter.abort();
  } else {
    emitter.emit("abort");
  }
}
