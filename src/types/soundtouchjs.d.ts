declare module "soundtouchjs" {
  export class SoundTouch {
    tempo: number;
    rate: number;
    pitch: number;
    pitchSemitones: number;
  }

  export class SimpleFilter {
    sourcePosition: number;
    constructor(
      source: WebAudioBufferSource,
      pipe: SoundTouch,
      onEnd?: () => void
    );
    extract(target: Float32Array, numFrames: number): number;
  }

  export class WebAudioBufferSource {
    constructor(buffer: {
      numberOfChannels: number;
      length: number;
      sampleRate: number;
      duration: number;
      getChannelData(channel: number): Float32Array;
    });
  }

  export class PitchShifter {
    constructor(
      context: AudioContext,
      buffer: AudioBuffer,
      bufferSize: number,
      onEnd?: () => void
    );
    timePlayed: number;
    sourcePosition: number;
    duration: number;
    sampleRate: number;
    formattedDuration: string;
    formattedTimePlayed: string;
    percentagePlayed: number;
    node: ScriptProcessorNode;
    pitch: number;
    pitchSemitones: number;
    rate: number;
    tempo: number;
    connect(toNode: AudioNode): void;
    disconnect(): void;
    on(eventName: string, cb: (detail: unknown) => void): void;
    off(eventName?: string): void;
  }

  export function getWebAudioNode(
    context: AudioContext,
    filter: SimpleFilter,
    sourcePositionCallback?: (position: number) => void,
    bufferSize?: number
  ): ScriptProcessorNode;

  export class RateTransposer extends AbstractFifoSamplePipe {}
  export class Stretch extends AbstractFifoSamplePipe {}
  export class AbstractFifoSamplePipe {}
}
