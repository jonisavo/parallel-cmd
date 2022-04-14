import { EventEmitter } from "stream";
import {
  AbortEventListener,
  addListenerToAbortEmitter,
  emitAbortEmitter,
  removeListenerFromAbortEmitter,
} from "../src/abort";

class MockAbortSignal {
  addEventListener(
    _type: "abort",
    _listener: AbortEventListener,
    _options: { once: boolean }
  ): void {
    /* stub */
  }
  removeEventListener(_type: "abort", _listener: AbortEventListener): void {
    /* stub */
  }
}

class MockAbortController extends EventEmitter {
  signal: MockAbortSignal;

  constructor() {
    super();
    this.signal = new MockAbortSignal();
  }

  abort() {
    /* stub */
  }
}

const recastGlobal = global as { AbortController: any };

recastGlobal.AbortController = MockAbortController;

const ac = new recastGlobal.AbortController();

const listener = () => {
  /* stub */
};

afterAll(() => {
  jest.restoreAllMocks();
});

describe("Abort utilities with AbortController", () => {
  let controllerAbortSpy: jest.SpyInstance;
  let signalAddListenerSpy: jest.SpyInstance;
  let signalRemoveListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    controllerAbortSpy = jest.spyOn(ac, "abort");
    signalAddListenerSpy = jest.spyOn(ac.signal, "addEventListener");
    signalRemoveListenerSpy = jest.spyOn(ac.signal, "removeEventListener");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("addListenerToAbortEmitter", () => {
    it("adds a listener to the AbortController", () => {
      addListenerToAbortEmitter(ac, listener);
      expect(signalAddListenerSpy).toHaveBeenCalledWith("abort", listener, {
        once: true,
      });
    });
  });

  describe("removeListenerFromAbortEmitter", () => {
    it("removes a listener from the AbortController", () => {
      removeListenerFromAbortEmitter(ac, listener);
      expect(signalRemoveListenerSpy).toHaveBeenCalledWith("abort", listener);
    });
  });

  describe("emitAbortEmitter", () => {
    it("causes the AbortController to abort", () => {
      emitAbortEmitter(ac);
      expect(controllerAbortSpy).toHaveBeenCalled();
    });
  });
});
