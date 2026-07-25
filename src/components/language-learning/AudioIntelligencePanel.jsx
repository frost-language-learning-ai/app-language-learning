import React, { useEffect, useMemo, useRef, useState } from "react";
import Meyda from "meyda";
import { languageApi } from "../../lib/apiClient.js";

function computeSimpleDrift(modelDur, userDur) {
  if (!modelDur || !userDur) return null;
  const ratio = userDur / modelDur;
  return {
    ratio,
    timingLabel: ratio > 1.1 ? "slow" : ratio < 0.9 ? "fast" : "almost match"
  };
}

function downsampleRms(float32Array, targetPoints = 240) {
  if (!float32Array?.length) return [];
  const bucketSize = Math.max(1, Math.floor(float32Array.length / targetPoints));
  const result = [];

  for (let i = 0; i < float32Array.length; i += bucketSize) {
    const end = Math.min(i + bucketSize, float32Array.length);
    let sum = 0;
    for (let j = i; j < end; j += 1) {
      const v = float32Array[j];
      sum += v * v;
    }
    const rms = Math.sqrt(sum / Math.max(1, end - i));
    result.push(rms);
  }

  return result;
}

function normalizeWave(wave) {
  if (!wave.length) return wave;
  const peak = Math.max(...wave, 0.0001);
  return wave.map((v) => Math.min(1, v / peak));
}

function extractMfccFrames(float32Array, sampleRate) {
  const frameSize = 1024;
  const hopSize = 512;
  const frames = [];

  Meyda.sampleRate = sampleRate;
  Meyda.bufferSize = frameSize;
  Meyda.melBands = 26;
  Meyda.numberOfMFCCCoefficients = 13;

  for (let index = 0; index + frameSize <= float32Array.length; index += hopSize) {
    const features = Meyda.extract(["mfcc", "rms"], float32Array.slice(index, index + frameSize));
    if (Array.isArray(features?.mfcc)) {
      frames.push({ tSec: index / sampleRate, coefficients: features.mfcc, rms: features.rms || 0 });
    }
  }

  return frames;
}

function compressFrames(frames, max = 180) {
  if (frames.length <= max) return frames;
  const stride = Math.ceil(frames.length / max);
  const sampled = [];
  for (let i = 0; i < frames.length; i += stride) {
    sampled.push(frames[i]);
  }
  return sampled;
}

function mfccDistance(a, b) {
  const coefficientCount = Math.min(a.coefficients.length, b.coefficients.length);
  if (!coefficientCount) return Number.POSITIVE_INFINITY;

  let squaredDistance = 0;
  for (let index = 0; index < coefficientCount; index += 1) {
    const difference = a.coefficients[index] - b.coefficients[index];
    squaredDistance += difference * difference;
  }
  return Math.sqrt(squaredDistance / coefficientCount) + Math.abs(a.rms - b.rms) * 0.25;
}

function alignMfccFrames(modelFramesRaw, userFramesRaw) {
  const modelFrames = compressFrames(modelFramesRaw, 180);
  const userFrames = compressFrames(userFramesRaw, 180);
  const n = modelFrames.length;
  const m = userFrames.length;
  if (!n || !m) return null;

  const dp = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => Number.POSITIVE_INFINITY));
  const back = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => null));
  dp[0][0] = 0;

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const cost = mfccDistance(modelFrames[i - 1], userFrames[j - 1]);
      const diag = dp[i - 1][j - 1];
      const up = dp[i - 1][j] + 0.2;
      const left = dp[i][j - 1] + 0.2;

      if (diag <= up && diag <= left) {
        dp[i][j] = cost + diag;
        back[i][j] = [i - 1, j - 1];
      } else if (up <= left) {
        dp[i][j] = cost + up;
        back[i][j] = [i - 1, j];
      } else {
        dp[i][j] = cost + left;
        back[i][j] = [i, j - 1];
      }
    }
  }

  const pairs = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const prev = back[i][j];
    if (!prev) break;
    pairs.push({ model: modelFrames[i - 1], user: userFrames[j - 1] });
    [i, j] = prev;
  }
  pairs.reverse();

  const mismatches = pairs
    .map((p) => ({
      ...p,
      diff: mfccDistance(p.model, p.user)
    }))
    .filter((p) => p.diff >= 30)
    .slice(0, 12);

  const avgCost = dp[n][m] / Math.max(1, pairs.length);
  const matchPct = Math.max(0, Math.min(100, 100 * Math.exp(-avgCost / 35)));

  return {
    pairs,
    mismatches,
    matchPct
  };
}

