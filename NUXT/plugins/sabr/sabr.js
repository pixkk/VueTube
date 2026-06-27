// SABR (Server Adaptive Bitrate) library

// --- SABR helper constants ---
const SABR_CLIENT_NAME_IDS = {
    WEB: 1, MWEB: 2, ANDROID: 3, IOS: 5, TVHTML5: 7,
    ANDROID_MUSIC: 21, WEB_MUSIC_EMBEDDED_PLAYER: 39,
    WEB_EMBEDDED_PLAYER: 56, WEB_CREATOR: 62, ANDROID_VR: 28,
  };

  // --- SABR module-level helpers ---

  function sabrConcat(arrays) {
    const totalLength = arrays.reduce((acc, a) => acc + a.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const a of arrays) { result.set(a, offset); offset += a.length; }
    return result;
  }

  function sabrEncodeVarint(value) {
    const bytes = [];
    while (value > 0x7f) {
      bytes.push((value & 0x7f) | 0x80);
      value = Math.floor(value / 128);
    }
    bytes.push(value & 0x7f);
    return new Uint8Array(bytes);
  }

  // Protobuf-style varint — used for parsing protobuf message fields inside UMP parts
  function sabrReadVarint(bytes, offset) {
    let value = 0, mul = 1, b;
    do {
      b = bytes[offset++];
      if (b === undefined) break;
      value += (b & 0x7f) * mul;
      mul *= 128;
    } while (b & 0x80);
    return { value, nextOffset: offset };
  }

  // UMP-specific varint — used for reading partType and partSize in the outer UMP frame
  function umpReadVarint(bytes, offset) {
    const b0 = bytes[offset];
    if (b0 === undefined) return { value: -1, nextOffset: offset };
    let value, nextOffset;
    if (b0 < 128) {
      value = b0;
      nextOffset = offset + 1;
    } else if (b0 < 192) {
      const b1 = bytes[offset + 1];
      if (b1 === undefined) return { value: -1, nextOffset: offset };
      value = (b0 & 0x3f) + 64 * b1;
      nextOffset = offset + 2;
    } else if (b0 < 224) {
      const b1 = bytes[offset + 1], b2 = bytes[offset + 2];
      if (b1 === undefined || b2 === undefined) return { value: -1, nextOffset: offset };
      value = (b0 & 0x1f) + 32 * (b1 + 256 * b2);
      nextOffset = offset + 3;
    } else if (b0 < 240) {
      const b1 = bytes[offset + 1], b2 = bytes[offset + 2], b3 = bytes[offset + 3];
      if (b1 === undefined || b2 === undefined || b3 === undefined) return { value: -1, nextOffset: offset };
      value = (b0 & 0x0f) + 16 * (b1 + 256 * (b2 + 256 * b3));
      nextOffset = offset + 4;
    } else {
      const b1 = bytes[offset + 1], b2 = bytes[offset + 2], b3 = bytes[offset + 3], b4 = bytes[offset + 4];
      if (b1 === undefined || b2 === undefined || b3 === undefined || b4 === undefined) return { value: -1, nextOffset: offset };
      value = b1 + 256 * (b2 + 256 * (b3 + 256 * b4));
      nextOffset = offset + 5;
    }
    return { value, nextOffset };
  }

  function sabrPbLenDelim(fieldNumber, data) {
    return sabrConcat([sabrEncodeVarint((fieldNumber << 3) | 2), sabrEncodeVarint(data.length), data]);
  }

  function sabrPbVarint(fieldNumber, value) {
    return sabrConcat([sabrEncodeVarint((fieldNumber << 3) | 0), sabrEncodeVarint(value)]);
  }

  function sabrPbString(fieldNumber, str) {
    return sabrPbLenDelim(fieldNumber, new TextEncoder().encode(str));
  }

  function sabrBase64Decode(str) {
    const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
  }

  function sabrBuildRequest({ ustreamerConfigB64, clientName, clientVersion, itag, playerTimeMs = 0, playbackCookieBytes = null, isAudio = false, videoItag = null, audioItag = null }) {
    const ustreamerBytes = sabrBase64Decode(ustreamerConfigB64);

    const isAudioFormat = typeof isAudio === 'boolean' ? isAudio : [139, 140, 141, 171, 172, 249, 250, 251, 256, 258, 327, 338].includes(itag);

    // field 1: client_abr_state
    //   field 28: player_time_ms (int64)
    //   field 40: enabled_track_types_bitfield (int32) - 1 for AUDIO_ONLY, 2 for VIDEO_ONLY
    const clientAbrStateInner = sabrConcat([
      sabrPbVarint(28, playerTimeMs),
      sabrPbVarint(40, isAudioFormat ? 1 : 2)
    ]);
    const clientAbrState = sabrPbLenDelim(1, clientAbrStateInner);

    // field 2: selected_format_ids { field 1: itag }
    const formatIds = sabrPbLenDelim(2, sabrPbVarint(1, itag));

    // field 4: player_time_ms (int64)
    const playerTime = sabrPbVarint(4, playerTimeMs);

    // field 5: video_playback_ustreamer_config (bytes)
    const ustreamerField = sabrPbLenDelim(5, ustreamerBytes);

    // field 16 (tag 130): preferred_audio_format_ids { field 1: itag }
    // field 17 (tag 138): preferred_video_format_ids { field 1: itag }
    const preferredFormats = [];
    const finalAudioItag = audioItag || (isAudioFormat ? itag : null);
    if (finalAudioItag) {
      preferredFormats.push(sabrPbLenDelim(16, sabrPbVarint(1, finalAudioItag)));
    }
    const finalVideoItag = videoItag || (!isAudioFormat ? itag : null);
    if (finalVideoItag) {
      preferredFormats.push(sabrPbLenDelim(17, sabrPbVarint(1, finalVideoItag)));
    }
    const preferredFormat = sabrConcat(preferredFormats);

    // field 19: streamer_context {
    //   field 1: client_info { field 16: client_name, field 17: client_version }
    //   field 3: playback_cookie (bytes, from previous NextRequestPolicy)
    // }
    const clientNameId = SABR_CLIENT_NAME_IDS[clientName] || 1;
    const clientInfo = sabrConcat([
      sabrPbVarint(16, clientNameId),
      sabrPbString(17, clientVersion),
    ]);
    const streamerContextInner = playbackCookieBytes
      ? sabrConcat([sabrPbLenDelim(1, clientInfo), sabrPbLenDelim(3, playbackCookieBytes)])
      : sabrPbLenDelim(1, clientInfo);
    const streamerContext = sabrPbLenDelim(19, streamerContextInner);

    return sabrConcat([clientAbrState, formatIds, playerTime, ustreamerField, preferredFormat, streamerContext]);
  }

  async function sabrFetch(sabrUrl, body, requestNumber = 1, signal) {
    const url = new URL(sabrUrl);
    url.searchParams.set('rn', String(requestNumber));
    const response = await fetch(url.toString(), {
      method: 'POST',
      body: body,
      signal,
      headers: {
        'content-type': 'application/x-protobuf',
        'accept': 'application/vnd.yt-ump',
        'accept-encoding': 'identity',
      },
    });
    if (!response.ok) throw new Error(`SABR HTTP ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  function* sabrParseUMP(rawBytes) {
    let offset = 0;
    while (offset < rawBytes.length) {
      const { value: partId, nextOffset: o1 } = umpReadVarint(rawBytes, offset);
      if (partId < 0) break;
      const { value: size, nextOffset: o2 } = umpReadVarint(rawBytes, o1);
      if (size < 0) break;
      const data = rawBytes.slice(o2, o2 + size);
      offset = o2 + size;
      yield { partId, data };
    }
  }

  function sabrParseProtoVarintFields(data) {
    const fields = {};
    let offset = 0;
    while (offset < data.length) {
      const { value: tag, nextOffset: o1 } = sabrReadVarint(data, offset);
      if (o1 <= offset) break;
      const fieldNumber = tag >> 3, wireType = tag & 7;
      offset = o1;
      if (wireType === 0) {
        const { value, nextOffset } = sabrReadVarint(data, offset);
        if (nextOffset <= offset) break;
        offset = nextOffset;
        fields[fieldNumber] = value;
      } else if (wireType === 2) {
        const { value: len, nextOffset } = sabrReadVarint(data, offset);
        if (nextOffset <= offset) break;
        fields[fieldNumber] = data.slice(nextOffset, nextOffset + len);
        offset = nextOffset + len;
      } else if (wireType === 1) { offset += 8; }
      else if (wireType === 5) { offset += 4; }
      else break;
    }
    return fields;
  }

  function sabrParseMediaHeader(data) {
    const f = sabrParseProtoVarintFields(data);
    // field 1 = headerId, field 3 = itag, field 9 = sequenceNumber, field 12 = durationMs
    // field 8 (tag 64) = isInitSeg bool
    // field 15 = timeRange (bytes)
    let durationMs = f[12] || 0;
    const isInitSeg = !!f[8];
    
    if (!durationMs && f[15]) {
      try {
        const tr = sabrParseProtoVarintFields(f[15]);
        const durationTicks = tr[2] || 0;
        const timescale = tr[3] || 1000;
        if (durationTicks > 0 && timescale > 0) {
          durationMs = Math.round(durationTicks / (timescale / 1000));
        }
      } catch (e) {
        console.error('[SABR] failed to parse timeRange:', e);
      }
    }

    // Fallback for media segments to prevent infinite looping if duration is still missing
    if (!isInitSeg && !durationMs) {
      durationMs = 5000;
    }

    return { headerId: f[1] || 0, itag: f[3] || 0, sequenceNumber: f[9] || 0, durationMs, isInitSeg };
  }

  function sabrExtractMedia(parts, itagHint) {
    const headers = new Map();  // headerId -> MediaHeader
    const buffers = new Map();  // headerId -> Uint8Array[]
    const segments = [];

    for (const { partId, data } of parts) {
      if (partId === 20) {
        const h = sabrParseMediaHeader(data);
        headers.set(h.headerId, h);
        buffers.set(h.headerId, []);
      } else if (partId === 21) {
        const headerId = data[0];
        const buf = buffers.get(headerId);
        if (buf) buf.push(data.slice(1));
      } else if (partId === 22) {
        const headerId = data.length > 0 ? data[0] : 0;
        const header = headers.get(headerId);
        const buf = buffers.get(headerId);
        if (header && buf) {
          segments.push({ itag: header.itag, durationMs: header.durationMs, isInitSeg: header.isInitSeg, sequenceNumber: header.sequenceNumber, data: sabrConcat(buf) });
        }
        headers.delete(headerId);
        buffers.delete(headerId);
      }
    }

    return segments;
  }

  function sabrParseRedirect(data) {
    const f = sabrParseProtoVarintFields(data);
    const urlBytes = f[1];
    return urlBytes instanceof Uint8Array ? new TextDecoder().decode(urlBytes) : null;
  }

  function sabrParseNextRequestPolicy(data) {
    const f = sabrParseProtoVarintFields(data);
    return { backoffTimeMs: f[4] || 0, playbackCookie: f[7] instanceof Uint8Array ? f[7] : null };
  }

  // --- Core SABR Methods ---

  async function streamSabrFormat({ serverAbrStreamingUrl, videoPlaybackUstreamerConfig, itag, isAudio = false, videoItag = null, audioItag = null, playerTimeMs = 0, videoDurationMs = 0, maxRequests = 1, signal, onChunk, onTotalDuration }) {
    const yt = window.$nuxt ? window.$nuxt.$youtube : null;
    const innertube = yt ? await yt.getAPI() : null;
    const clientName = innertube?.context?.client?.clientName || 'WEB';
    const clientVersion = innertube?.context?.client?.clientVersion || '2.20240101.00.00';

    let url = serverAbrStreamingUrl;
    let rn = 1;
    let redirectCount = 0;
    let emptyCount = 0;
    let playbackCookieBytes = null;
    let currentPlayerTimeMs = playerTimeMs;
    let totalDurationMs = videoDurationMs || 0;
    let totalDurationFromFim = false;
    let initAppended = false;
    let lastSequenceNumber = -1;

    for (let i = 0; i < maxRequests; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const body = sabrBuildRequest({ ustreamerConfigB64: videoPlaybackUstreamerConfig, clientName, clientVersion, itag, playerTimeMs: currentPlayerTimeMs, playbackCookieBytes, isAudio, videoItag, audioItag });
      const rawBytes = await sabrFetch(url, body, rn++, signal);
      const parts = [...sabrParseUMP(rawBytes)];
      const redirectPart = parts.find(p => p.partId === 43);
      if (redirectPart) {
        if (++redirectCount > 10) throw new Error('SABR_TOO_MANY_REDIRECTS');
        const newUrl = sabrParseRedirect(redirectPart.data);
        if (newUrl) { url = newUrl; rn = 1; }
        continue;
      } else {
        redirectCount = 0;
      }
      const errorPart = parts.find(p => p.partId === 44);
      if (errorPart) throw new Error('SABR_ERROR');

      if (!totalDurationFromFim) {
        const fimPart = parts.find(p => p.partId === 42);
        if (fimPart) {
          const f = sabrParseProtoVarintFields(fimPart.data);
          const units = f[9] || 0;
          const scale = f[10] || 1;
          if (units > 0 && scale > 0) {
            totalDurationMs = Math.round(units / (scale / 1000));
            totalDurationFromFim = true;
            console.log('[SABR] itag', itag, 'totalDurationMs:', totalDurationMs, 'units:', units, 'scale:', scale);
            onTotalDuration?.(totalDurationMs);
          }
        }
      }
      const policyPart = parts.find(p => p.partId === 35);
      if (policyPart) {
        const policy = sabrParseNextRequestPolicy(policyPart.data);
        if (policy.playbackCookie) playbackCookieBytes = policy.playbackCookie;
        if (policy.backoffTimeMs > 0) await new Promise(r => setTimeout(r, policy.backoffTimeMs));
      }
      const segments = sabrExtractMedia(parts, itag);
      const relevant = segments.filter(s => s.itag === itag);
      let newMediaAppended = false;
      for (const seg of relevant) {
        if (seg.isInitSeg) {
          if (initAppended) continue;
          initAppended = true;
        } else {
          if (seg.sequenceNumber !== undefined && seg.sequenceNumber <= lastSequenceNumber) {
            console.log('[SABR] itag', itag, 'skipping duplicate segment seq:', seg.sequenceNumber, 'lastSeq:', lastSequenceNumber);
            continue;
          }
          if (seg.sequenceNumber !== undefined) {
            lastSequenceNumber = seg.sequenceNumber;
          }
        }
        if (currentPlayerTimeMs === 0 && seg.durationMs > 0) console.log('[SABR] itag', itag, 'first seg durationMs:', seg.durationMs);
        currentPlayerTimeMs += seg.durationMs;
        await onChunk(seg.data, seg.durationMs);
        newMediaAppended = true;
      }
      if (!newMediaAppended) {
        if (++emptyCount >= 5) break;
      } else {
        emptyCount = 0;
      }
      if (totalDurationMs > 0 && currentPlayerTimeMs >= totalDurationMs) {
        console.log('[SABR] itag', itag, 'done: currentPlayerTimeMs', currentPlayerTimeMs, '>= totalDurationMs', totalDurationMs);
        break;
      }
    }
  }

  async function downloadSabrFormat({ serverAbrStreamingUrl, videoPlaybackUstreamerConfig, itag, maxRequests = 20 }) {
    const yt = window.$nuxt ? window.$nuxt.$youtube : null;
    const innertube = yt ? await yt.getAPI() : null;
    const clientName = innertube?.context?.client?.clientName || 'WEB';
    const clientVersion = innertube?.context?.client?.clientVersion || '2.20240101.00.00';

    let url = serverAbrStreamingUrl;
    let rn = 1;
    let emptyCount = 0;
    let redirectCount = 0;
    let playbackCookieBytes = null;
    let playerTimeMs = 0;
    let totalDurationMs = 0;
    const allSegments = [];

    for (let i = 0; i < maxRequests; i++) {
      const body = sabrBuildRequest({
        ustreamerConfigB64: videoPlaybackUstreamerConfig,
        clientName,
        clientVersion,
        itag,
        playerTimeMs,
        playbackCookieBytes,
      });

      const rawBytes = await sabrFetch(url, body, rn++);
      const parts = [...sabrParseUMP(rawBytes)];

      const redirectPart = parts.find(p => p.partId === 43);
      if (redirectPart) {
        if (++redirectCount > 10) throw new Error('SABR_TOO_MANY_REDIRECTS');
        const newUrl = sabrParseRedirect(redirectPart.data);
        if (newUrl) { url = newUrl; rn = 1; }
        continue;
      }
      redirectCount = 0;

      const errorPart = parts.find(p => p.partId === 44);
      if (errorPart) throw new Error('SABR_ERROR');

      if (totalDurationMs === 0) {
        const fimPart = parts.find(p => p.partId === 42);
        if (fimPart) {
          const f = sabrParseProtoVarintFields(fimPart.data);
          const units = f[9] || 0;
          const scale = f[10] || 1;
          if (units > 0 && scale > 0) totalDurationMs = Math.round(units / (scale / 1000));
        }
      }

      const policyPart = parts.find(p => p.partId === 35);
      if (policyPart) {
        const policy = sabrParseNextRequestPolicy(policyPart.data);
        if (policy.playbackCookie) playbackCookieBytes = policy.playbackCookie;
        if (policy.backoffTimeMs > 0) await new Promise(r => setTimeout(r, policy.backoffTimeMs));
      }

      const segments = sabrExtractMedia(parts, itag);
      for (const seg of segments) playerTimeMs += seg.durationMs;
      allSegments.push(...segments);

      const hasMedia = segments.length > 0;
      if (!hasMedia) {
        if (++emptyCount >= 3) break;
      } else {
        emptyCount = 0;
      }

      if (totalDurationMs > 0 && playerTimeMs >= totalDurationMs) break;
    }

    return sabrConcat(allSegments.map(s => s.data));
  }

  // --- Player-level State Machine Orchestrators ---

  function _sabrStartMse(component, mediaSource, mimeType, streamParams, signal, existingSourceBuffer = null) {
    const sourceBuffer = existingSourceBuffer || mediaSource.addSourceBuffer(mimeType);
    if (!existingSourceBuffer) {
      if (streamParams.isAudio) {
        component.audioSourceBuffer = sourceBuffer;
        component.audioMediaSource = mediaSource;
      } else {
        component.videoSourceBuffer = sourceBuffer;
        component.videoMediaSource = mediaSource;
      }
    }
    let appendQueue = Promise.resolve();
    let isWaiting = false;

    const appendChunk = (data) => {
      appendQueue = appendQueue.then(async () => {
        if (signal?.aborted) { throw new DOMException('Aborted', 'AbortError'); }

        const el = component.$refs[streamParams.isAudio ? 'audio' : 'player'];
        if (el) {
          while (true) {
            if (signal?.aborted) { throw new DOMException('Aborted', 'AbortError'); }
            let bufferAhead = 0;
            const time = el.currentTime;
            const buf = el.buffered;
            for (let i = 0; i < buf.length; i++) {
              if (time >= buf.start(i) && time <= buf.end(i)) {
                bufferAhead = buf.end(i) - time;
                break;
              }
            }
            if (isWaiting) {
              if (bufferAhead < 5) {
                isWaiting = false;
                break;
              }
            } else {
              if (bufferAhead >= 25) {
                isWaiting = true;
              } else {
                break;
              }
            }
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        }

        return new Promise((resolve, reject) => {
          if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
          sourceBuffer.timestampOffset = 0;
          const onEnd = () => { sourceBuffer.removeEventListener('updateend', onEnd); resolve(); };
          const onErr = () => { sourceBuffer.removeEventListener('error', onErr); reject(new Error('SourceBuffer append error')); };
          sourceBuffer.addEventListener('updateend', onEnd);
          sourceBuffer.addEventListener('error', onErr);
          try {
            sourceBuffer.appendBuffer(data);
          } catch (e) {
            sourceBuffer.removeEventListener('updateend', onEnd);
            sourceBuffer.removeEventListener('error', onErr);
            reject(e);
          }
        });
      });
      return appendQueue;
    };

    let chunkCount = 0;
    streamSabrFormat({
      ...streamParams,
      signal,
      maxRequests: 500,
      onTotalDuration: (ms) => {
        if (mediaSource.readyState === 'open') mediaSource.duration = ms / 1000;
      },
      onChunk: (data) => {
        chunkCount++;
        if (chunkCount <= 3) console.log('[SABR] chunk #' + chunkCount + ' itag=' + streamParams.itag + ' size=' + data.length);
        return appendChunk(data);
      },
    }).then(async () => {
      await appendQueue;
      console.log('[SABR] Stream done, itag:', streamParams.itag, 'total chunks:', chunkCount);
      if (mediaSource.readyState === 'open') mediaSource.endOfStream();
    }).catch(e => {
      if (e.name === 'AbortError') {
        console.log('[SABR] Stream aborted, itag:', streamParams.itag);
      } else {
        console.warn('[SABR] Stream error:', e);
      }
    });
  }

  async function loadVideoViaSabr(component, selectedFormat = null, startTimeSec = 0) {
    if (component.videoAbortController) {
      component.videoAbortController.abort();
    }
    component.videoAbortController = new AbortController();
    const signal = component.videoAbortController.signal;

    component.bufferingDetected = true;
    component.lastLoadingStarted = Date.now();
    const wasPlaying = component.wasPlayingBeforeSeek || (component.$refs.player && !component.$refs.player.paused);
    if (component.$refs.player) component.$refs.player.pause();
    if (component.$refs.audio) component.$refs.audio.pause();

    let bestVideo = selectedFormat;
    if (!bestVideo) {
      const videoSFromStorage = localStorage.getItem("videoQuality") || null;
      const videoCodecFromStorage = localStorage.getItem("videoCodec") || null;
      if (videoSFromStorage || videoCodecFromStorage) {
        bestVideo = component.sources.find(s =>
          s.mimeType?.includes('video') &&
          (videoCodecFromStorage ? s.mimeType.includes(videoCodecFromStorage) : true) &&
          (videoSFromStorage ? s.qualityLabel?.includes(videoSFromStorage) : true)
        );
      }
      if (!bestVideo) {
        bestVideo = component.sources.find(s => s.mimeType?.includes('video') && s.qualityLabel) || component.sources[0];
      }
    }
    if (!bestVideo) return;

    const mimeType = bestVideo.mimeType || 'video/mp4; codecs="avc1.42E01E"';
    console.log('[SABR] Video: itag', bestVideo.itag, 'mimeType:', mimeType, 'supported:', MediaSource.isTypeSupported(mimeType));
    if (!window.MediaSource || !MediaSource.isTypeSupported(mimeType)) {
      console.warn('[SABR] MSE not supported for video, skipping');
      return;
    }

    const isSameFormat = component.currentVideoFormat && component.currentVideoFormat.itag === bestVideo.itag;
    component.currentVideoFormat = bestVideo;

    if (
      isSameFormat &&
      component.videoMediaSource &&
      component.videoMediaSource.readyState === 'open' &&
      component.videoSourceBuffer
    ) {
      console.log('[SABR] Video reuse existing MediaSource for seek to:', startTimeSec);
      try {
        component.videoSourceBuffer.abort();
      } catch (e) {
        console.warn('[SABR] Video abort error:', e);
      }

      const prevTime = startTimeSec;

      if (component.$refs.player) {
        if (component.$refs.player.currentTime !== prevTime) {
          component.isInternalSeek = true;
        }
        component.$refs.player.currentTime = prevTime;
      }

      const audioItag = component.currentAudioFormat?.itag || component.audioSources[0]?.itag;
      const durationSec = component.video.metadata?.lengthSeconds ? parseFloat(component.video.metadata.lengthSeconds) : 0;

      _sabrStartMse(component, component.videoMediaSource, mimeType, {
        serverAbrStreamingUrl: component.video.metadata.serverAbrStreamingUrl,
        videoPlaybackUstreamerConfig: component.video.metadata.ustreamerConfig,
        itag: bestVideo.itag,
        isAudio: false,
        videoItag: bestVideo.itag,
        audioItag: audioItag,
        playerTimeMs: Math.round(prevTime * 1000),
        videoDurationMs: Math.round(durationSec * 1000),
      }, signal, component.videoSourceBuffer);

      const elapsed = Date.now() - component.lastLoadingStarted;
      const delay = Math.max(0, 1000 - elapsed);
      setTimeout(() => {
        if (wasPlaying) {
          if (component.$refs.player) component.$refs.player.play().catch(() => {});
          if (component.$refs.audio) component.$refs.audio.play().catch(() => {});
        }
        component.bufferingDetected = false;
        component.wasPlayingBeforeSeek = false;
      }, delay);

      return;
    }

    try {
      const mediaSource = new MediaSource();

      const waitForOpen = new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('sourceopen timeout')), 10000);
        const onOpen = () => { clearTimeout(t); resolve(); };
        mediaSource.addEventListener('sourceopen', onOpen, { once: true });
        signal.addEventListener('abort', () => {
          clearTimeout(t);
          mediaSource.removeEventListener('sourceopen', onOpen);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });

      const objectUrl = URL.createObjectURL(mediaSource);
      const prevTime = startTimeSec;

      component.vidSrc = objectUrl;
      await component.$nextTick();
      if (component.$refs.player) {
        component.$refs.player.src = objectUrl;
        component.$refs.player.load();
      }

      await waitForOpen;
      if (signal.aborted) return;
      console.log('[SABR] Video sourceopen OK');

      if (component.video.metadata?.lengthSeconds) {
        try {
          mediaSource.duration = parseFloat(component.video.metadata.lengthSeconds);
        } catch (e) {
          console.warn('[SABR] Failed to set initial MediaSource duration:', e);
        }
      }

      if (component.$refs.player) {
        if (component.$refs.player.currentTime !== prevTime) {
          component.isInternalSeek = true;
        }
        component.$refs.player.currentTime = prevTime;
      }

      const audioItag = component.currentAudioFormat?.itag || component.audioSources[0]?.itag;
      const durationSec = component.video.metadata?.lengthSeconds ? parseFloat(component.video.metadata.lengthSeconds) : 0;

      _sabrStartMse(component, mediaSource, mimeType, {
        serverAbrStreamingUrl: component.video.metadata.serverAbrStreamingUrl,
        videoPlaybackUstreamerConfig: component.video.metadata.ustreamerConfig,
        itag: bestVideo.itag,
        isAudio: false,
        videoItag: bestVideo.itag,
        audioItag: audioItag,
        playerTimeMs: Math.round(prevTime * 1000),
        videoDurationMs: Math.round(durationSec * 1000),
      }, signal);

      const elapsed = Date.now() - component.lastLoadingStarted;
      const delay = Math.max(0, 1000 - elapsed);
      setTimeout(() => {
        if (wasPlaying) {
          if (component.$refs.player) component.$refs.player.play().catch(() => {});
          if (component.$refs.audio) component.$refs.audio.play().catch(() => {});
        }
        component.bufferingDetected = false;
        component.wasPlayingBeforeSeek = false;
      }, delay);
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('[SABR] Video load aborted');
      } else {
        console.warn('[SABR] Video MSE failed:', e);
      }
    }
  }

  async function loadAudioViaSabr(component, selectedFormat = null, startTimeSec = 0) {
    if (component.audioAbortController) {
      component.audioAbortController.abort();
    }
    component.audioAbortController = new AbortController();
    const signal = component.audioAbortController.signal;

    component.bufferingDetected = true;
    component.lastLoadingStarted = Date.now();
    const wasPlaying = component.wasPlayingBeforeSeek || (component.$refs.player && !component.$refs.player.paused);
    if (component.$refs.player) component.$refs.player.pause();
    if (component.$refs.audio) component.$refs.audio.pause();

    let bestAudio = selectedFormat;
    if (!bestAudio) {
      const audioSFromStorage = localStorage.getItem("audioQuality") || null;
      const audioTrackIdFromStorage = localStorage.getItem("audioTrackId") || null;
      if (audioTrackIdFromStorage) {
        bestAudio = component.audioSources.find(s => s.audioTrack?.id === audioTrackIdFromStorage);
      }
      if (!bestAudio && audioSFromStorage) {
        bestAudio = component.audioSources.find(s => s.itag.toString() === audioSFromStorage);
      }
      if (!bestAudio) {
        bestAudio = component.audioSources.find(s => s.mimeType?.includes('opus') && s.audioQuality !== 'AUDIO_QUALITY_LOW') ||
          component.audioSources.find(s => s.audioQuality !== 'AUDIO_QUALITY_LOW') ||
          component.audioSources[0];
      }
    }
    if (!bestAudio) return;

    const mimeType = bestAudio.mimeType || 'audio/webm; codecs="opus"';
    console.log('[SABR] Audio: itag', bestAudio.itag, 'mimeType:', mimeType, 'supported:', MediaSource.isTypeSupported(mimeType));
    if (!window.MediaSource || !MediaSource.isTypeSupported(mimeType)) {
      console.warn('[SABR] MSE not supported for audio, skipping');
      return;
    }

    const isSameFormat = component.currentAudioFormat && component.currentAudioFormat.itag === bestAudio.itag;
    component.currentAudioFormat = bestAudio;

    if (
      isSameFormat &&
      component.audioMediaSource &&
      component.audioMediaSource.readyState === 'open' &&
      component.audioSourceBuffer
    ) {
      console.log('[SABR] Audio reuse existing MediaSource for seek to:', startTimeSec);
      try {
        component.audioSourceBuffer.abort();
      } catch (e) {
        console.warn('[SABR] Audio abort error:', e);
      }

      const prevTime = startTimeSec;

      if (component.$refs.audio) {
        component.$refs.audio.currentTime = prevTime;
      }

      const videoItag = component.currentVideoFormat?.itag || component.sources[0]?.itag;
      const durationSec = component.video.metadata?.lengthSeconds ? parseFloat(component.video.metadata.lengthSeconds) : 0;

      _sabrStartMse(component, component.audioMediaSource, mimeType, {
        serverAbrStreamingUrl: component.video.metadata.serverAbrStreamingUrl,
        videoPlaybackUstreamerConfig: component.video.metadata.ustreamerConfig,
        itag: bestAudio.itag,
        isAudio: true,
        videoItag: videoItag,
        audioItag: bestAudio.itag,
        playerTimeMs: Math.round(prevTime * 1000),
        videoDurationMs: Math.round(durationSec * 1000),
      }, signal, component.audioSourceBuffer);

      const elapsed = Date.now() - component.lastLoadingStarted;
      const delay = Math.max(0, 1000 - elapsed);
      setTimeout(() => {
        if (wasPlaying) {
          if (component.$refs.player) component.$refs.player.play().catch(() => {});
          if (component.$refs.audio) component.$refs.audio.play().catch(() => {});
        }
        component.bufferingDetected = false;
        component.wasPlayingBeforeSeek = false;
      }, delay);

      return;
    }

    try {
      const mediaSource = new MediaSource();

      const waitForOpen = new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('sourceopen timeout')), 10000);
        const onOpen = () => { clearTimeout(t); resolve(); };
        mediaSource.addEventListener('sourceopen', onOpen, { once: true });
        signal.addEventListener('abort', () => {
          clearTimeout(t);
          mediaSource.removeEventListener('sourceopen', onOpen);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });

      const objectUrl = URL.createObjectURL(mediaSource);
      const prevTime = startTimeSec;

      component.audSrc = objectUrl;
      await component.$nextTick();
      if (component.$refs.audio) {
        component.$refs.audio.src = objectUrl;
        component.$refs.audio.load();
      }

      await waitForOpen;
      if (signal.aborted) return;
      console.log('[SABR] Audio sourceopen OK');

      if (component.video.metadata?.lengthSeconds) {
        try {
          mediaSource.duration = parseFloat(component.video.metadata.lengthSeconds);
        } catch (e) {
          console.warn('[SABR] Failed to set initial MediaSource duration:', e);
        }
      }

      if (component.$refs.audio) {
        component.$refs.audio.currentTime = prevTime;
      }

      const videoItag = component.currentVideoFormat?.itag || component.sources[0]?.itag;
      const durationSec = component.video.metadata?.lengthSeconds ? parseFloat(component.video.metadata.lengthSeconds) : 0;

      _sabrStartMse(component, mediaSource, mimeType, {
        serverAbrStreamingUrl: component.video.metadata.serverAbrStreamingUrl,
        videoPlaybackUstreamerConfig: component.video.metadata.ustreamerConfig,
        itag: bestAudio.itag,
        isAudio: true,
        videoItag: videoItag,
        audioItag: bestAudio.itag,
        playerTimeMs: Math.round(prevTime * 1000),
        videoDurationMs: Math.round(durationSec * 1000),
      }, signal);

      const elapsed = Date.now() - component.lastLoadingStarted;
      const delay = Math.max(0, 1000 - elapsed);
      setTimeout(() => {
        if (wasPlaying) {
          if (component.$refs.player) component.$refs.player.play().catch(() => {});
          if (component.$refs.audio) component.$refs.audio.play().catch(() => {});
        }
        component.bufferingDetected = false;
        component.wasPlayingBeforeSeek = false;
      }, delay);
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('[SABR] Audio load aborted');
      } else {
        console.warn('[SABR] Audio MSE failed:', e);
      }
    }
  }

// --- Exported SABR Module ---
const sabr = {
  streamSabrFormat,
  downloadSabrFormat,
  _sabrStartMse,
  loadVideoViaSabr,
  loadAudioViaSabr,
};

export default sabr;
