import { EventEmitter } from "stream";
import {
  addListenerToAbortEmitter,
  emitAbortEmitter,
  removeListenerFromAbortEmitter,
} from "../src/abort";

jest.mock("stream");

const recastGlobal = global as { AbortController: any };

if (typeof recastGlobal.AbortController === "function") {
  delete recastGlobal.AbortController;
}

const emitter = new EventEmitter();

const listener = () => {
  /* stub */
};

describe("Abort utilities with EventEmitter", () => {
  describe("addListenerToAbortEmitter", () => {
    it("adds a listener to the AbortController", () => {
      addListenerToAbortEmitter(emitter, listener);
      expect(emitter.once).toHaveBeenCalledWith("abort", listener);
    });
  });

  describe("removeListenerFromAbortEmitter", () => {
    it("removes a listener from the AbortController", () => {
      removeListenerFromAbortEmitter(emitter, listener);
      expect(emitter.removeListener).toHaveBeenCalledWith("abort", listener);
    });
  });

  describe("emitAbortEmitter", () => {
    it("causes the AbortController to abort", () => {
      emitAbortEmitter(emitter);
      expect(emitter.emit).toHaveBeenCalledWith("abort");
    });
  });
});
