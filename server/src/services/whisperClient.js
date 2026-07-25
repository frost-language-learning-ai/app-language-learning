import { pipeline } from "@huggingface/transformers";
import { config } from "../config.js";
import { AppError } from "../errors.js";
import { getWhisperLanguageName } from "../lib/supportedLanguages.js";

const SAMPLE_RATE = 16_000;

let transcriberPromise;

function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = pipeline("automatic-speech-recognition", config.whisperModel);
  }
  return transcriberPromise;
}

function decodePcmBase64(pcmBase64) {
  const buffer = Buffer.from(pcmBase64, "base64");
  if (buffer.length === 0 || buffer.length % 4 !== 0) {
    throw new AppError("PCM audio payload is invalid", { status: 400, code: "INVALID_AUDIO" });
  }

  const samples = new Float32Array(buffer.length / 4);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = buffer.readFloatLE(index * 4);
  }
  return samples;
}

export async function transcribePcmAudio({ pcmBase64, language = "auto" }) {
  const samples = decodePcmBase64(pcmBase64);
  const transcriber = await getTranscriber();

  try {
    const result = await transcriber(samples, {
      sampling_rate: SAMPLE_RATE,
      task: "transcribe",
      language: getWhisperLanguageName(language),
      return_timestamps: "word"
    });

    return {
      text: result.text.trim(),
      chunks: (result.chunks || []).map((chunk) => ({
        text: chunk.text.trim(),
        startSec: chunk.timestamp[0],
        endSec: chunk.timestamp[1]
      }))
    };
  } catch (error) {
    throw new AppError("Whisper transcription failed", {
      status: 502,
      code: "WHISPER_TRANSCRIPTION_FAILED",
      cause: error
    });
  }
}