function resampleLinear(wave, targetLength) {
  if (!wave.length || targetLength <= 0) return [];
  if (wave.length === targetLength) return [...wave];
  if (targetLength === 1) return [wave[0]];

  const result = [];
  const scale = (wave.length - 1) / (targetLength - 1);
  for (let i = 0; i < targetLength; i += 1) {
    const pos = i * scale;
    const left = Math.floor(pos);
    const right = Math.min(wave.length - 1, Math.ceil(pos));
    const frac = pos - left;
    result.push(wave[left] * (1 - frac) + wave[right] * frac);
  }
  return result;
}

function buildMismatchSegments(diffWave, threshold = 0.23) {
  const segments = [];
  let start = -1;

  for (let i = 0; i < diffWave.length; i += 1) {
    if (diffWave[i] >= threshold && start < 0) {
      start = i;
    }
    if ((diffWave[i] < threshold || i === diffWave.length - 1) && start >= 0) {
      const end = diffWave[i] < threshold ? i - 1 : i;
      if (end - start >= 3) {
        const slice = diffWave.slice(start, end + 1);
        const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
        segments.push({
          start,
          end,
          severity: avg
        });
      }
      start = -1;
    }
  }

  return segments;
}

function drawWaveComparison(canvas, modelWave, userWave, mismatchSegments) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#f6fbfb";
  ctx.fillRect(0, 0, width, height);

  const centerY = height / 2;
  ctx.strokeStyle = "#d1e4e5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(width, centerY);
  ctx.stroke();

  mismatchSegments.forEach((seg) => {
    const startX = (seg.start / Math.max(1, modelWave.length - 1)) * width;
    const endX = (seg.end / Math.max(1, modelWave.length - 1)) * width;
    ctx.fillStyle = "rgba(230, 73, 73, 0.16)";
    ctx.fillRect(startX, 0, Math.max(2, endX - startX), height);
  });

  const drawSingle = (wave, color, mirror = false) => {
    if (!wave.length) return;
    const maxAmp = (height * 0.46);
    const step = width / Math.max(1, wave.length - 1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < wave.length; i += 1) {
      const x = i * step;
      const amp = wave[i] * maxAmp;
      const y = mirror ? centerY + amp : centerY - amp;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };

  drawSingle(modelWave, "#2c7a7b", false);
  drawSingle(userWave, "#3366cc", true);
}

async function decodeAudioToWave(blobOrFile) {
  const bytes = await blobOrFile.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const audioBuffer = await audioContext.decodeAudioData(bytes.slice(0));
    const channel = audioBuffer.getChannelData(0);
    const wave = normalizeWave(downsampleRms(channel, 280));
    const mfccFrames = extractMfccFrames(channel, audioBuffer.sampleRate);
    return { wave, durationSec: audioBuffer.duration, mfccFrames, samples: new Float32Array(channel), sampleRate: audioBuffer.sampleRate };
  } finally {
    await audioContext.close();
  }
}

function encodePcmForWhisper(samples, sourceSampleRate) {
  const targetSampleRate = 16_000;
  const targetLength = Math.max(1, Math.round(samples.length * targetSampleRate / sourceSampleRate));
  const bytes = new Uint8Array(targetLength * 4);
  const view = new DataView(bytes.buffer);

  for (let index = 0; index < targetLength; index += 1) {
    const sourcePosition = index * sourceSampleRate / targetSampleRate;
    const left = Math.floor(sourcePosition);
    const right = Math.min(samples.length - 1, left + 1);
    const fraction = sourcePosition - left;
    const sample = samples[left] * (1 - fraction) + samples[right] * fraction;
    view.setFloat32(index * 4, sample, true);
  }

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function blobToBase64WithoutPrefix(blob) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || "");
    reader.onerror = () => reject(new Error("Failed to read audio blob"));
    reader.readAsDataURL(blob);
  });

  const asText = String(dataUrl);
  const idx = asText.indexOf(",");
  return idx >= 0 ? asText.slice(idx + 1) : asText;
}

