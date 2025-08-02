import 'whatwg-fetch';
import { TextDecoder, TextEncoder } from 'util';
import { ReadableStream, WritableStream, TransformStream } from 'stream/web';

// MSW requires these globals
global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
global.ReadableStream = ReadableStream;
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;

// Mock BroadcastChannel for MSW WebSocket support
global.BroadcastChannel = class BroadcastChannel {
  constructor(name) {
    this.name = name;
  }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
};