export default function AudioIntelligencePanel({ 
  termId = 1, 
  sourceLanguage = "en",
  targetLanguage = "de",
  practiceWord = null,
  onError, 
  t 
}) {
  const mediaRecorderRef = useRef(null);
  const activeStreamRef = useRef(null);
  const compareCanvasRef = useRef(null);
  const [chunks, setChunks] = useState([]);
  const [recording, setRecording] = useState(false);
  const [modelDurationSec, setModelDurationSec] = useState(2.8);
  const [userDurationSec, setUserDurationSec] = useState(null);
  const [selfEvaluation, setSelfEvaluation] = useState(3);
  const [modelBlobUrl, setModelBlobUrl] = useState("");
  const [modelWave, setModelWave] = useState([]);
  const [userWave, setUserWave] = useState([]);
  const [modelMfccFrames, setModelMfccFrames] = useState([]);
  const [userMfccFrames, setUserMfccFrames] = useState([]);
  const [mfccMatchPct, setMfccMatchPct] = useState(null);
  const [mfccMismatchRows, setMfccMismatchRows] = useState([]);
  const [similarity, setSimilarity] = useState(null);
  const [mismatchSegments, setMismatchSegments] = useState([]);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // state for pronunciation evaluation
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [modelPhraseForEval, setModelPhraseForEval] = useState("");
  const [referenceTranscript, setReferenceTranscript] = useState("");
  const [userTranscript, setUserTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);

  const drift = useMemo(() => computeSimpleDrift(modelDurationSec, userDurationSec), [modelDurationSec, userDurationSec]);

  // Auto-populate practice word from FastPipelinePanel
  useEffect(() => {
    if (practiceWord?.targetWord) {
      setModelPhraseForEval(practiceWord.targetWord);
      setMessage(`Practice: "${practiceWord.targetWord}" (${targetLanguage.toUpperCase()})`);
    }
  }, [practiceWord, targetLanguage]);

  useEffect(() => {
    if (!modelWave.length || !userWave.length) {
      setSimilarity(null);
      setMismatchSegments([]);
      return;
    }

    const targetLength = Math.min(260, Math.max(120, Math.min(modelWave.length, userWave.length)));
    const modelAligned = resampleLinear(modelWave, targetLength);
    const userAligned = resampleLinear(userWave, targetLength);
    const diffWave = modelAligned.map((v, i) => Math.abs(v - userAligned[i]));
    const avgDiff = diffWave.reduce((a, b) => a + b, 0) / Math.max(1, diffWave.length);
    const similarityPct = Math.max(0, Math.min(100, (1 - avgDiff) * 100));

    setSimilarity(similarityPct);
    setMismatchSegments(buildMismatchSegments(diffWave));
  }, [modelWave, userWave]);

  useEffect(() => {
    const targetLength = Math.min(260, Math.max(120, Math.min(modelWave.length || 120, userWave.length || 120)));
    const modelAligned = resampleLinear(modelWave, targetLength);
    const userAligned = resampleLinear(userWave, targetLength);
    drawWaveComparison(compareCanvasRef.current, modelAligned, userAligned, mismatchSegments);
  }, [modelWave, userWave, mismatchSegments]);

  useEffect(() => {
    if (!modelMfccFrames.length || !userMfccFrames.length) {
      setMfccMatchPct(null);
      setMfccMismatchRows([]);
      return;
    }

    const aligned = alignMfccFrames(modelMfccFrames, userMfccFrames);
    if (!aligned) {
      setMfccMatchPct(null);
      setMfccMismatchRows([]);
      return;
    }

    setMfccMatchPct(aligned.matchPct);
    setMfccMismatchRows(
      aligned.mismatches.map((row, idx) => ({
        id: `${row.model.tSec}-${row.user.tSec}-${idx}`,
        modelTime: row.model.tSec,
        userTime: row.user.tSec,
        diff: row.diff
      }))
    );
  }, [modelMfccFrames, userMfccFrames]);

  useEffect(() => {
    return () => {
      if (recordedBlobUrl) {
        URL.revokeObjectURL(recordedBlobUrl);
      }
      if (modelBlobUrl) {
        URL.revokeObjectURL(modelBlobUrl);
      }
    };
  }, [recordedBlobUrl, modelBlobUrl]);

  async function onSelectModelAudioFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setMessage("");
    try {
      const { wave, durationSec, mfccFrames, samples, sampleRate } = await decodeAudioToWave(file);
      setModelWave(wave);
      setModelMfccFrames(mfccFrames);
      setModelDurationSec(durationSec);
      if (modelBlobUrl) {
        URL.revokeObjectURL(modelBlobUrl);
      }
      setModelBlobUrl(URL.createObjectURL(file));
      setTranscribing(true);
      const result = await languageApi.transcribeAudio({
        pcmBase64: encodePcmForWhisper(samples, sampleRate),
        language: sourceLanguage
      });
      const transcript = result.transcription.text;
      setReferenceTranscript(transcript);
      setModelPhraseForEval((current) => current || transcript);
      setMessage(t.llAiAudioLoaded || "Reference audio loaded. Record your voice to compare.");
    } catch (error) {
      setMessage(`Failed to load AI audio: ${error?.message || "decode error"}`);
      onError?.(error);
    } finally {
      setTranscribing(false);
      setBusy(false);
    }
  }

  async function startRecording() {
    setMessage("");
    if (!navigator?.mediaDevices?.getUserMedia) {
      const m = t.llRecordingUnsupported || "Recording API is not available in this browser.";
      setMessage(m);
      onError?.(m);
      return;
    }

    let stream;
    let recorder;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    } catch (error) {
      setMessage(`Failed to start recording: ${error?.message || "permission denied"}`);
      onError?.(error);
      return;
    }

    activeStreamRef.current = stream;
    const localChunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) localChunks.push(e.data);
    };

    recorder.onstop = async () => {
      try {
        setChunks(localChunks);
        const blob = new Blob(localChunks, { type: "audio/webm" });
        setRecordedBlob(blob);
        if (recordedBlobUrl) {
          URL.revokeObjectURL(recordedBlobUrl);
        }
        const blobUrl = URL.createObjectURL(blob);
        setRecordedBlobUrl(blobUrl);

        const { wave, durationSec, mfccFrames, samples, sampleRate } = await decodeAudioToWave(blob);
        setUserWave(wave);
        setUserMfccFrames(mfccFrames);
        setUserDurationSec(durationSec);
        setTranscribing(true);
        const result = await languageApi.transcribeAudio({
          pcmBase64: encodePcmForWhisper(samples, sampleRate),
          language: sourceLanguage
        });
        setUserTranscript(result.transcription.text);
        setMessage(t.llRecordingReadyToSave || "Recording complete. Review the analysis and transcript.");
      } catch (error) {
        const suffix = error?.requestId ? ` (requestId: ${error.requestId})` : "";
        setMessage(`Failed to process recording: ${error.message}${suffix}`);
        onError?.(error);
      } finally {
        setTranscribing(false);
        const currentStream = activeStreamRef.current;
        if (currentStream) {
          currentStream.getTracks().forEach((track) => track.stop());
        }
        activeStreamRef.current = null;
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  async function saveRecording() {
    if (!recordedBlob) {
      setMessage(t.llRecordFirst || "Please record first.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const policy = await languageApi.createAudioUploadPolicy({ termId, type: "user_voice" });
      await languageApi.registerAudio({
        termId,
        type: "user_voice",
        fileUrl: policy.fileUrl,
        selfEvaluation
      });

      setMessage(t.llRecordingSaved || "Recording metadata saved.");
      setRecordedBlob(null);
      if (recordedBlobUrl) {
        URL.revokeObjectURL(recordedBlobUrl);
        setRecordedBlobUrl("");
      }
    } catch (error) {
      const suffix = error?.requestId ? ` (requestId: ${error.requestId})` : "";
      setMessage(`Failed to save recording: ${error.message}${suffix}`);
      onError?.(error);
    } finally {
      setBusy(false);
    }
  }

  async function requestPronunciationEvaluation() {
    if (mfccMatchPct === null || similarity === null) {
      setMessage(t.llAnalysisIncomplete || "Please analyze audio (load AI audio and record user audio).");
      return;
    }

    if (!modelPhraseForEval.trim()) {
      setMessage(t.llPhraseMissing || "Please enter the target phrase.");
      return;
    }

    setEvaluationLoading(true);
    setMessage("");
    try {
      const data = await languageApi.evaluatePronunciation({
        targetPhrase: modelPhraseForEval,
        targetLanguage: sourceLanguage || "en",
        mfccAccuracy: mfccMatchPct || 0,
        waveformSimilarity: similarity || 0,
        timingInfo: drift?.timingLabel || "normal",
        transcript: userTranscript
      });
      setEvaluationResult(data.evaluation);
      setMessage(t.llEvaluationComplete || "Evaluation complete!");
    } catch (error) {
      setMessage(`Evaluation failed: ${error.message}`);
      onError?.(error);
    } finally {
      setEvaluationLoading(false);
    }
  }

  return (
    <section className="ll-card">
      <h3>{t.llAudioTitle || "Audio Intelligence"}</h3>
      
      {practiceWord && (
        <div className="ll-preview" style={{ background: "#f0f8ff", padding: "12px", borderRadius: "6px", marginBottom: "16px" }}>
          <p><strong>📚 Practice Word:</strong></p>
          <p style={{ fontSize: "1.1em", margin: "8px 0" }}>
            <span style={{ marginRight: "16px" }}><strong>{practiceWord.sourceWord}</strong> ({sourceLanguage.toUpperCase()})</span>
            <span>→ <strong>{practiceWord.targetWord}</strong> ({targetLanguage.toUpperCase()})</span>
          </p>
          {practiceWord.phonetic && <p><strong>Phonetic:</strong> {practiceWord.phonetic}</p>}
          {practiceWord.examples && practiceWord.examples.length > 0 && (
            <>
              <p><strong>Examples:</strong></p>
              <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                {practiceWord.examples.slice(0, 2).map((ex, i) => (
                  <li key={i} style={{ fontSize: "0.9em", color: "#666" }}>{ex}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="ll-row">
        <button onClick={recording ? stopRecording : startRecording} className="ll-button ll-button-primary">
          {recording ? (t.llStopRecording || "Stop") : (t.llStartRecording || "Start Recording")}
        </button>
        <button
          onClick={saveRecording}
          disabled={recording || busy || !recordedBlob}
          className="ll-button"
        >
          {t.llSaveRecording || "Save Recording"}
        </button>
        <label>
          {t.llSelfEvaluation || "Self Evaluation"}
          <input
            type="number"
            min="1"
            max="5"
            value={selfEvaluation}
            onChange={(e) => setSelfEvaluation(Number(e.target.value || 3))}
            disabled={recording || busy}
            className="ll-input ll-input-sm"
          />
        </label>
      </div>

      <div className="ll-row" style={{ marginTop: 8 }}>
        <label>
          {t.llReferenceAudioLabel || "Native reference audio (mp3/m4a/wav/mp4)"}
          <input
            type="file"
            accept="audio/*,video/mp4"
            onChange={onSelectModelAudioFile}
            disabled={recording || busy}
            className="ll-input"
          />
        </label>
      </div>

      <div className="ll-wave-compare-advanced">
        <p className="ll-legend">
          <span className="ll-dot ll-dot-model" /> {t.llLegendReferenceVoice || "Native reference"}
          <span className="ll-dot ll-dot-user" /> {t.llLegendUserVoice || "Your voice"}
          <span className="ll-dot ll-dot-mismatch" /> {t.llLegendMismatch || "Mismatch area"}
        </p>
        <canvas ref={compareCanvasRef} width={980} height={220} className="ll-wave-canvas" />
        {similarity !== null && (
          <p className="ll-match-rate">{t.llWaveMatchRateLabel || "Wave match"}: {similarity.toFixed(1)}%</p>
        )}
        {mismatchSegments.length > 0 && (
          <ul className="ll-mismatch-list">
            {mismatchSegments.slice(0, 5).map((seg, idx) => (
              <li key={`${seg.start}-${seg.end}-${idx}`}>
                {t.llMismatchRegionLabel || "Mismatch"} {idx + 1}: {((seg.start / Math.max(1, 260)) * 100).toFixed(1)}% - {((seg.end / Math.max(1, 260)) * 100).toFixed(1)}%
                ({t.llDiffLabel || "diff"} {Math.round(seg.severity * 100)}%)
              </li>
            ))}
          </ul>
        )}
      </div>

      {(mfccMatchPct !== null || mfccMismatchRows.length > 0) && (
        <div className="ll-phoneme-panel">
          {mfccMatchPct !== null && (
            <p className="ll-match-rate">{t.llMfccMatchRateLabel || "MFCC acoustic match"}: {mfccMatchPct.toFixed(1)}%</p>
          )}
          {mfccMismatchRows.length > 0 ? (
            <div className="ll-phoneme-table-wrap">
              <table className="ll-phoneme-table">
                <thead>
                  <tr>
                    <th>{t.llAiPositionSec || "Reference position (sec)"}</th>
                    <th>{t.llUserPositionSec || "User position (sec)"}</th>
                    <th>{t.llDiffLabel || "MFCC distance"}</th>
                  </tr>
                </thead>
                <tbody>
                  {mfccMismatchRows.slice(0, 8).map((row) => (
                    <tr key={row.id}>
                      <td>{row.modelTime.toFixed(2)}</td>
                      <td>{row.userTime.toFixed(2)}</td>
                      <td>{row.diff.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ll-message">{t.llNoLargeMfccMismatch || "No large MFCC mismatches detected."}</p>
          )}
        </div>
      )}

      {drift && (
        <p className="ll-message">
          {t.llTimingRatioLabel || "Timing ratio"}: {drift.ratio.toFixed(2)} ({drift.timingLabel})
        </p>
      )}

      <div className="ll-evaluation-section">
        <h4>{t.llPronunciationEvaluation || "Pronunciation Evaluation"}</h4>
        <div className="ll-row">
          <input
            type="text"
            placeholder={t.llTargetPhrasePlaceholder || "Enter target phrase..."}
            value={modelPhraseForEval}
            onChange={(e) => setModelPhraseForEval(e.target.value)}
            disabled={evaluationLoading || busy || mfccMatchPct === null}
            className="ll-input"
          />
          <button
            onClick={requestPronunciationEvaluation}
            disabled={evaluationLoading || busy || transcribing || mfccMatchPct === null || !modelPhraseForEval.trim()}
            className="ll-button ll-button-primary"
          >
            {evaluationLoading ? (t.llEvaluating || "Evaluating...") : (t.llGetEvaluation || "Get AI Evaluation")}
          </button>
        </div>

        {evaluationResult && (
          <div className="ll-evaluation-result">
            <p className="ll-confidence">
              {t.llAiConfidence || "AI Confidence"}: {(evaluationResult.confidence * 100).toFixed(0)}%
            </p>
            <div className="ll-improvements">
              <h5>{t.llImprovementPoints || "Improvement Points"}:</h5>
              <ul>
                {evaluationResult.improvements.map((item, idx) => (
                  <li key={idx} className={`ll-improvement ll-focus-${item.focus}`}>
                    <strong>{item.focus}:</strong> {item.point}
                    <br />
                    <em>💡 {item.tip}</em>
                  </li>
                ))}
              </ul>
            </div>
            {evaluationResult.encouragement && (
              <p className="ll-encouragement">
                🌟 {evaluationResult.encouragement}
              </p>
            )}
          </div>
        )}
      </div>

      {(referenceTranscript || userTranscript || transcribing) && (
        <div className="ll-transcript-panel">
          <h4>{t.llWhisperTranscript || "Whisper transcription"}</h4>
          {transcribing ? <p className="ll-message">{t.llTranscribing || "Transcribing audio locally..."}</p> : (
            <>
              {referenceTranscript && <p><strong>{t.llReferenceTranscript || "Reference"}:</strong> {referenceTranscript}</p>}
              {userTranscript && <p><strong>{t.llUserTranscript || "Your recording"}:</strong> {userTranscript}</p>}
            </>
          )}
        </div>
      )}

      <div className="ll-audio-playback">
        <h4>{t.llAudioPlayback || "Audio Playback"}</h4>
        {modelBlobUrl && (
          <div>
            <p>{t.llReferenceVoiceAudio || "Native reference"}:</p>
            <audio controls src={modelBlobUrl} style={{ marginTop: 5, width: "100%" }} />
          </div>
        )}
        {recordedBlobUrl && (
          <div>
            <p>{t.llYourVoiceAudio || "Your Voice"}:</p>
            <audio controls src={recordedBlobUrl} style={{ marginTop: 5, width: "100%" }} />
          </div>
        )}
      </div>

      {chunks.length > 0 && <p className="ll-message">{t.llCapturedChunks || "Captured chunks"}: {chunks.length}</p>}
      {busy && <p className="ll-message">{t.llSaving || "Saving..."}</p>}
      {message && <p className="ll-message">{message}</p>}
    </section>
  );
}
