// SABR (Server Adaptive Bitrate) library

import {getContentPoToken, getPoToken} from "./potoken";
import {Capacitor, CapacitorHttp} from "@capacitor/core";

// --- SABR helper constants ---
const SABR_CLIENT_NAME_IDS = {
    WEB: 1, MWEB: 2, ANDROID: 3, IOS: 5, TVHTML5: 7,
    ANDROID_MUSIC: 21, WEB_MUSIC_EMBEDDED_PLAYER: 39,
    WEB_EMBEDDED_PLAYER: 56, WEB_CREATOR: 62, ANDROID_VR: 28,
  };

  // --- SABR module-level helpers ---

  // Resolves the app's $youtube plugin instance from the Vue component passed
  // to the orchestrators below (Nuxt 4 exposes plugin-provided properties on
  // Options API components the same way Nuxt 2 does, so component.$youtube
  // works here without needing a window.$nuxt global).
  function _getYoutubePlugin(component) {
    if (component && component.$youtube) return component.$youtube;
    if (typeof window !== 'undefined' && window.$nuxt && window.$nuxt.$youtube) return window.$nuxt.$youtube;
    return null;
  }

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

  function sabrPbFormatId(fieldNumber, itag, xtags) {
    const parts = [sabrPbVarint(1, itag)];
    if (xtags) parts.push(sabrPbString(3, xtags));
    return sabrPbLenDelim(fieldNumber, sabrConcat(parts));
  }

  // Same as sabrPbFormatId but with field 2 (lmt — the format's lastModified value from
  // the /player response), matching the real client's preferred_*_format_ids entries,
  // confirmed via mitmproxy capture of an actual browser SABR request: {1: itag, 2: lmt,
  // 3: xtags} repeated once per available format (not just the one being downloaded).
  function sabrPbFormatIdWithLmt(fieldNumber, itag, lmt, xtags) {
    const parts = [sabrPbVarint(1, itag)];
    if (lmt) parts.push(sabrPbVarint(2, lmt));
    if (xtags) parts.push(sabrPbString(3, xtags));
    return sabrPbLenDelim(fieldNumber, sabrConcat(parts));
  }

  // Encode a video_streaming.BufferedRange message.
  // Tells the SABR server which media we already have so it streams from the
  // requested player_time_ms instead of re-sending everything before it.
  //   field 1: format_id { itag, xtags }
  //   field 2: start_time_ms (int64)
  //   field 3: duration_ms (int64)
  //   field 4: start_segment_index (int32)
  //   field 5: end_segment_index (int32)
  //   field 6: time_range { start_ticks(1), duration_ticks(2), timescale(3) }
  function sabrPbBufferedRange({ itag, xtags = '', startTimeMs = 0, durationMs, startSegmentIndex = 1, endSegmentIndex }) {
    const timeRange = sabrConcat([
      sabrPbVarint(1, startTimeMs),
      sabrPbVarint(2, durationMs),
      sabrPbVarint(3, 1000),
    ]);
    const parts = [
      sabrPbFormatId(1, itag, xtags),
      sabrPbVarint(2, startTimeMs),
      sabrPbVarint(3, durationMs),
      sabrPbVarint(4, startSegmentIndex),
      sabrPbVarint(5, endSegmentIndex),
      sabrPbLenDelim(6, timeRange),
    ];
    return sabrConcat(parts);
  }

  function sabrBase64Decode(str) {
    const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
  }

  // Encode a StreamerContext.SabrContext entry (field 5, repeated): { 1: type, 2: value }.
  function sabrPbSabrContextEntry(type, valueBytes) {
    const inner = sabrConcat([
      sabrPbVarint(1, type),
      valueBytes && valueBytes.length ? sabrPbLenDelim(2, valueBytes) : new Uint8Array(0),
    ]);
    return sabrPbLenDelim(5, inner);
  }

  function sabrBuildRequest({ ustreamerConfigB64, clientName, clientVersion, itag, playerTimeMs = 0, playbackCookieBytes = null, poToken = null, isAudio = false, videoItag = null, audioItag = null, videoXtags = '', audioXtags = '', combined = false, bufferedRanges = [], hl = 'en', osName = 'Windows', osVersion = '10.0', allAudioFormats = null, allVideoFormats = null, sabrContexts = [] }) {
    const ustreamerBytes = sabrBase64Decode(ustreamerConfigB64);

    const isAudioFormat = typeof isAudio === 'boolean' ? isAudio : [139, 140, 141, 171, 172, 249, 250, 251, 256, 258, 327, 338].includes(itag);

    // field 1: client_abr_state
    //   field 28: player_time_ms (int64)
    //   field 40: enabled_track_types_bitfield — 0 for combined, 1 for AUDIO_ONLY, 2 for VIDEO_ONLY
    const trackTypesBit = combined ? 0 : (isAudioFormat ? 1 : 2);
    const clientAbrStateInner = sabrConcat([
      sabrPbVarint(28, playerTimeMs),
      sabrPbVarint(40, trackTypesBit),
    ]);
    const clientAbrState = sabrPbLenDelim(1, clientAbrStateInner);

    // field 2: selected_format_ids { field 1: itag, field 3: xtags }
    // In combined mode include both audio and video formatIds
    let formatIdsBytes;
    if (combined && audioItag && videoItag) {
      formatIdsBytes = sabrConcat([
        sabrPbFormatId(2, audioItag, audioXtags),
        sabrPbFormatId(2, videoItag, videoXtags),
      ]);
    } else {
      const xtags = isAudioFormat ? audioXtags : videoXtags;
      formatIdsBytes = sabrPbFormatId(2, itag, xtags);
    }

    // field 3: buffered_ranges — media the client already has; makes the server
    // start streaming at player_time_ms instead of from the start of the gap.
    const bufferedRangesBytes = bufferedRanges.length
      ? sabrConcat(bufferedRanges.map(br => sabrPbLenDelim(3, sabrPbBufferedRange(br))))
      : new Uint8Array(0);

    // field 4: player_time_ms (int64)
    const playerTime = sabrPbVarint(4, playerTimeMs);

    // field 5: video_playback_ustreamer_config (bytes)
    const ustreamerField = sabrPbLenDelim(5, ustreamerBytes);

    // field 16: preferred_audio_format_ids { 1: itag, 2: lmt, 3: xtags } (repeated)
    // field 17: preferred_video_format_ids { 1: itag, 2: lmt, 3: xtags } (repeated)
    // Real clients list every available format (not just the one being requested), each
    // with its lmt (the format's lastModified from the /player response) — confirmed via
    // mitmproxy capture of an actual browser SABR request.
    const preferredFormats = [];
    if (allAudioFormats && allAudioFormats.length) {
      for (const f of allAudioFormats) {
        preferredFormats.push(sabrPbFormatIdWithLmt(16, f.itag, f.lastModified, f.xtags || ''));
      }
    } else {
      const finalAudioItag = audioItag || (isAudioFormat ? itag : null);
      if (finalAudioItag) {
        preferredFormats.push(sabrPbFormatId(16, finalAudioItag, audioXtags));
      }
    }
    if (allVideoFormats && allVideoFormats.length) {
      for (const f of allVideoFormats) {
        preferredFormats.push(sabrPbFormatIdWithLmt(17, f.itag, f.lastModified, f.xtags || ''));
      }
    } else {
      const finalVideoItag = videoItag || (!isAudioFormat ? itag : null);
      if (finalVideoItag) {
        preferredFormats.push(sabrPbFormatId(17, finalVideoItag, videoXtags));
      }
    }
    const preferredFormat = sabrConcat(preferredFormats);

    // field 19: streamer_context {
    //   field 1: client_info { 1: hl, 12: deviceMake, 13: deviceModel, 16: client_name,
    //                           17: client_version, 18: osName, 19: osVersion }
    //   field 2: po_token (bytes) — sits between client_info(1) and playback_cookie(3)
    //   field 3: playback_cookie (bytes, from previous NextRequestPolicy)
    // }
    // Field numbers confirmed against the real player's base.js (v4/YY4 serializers).
    const clientNameId = SABR_CLIENT_NAME_IDS[clientName] || 1;
    const clientInfo = sabrConcat([
      sabrPbString(1, hl),
      sabrPbVarint(16, clientNameId),
      sabrPbString(17, clientVersion),
      sabrPbString(18, osName),
      sabrPbString(19, osVersion),
    ]);
    const sabrContextEntries = sabrContexts.length
      ? sabrConcat(sabrContexts.map(c => sabrPbSabrContextEntry(c.type, c.value)))
      : new Uint8Array(0);
    const streamerContextInner = sabrConcat([
      sabrPbLenDelim(1, clientInfo),
      poToken ? sabrPbString(2, poToken) : new Uint8Array(0),
      playbackCookieBytes ? sabrPbLenDelim(3, playbackCookieBytes) : new Uint8Array(0),
      sabrContextEntries,
    ]);
    const streamerContext = sabrPbLenDelim(19, streamerContextInner);

    return sabrConcat([clientAbrState, formatIdsBytes, bufferedRangesBytes, playerTime, ustreamerField, preferredFormat, streamerContext]);
  }

  function sabrBytesToBase64(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  function sabrBase64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function sabrFetch(sabrUrl, body, requestNumber = 1, signal) {
    const url = new URL(sabrUrl);
    url.searchParams.set('rn', String(requestNumber));

    // googlevideo.com doesn't send Access-Control-Allow-Origin for this
    // app's origin, so a plain browser fetch gets blocked by CORS on native
    // platforms too (the app's WebView enforces it same as any browser).
    // CapacitorHttp bypasses that - it's a native HTTP client, not a
    // browser fetch - at the cost of needing to base64 the binary body/response.
    if (Capacitor.isNativePlatform()) {
      const resp = await CapacitorHttp.post({
        url: url.toString(),
        headers: {
          'content-type': 'application/x-protobuf',
          'accept': 'application/vnd.yt-ump',
          'accept-encoding': 'identity',
        },
        data: sabrBytesToBase64(body),
        dataType: 'file',
        responseType: 'arraybuffer',
      });
      if (resp.status < 200 || resp.status >= 300) throw new Error(`SABR HTTP ${resp.status}`);
      return sabrBase64ToBytes(resp.data);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: body,
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
    let startMs = f[11] || 0;  // field 11 = start_ms (where this segment begins on the timeline)
    const isInitSeg = !!f[8];

    if ((!durationMs || !startMs) && f[15]) {
      try {
        const tr = sabrParseProtoVarintFields(f[15]);
        const startTicks = tr[1] || 0;
        const durationTicks = tr[2] || 0;
        const timescale = tr[3] || 1000;
        if (timescale > 0) {
          if (!durationMs && durationTicks > 0) durationMs = Math.round(durationTicks / (timescale / 1000));
          if (!startMs && startTicks > 0) startMs = Math.round(startTicks / (timescale / 1000));
        }
      } catch (e) {
        console.error('[SABR] failed to parse timeRange:', e);
      }
    }

    // Live headers carry no field 12 / timeRange duration; field 21 holds it in field 7 (microseconds).
    if (!durationMs && f[21] instanceof Uint8Array) {
      const durationUs = sabrParseProtoVarintFields(f[21])[7];
      if (durationUs > 0) durationMs = Math.round(durationUs / 1000);
    }

    // Fallback for media segments to prevent infinite looping if duration is still missing
    if (!isInitSeg && !durationMs) {
      durationMs = 5000;
    }

    return { headerId: f[1] || 0, itag: f[3] || 0, sequenceNumber: f[9] || 0, startMs, durationMs, isInitSeg };
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
          segments.push({ itag: header.itag, startMs: header.startMs, durationMs: header.durationMs, isInitSeg: header.isInitSeg, sequenceNumber: header.sequenceNumber, data: sabrConcat(buf) });
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

  // StreamProtectionStatus (UMP part 58): field 1 = status, field 2 = maxRetries.
  // status 1 = ok, 2 = a real poToken is expected soon (cold-start data still allowed),
  // 3 = playback is blocked until a valid poToken is supplied.
  function sabrParseStreamProtectionStatus(data) {
    const f = sabrParseProtoVarintFields(data);
    return { status: f[1] || 0, maxRetries: f[2] || 0 };
  }

  // LiveMetadata (UMP part 31). Present only on live streams; the seekable window
  // [minSeekableMs, maxSeekableMs] is the DVR "history" the user can rewind through.
  //   field 3: head_sequence_number, field 4: head_time_ms, field 5: wall_clock_ms
  //   field 12/13: min seekable ticks / timescale, field 14/15: max seekable ticks / timescale
  function sabrParseLiveMetadata(data) {
    const f = sabrParseProtoVarintFields(data);
    const toMs = (ticks, scale) => (ticks > 0 && scale > 0 ? Math.round(ticks / (scale / 1000)) : 0);
    return {
      headSequenceNumber: f[3] || 0,
      headTimeMs: f[4] || 0,
      minSeekableMs: toMs(f[12], f[13]),
      maxSeekableMs: toMs(f[14], f[15]) || f[4] || 0,
    };
  }

  // Reacts to a StreamProtectionStatus part (id 58) inside a parsed UMP response.
  // Our /player requests currently use the ANDROID client (no poToken attached), but the
  // SABR stream session itself can still demand one. On status >= 2 we mint a content-bound
  // poToken (see lib/potoken.js) once and hand it back so the caller can stash it
  // in `state.poToken` and thread it into StreamerContext (field 2) on subsequent
  // sabrBuildRequest calls, matching how YouTube's own web client authorizes SABR requests.
  //
  // status 2 is a soft warning — the current response still carries usable media, so we just
  // carry the poToken forward for subsequent requests and keep processing this one as normal.
  // status 3 is a hard block — the current response has no usable media, so callers must
  // retry the same request slot immediately once a poToken has been minted (`retry: true`),
  // instead of treating it (or a possible accompanying SABR_ERROR part) as fatal.
  // Proactively mints a content-bound poToken before the first SABR request is sent, so it
  // rides along in StreamerContext from the start instead of only being attached reactively
  // after a StreamProtectionStatus part demands it (see sabrCheckStreamProtection below).
  async function sabrPrefetchPoToken(videoId, state) {
    if (state.poTokenAttempted || !videoId) return;
    state.poTokenAttempted = true;
    try {
      const poToken = await getContentPoToken(videoId);
      if (poToken) {
        state.poToken = poToken.replaceAll("_", "/").replaceAll("-", "+");
        console.warn('[SABR] Pre-attached poToken to StreamerContext before first request');
      }
    } catch (e) {
      console.warn('[SABR] Failed to pre-generate poToken', e);
    }
  }

  async function sabrCheckStreamProtection(parts, videoId, state) {
    const spsPart = parts.find(p => p.partId === 58);
    if (!spsPart) return { retry: false };
    const sps = sabrParseStreamProtectionStatus(spsPart.data);

    console.warn('[SABR] StreamProtectionStatus', sps.status, 'maxRetries:', sps.maxRetries);
    // if (state.poTokenAttempted || !videoId) return { retry: false };
    // state.poTokenAttempted = true;
    // try {
    //   const poToken = await getContentPoToken(videoId);
    //   if (poToken) {
    //     state.poToken = poToken.replaceAll("_", "/").replaceAll("-", "+");
    //     console.warn('[SABR] Attached poToken to StreamerContext after StreamProtectionStatus', sps.status);
    //     return { retry: sps.status >= 3 };
    //   }
    // } catch (e) {
    //   console.warn('[SABR] Failed to generate poToken for StreamProtectionStatus', e);
    // }
    return { retry: false };
  }

  // SabrContextUpdate (UMP part 57): a keyed blob the server hands us and expects echoed
  // back on later requests (via StreamerContext.sabr_contexts) until it's superseded or
  // discarded.
  //   field 1: type (int32, the key)
  //   field 2: scope (int32 enum — PLAYBACK/REQUEST/WATCH_ENDPOINT/CONTENT_ADS)
  //   field 3: value (bytes — opaque payload we must round-trip, not interpret)
  //   field 4: send_by_default (bool)
  //   field 5: write_policy (int32 enum — 1 OVERWRITE, 2 KEEP_EXISTING)
  function sabrParseSabrContextUpdate(data) {
    const f = sabrParseProtoVarintFields(data);
    return {
      type: f[1] || 0,
      scope: f[2] || 0,
      value: f[3] instanceof Uint8Array ? f[3] : new Uint8Array(0),
      sendByDefault: !!f[4],
      writePolicy: f[5] || 0,
    };
  }

  // SabrContextSendingPolicy (UMP part 59): tells us which previously-seen context types to
  // start/stop echoing, or discard entirely. Fields are repeated int32 (type keys), which
  // may arrive either unpacked (one tag per value) or packed (length-delimited varint run),
  // so both wire types are handled here.
  function sabrParseSabrContextSendingPolicy(data) {
    const result = { startPolicy: [], stopPolicy: [], discardPolicy: [] };
    const targets = { 1: result.startPolicy, 2: result.stopPolicy, 3: result.discardPolicy };
    let offset = 0;
    while (offset < data.length) {
      const { value: tag, nextOffset: o1 } = sabrReadVarint(data, offset);
      if (o1 <= offset) break;
      const fieldNumber = tag >> 3, wireType = tag & 7;
      offset = o1;
      const arr = targets[fieldNumber];
      if (wireType === 0) {
        const { value, nextOffset } = sabrReadVarint(data, offset);
        if (nextOffset <= offset) break;
        offset = nextOffset;
        if (arr) arr.push(value);
      } else if (wireType === 2) {
        const { value: len, nextOffset } = sabrReadVarint(data, offset);
        if (nextOffset <= offset) break;
        offset = nextOffset;
        const end = offset + len;
        if (arr) {
          let po = offset;
          while (po < end) {
            const { value, nextOffset: pn } = sabrReadVarint(data, po);
            if (pn <= po) break;
            arr.push(value);
            po = pn;
          }
        }
        offset = end;
      } else break;
    }
    return result;
  }

  // Per-session store of SABR contexts: which ones we're holding and which are currently
  // enabled to be echoed back. Discarding SABR_ERROR retries (or reusing stale contexts
  // across sessions) is what produced the "malformed" SABR responses we used to hit, since
  // the server expects exactly the contexts it last told us to keep sending.
  function _sabrCreateContextState() {
    return { contexts: new Map(), enabled: new Set() };
  }

  function _sabrApplyContextUpdate(state, update) {
    const existing = state.contexts.get(update.type);
    if (update.writePolicy === 2 && existing !== undefined) return; // KEEP_EXISTING
    state.contexts.set(update.type, update.value);
    if (update.sendByDefault) state.enabled.add(update.type);
    console.log('[SABR] Context update type', update.type, 'scope', update.scope, 'sendByDefault', update.sendByDefault);
  }

  function _sabrApplySendingPolicy(state, policy) {
    for (const t of policy.startPolicy) state.enabled.add(t);
    for (const t of policy.stopPolicy) state.enabled.delete(t);
    for (const t of policy.discardPolicy) { state.contexts.delete(t); state.enabled.delete(t); }
  }

  function _sabrGetContextsToSend(state) {
    const out = [];
    for (const type of state.enabled) {
      const value = state.contexts.get(type);
      if (value !== undefined) out.push({ type, value });
    }
    return out;
  }

  // Reacts to any SabrContextUpdate (57) / SabrContextSendingPolicy (59) parts in a parsed
  // UMP response, mutating the given context state in place.
  function sabrProcessContextParts(parts, state) {
    for (const p of parts) {
      if (p.partId === 57) _sabrApplyContextUpdate(state, sabrParseSabrContextUpdate(p.data));
    }
    const policyPart = parts.find(p => p.partId === 59);
    if (policyPart) _sabrApplySendingPolicy(state, sabrParseSabrContextSendingPolicy(policyPart.data));
  }

  // PLAYBACK_START_POLICY (47) and SELECTABLE_FORMATS (51) are informational — logged
  // once per session so they're visible instead of silently dropped, but not acted upon.
  const sabrLoggedPartTypes = new Set();
  function sabrLogDiagnosticParts(parts) {
    for (const { partId } of parts) {
      if ((partId === 47 || partId === 51) && !sabrLoggedPartTypes.has(partId)) {
        sabrLoggedPartTypes.add(partId);
        const name = partId === 47 ? 'PLAYBACK_START_POLICY' : 'SELECTABLE_FORMATS';
        console.log(`[SABR] Received ${name} (part ${partId}) — informational only, not acted upon.`);
      }
    }
  }

  function sabrParseReloadPlaybackContext(data) {
    const f = sabrParseProtoVarintFields(data);
    const paramsBytes = f[1];
    if (paramsBytes instanceof Uint8Array) {
      const pf = sabrParseProtoVarintFields(paramsBytes);
      const tokenBytes = pf[1];
      if (tokenBytes instanceof Uint8Array) {
        return {
          reloadPlaybackParams: {
            token: new TextDecoder().decode(tokenBytes)
          }
        };
      }
    }
    return null;
  }

  // --- Core SABR Methods ---

  async function streamSabrFormat({ serverAbrStreamingUrl, videoPlaybackUstreamerConfig, itag, isAudio = false, videoItag = null, audioItag = null, playerTimeMs = 0, videoDurationMs = 0, maxRequests = 1, signal, onChunk, onTotalDuration, videoId = null, component = null, allAudioFormats = null, allVideoFormats = null }) {
    const yt = _getYoutubePlugin(component);
    const innertube = yt ? await yt.getAPI() : null;
    const clientName = innertube?.context?.client?.clientName || 'WEB';
    const clientVersion = innertube?.context?.client?.clientVersion || '2.20260715.04.00';
    const clientHl = innertube?.context?.client?.hl || 'en';
    const clientOsName = innertube?.context?.client?.osName || 'Windows';
    const clientOsVersion = innertube?.context?.client?.osVersion || '10.0';

    let url = serverAbrStreamingUrl;
    let rn = 1;
    let redirectCount = 0;
    let emptyCount = 0;
    let playbackCookieBytes = null;
    let currentPlayerTimeMs = playerTimeMs;
    let totalDurationMs = videoDurationMs || 0;
    let totalDurationFromFim = false;
    let initAppended = false;
    let isLive = false;
    let lastSequenceNumber = -1;
    const spsState = { poTokenAttempted: false };
    const sabrContextState = _sabrCreateContextState();
    // await sabrPrefetchPoToken(videoId, spsState);

    for (let i = 0; i < maxRequests; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const body = sabrBuildRequest({ ustreamerConfigB64: videoPlaybackUstreamerConfig, clientName, clientVersion, itag, playerTimeMs: currentPlayerTimeMs, playbackCookieBytes, poToken: spsState.poToken, isAudio, videoItag, audioItag, hl: clientHl, osName: clientOsName, osVersion: clientOsVersion, allAudioFormats, allVideoFormats, sabrContexts: _sabrGetContextsToSend(sabrContextState) });
      const rawBytes = await sabrFetch(url, body, rn++, signal);

      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const parts = [...sabrParseUMP(rawBytes)];
      sabrProcessContextParts(parts, sabrContextState);
      const spsResult = await sabrCheckStreamProtection(parts, videoId, spsState);
      sabrLogDiagnosticParts(parts);
      if (spsResult.retry) { i--; continue; }
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

      const reloadPart = parts.find(p => p.partId === 46);
      if (reloadPart) {
        const reloadContext = sabrParseReloadPlaybackContext(reloadPart.data);
        if (reloadContext && innertube && videoId) {
          console.log('[SABR] Reload player response requested by server.');
          try {
            const reloadedVidData = await innertube.getVidAsync(videoId, reloadContext);
            if (reloadedVidData && reloadedVidData.metadata) {
              const newUrl = reloadedVidData.metadata.serverAbrStreamingUrl;
              const newConfig = reloadedVidData.metadata.ustreamerConfig;
              if (newUrl) {
                console.log('[SABR] Reloaded player response successfully. Updating URLs...');
                url = newUrl;
                if (newConfig) videoPlaybackUstreamerConfig = newConfig;
                rn = 1;
                if (component && component.video && component.video.metadata) {
                  component.video.metadata.serverAbrStreamingUrl = newUrl;
                  if (newConfig) component.video.metadata.ustreamerConfig = newConfig;
                }
                continue;
              }
            }
          } catch (err) {
            console.error('[SABR] Failed to reload player response:', err);
          }
        }
      }

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
      const liveMetaPart = parts.find(p => p.partId === 31);
      if (liveMetaPart) {
        const live = sabrParseLiveMetadata(liveMetaPart.data);
        isLive = true;
        totalDurationFromFim = true;
        if (component) {
          component.liveWindow = {
            minSec: live.minSeekableMs / 1000,
            maxSec: live.maxSeekableMs / 1000,
            headSequenceNumber: live.headSequenceNumber,
          };
          if (live.maxSeekableMs - live.minSeekableMs < 1000) component.liveNoDvr = true;
        }
        onTotalDuration?.(live.maxSeekableMs);
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
      if (!isLive && totalDurationMs > 0 && currentPlayerTimeMs >= totalDurationMs) {
        console.log('[SABR] itag', itag, 'done: currentPlayerTimeMs', currentPlayerTimeMs, '>= totalDurationMs', totalDurationMs);
        break;
      }
    }
  }

  async function downloadSabrFormat({ serverAbrStreamingUrl, videoPlaybackUstreamerConfig, itag, maxRequests = 20, videoId = null, allAudioFormats = null, allVideoFormats = null }) {
    const yt = _getYoutubePlugin(null);
    const innertube = yt ? await yt.getAPI() : null;
    const clientName = innertube?.context?.client?.clientName || 'WEB';
    const clientVersion = innertube?.context?.client?.clientVersion || '2.20260715.04.00';
    const clientHl = innertube?.context?.client?.hl || 'en';
    const clientOsName = innertube?.context?.client?.osName || 'Windows';
    const clientOsVersion = innertube?.context?.client?.osVersion || '10.0';

    let url = serverAbrStreamingUrl;
    let rn = 1;
    let emptyCount = 0;
    let redirectCount = 0;
    let playbackCookieBytes = null;
    let playerTimeMs = 0;
    let totalDurationMs = 0;
    const allSegments = [];
    const spsState = { poTokenAttempted: false };
    const sabrContextState = _sabrCreateContextState();
    // await sabrPrefetchPoToken(videoId, spsState);

    for (let i = 0; i < maxRequests; i++) {
      const body = sabrBuildRequest({
        ustreamerConfigB64: videoPlaybackUstreamerConfig,
        clientName,
        clientVersion,
        itag,
        playerTimeMs,
        playbackCookieBytes,
        poToken: spsState.poToken,
        hl: clientHl,
        osName: clientOsName,
        osVersion: clientOsVersion,
        allAudioFormats,
        allVideoFormats,
        sabrContexts: _sabrGetContextsToSend(sabrContextState),
      });

      const rawBytes = await sabrFetch(url, body, rn++);
      const parts = [...sabrParseUMP(rawBytes)];
      sabrProcessContextParts(parts, sabrContextState);
      const spsResult = await sabrCheckStreamProtection(parts, videoId, spsState);
      sabrLogDiagnosticParts(parts);
      if (spsResult.retry) { i--; continue; }

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
      if (chunkCount === 0 && !signal?.aborted) {
        _sabrFallbackToDirectUrl(component, streamParams);
        return;
      }
      if (mediaSource.readyState === 'open') mediaSource.endOfStream();
    }).catch(e => {
      if (e.name === 'AbortError') {
        console.log('[SABR] Stream aborted, itag:', streamParams.itag);
      } else {
        console.warn('[SABR] Stream error:', e);
        if (chunkCount === 0 && !signal?.aborted) {
          _sabrFallbackToDirectUrl(component, streamParams);
        }
      }
    });
  }

  // SABR can end up delivering zero bytes (StreamProtectionStatus escalation, session
  // throttling, etc. — see SABR_PROTOCOL_NOTES.md) with no way for us to recover within
  // the SABR/MediaSource pipeline. When that happens, fall back to whatever direct,
  // already-deciphered progressive/adaptive URL the format carries (same mechanism the
  // non-SABR quality-switch handlers in components/Player/index.vue already use) instead
  // of leaving playback stuck.
  function _sabrFallbackToDirectUrl(component, streamParams) {
    const isAudio = !!streamParams.isAudio;
    const el = component.$refs[isAudio ? 'audio' : 'player'];
    const format = isAudio ? component.currentAudioFormat : component.currentVideoFormat;
    const url = format?.url;
    if (!el || !url) {
      console.warn('[SABR] No direct URL available to fall back to for itag', streamParams.itag);
      return;
    }
    console.warn('[SABR] Falling back to direct URL for itag', streamParams.itag);
    const time = (streamParams.playerTimeMs || 0) / 1000;
    const speed = el.playbackRate;
    el.pause();
    el.src = '';
    el.load();
    el.src = url;
    el.currentTime = time;
    el.playbackRate = speed;
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
        videoId: component.video.id,
        component: component,
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
        videoId: component.video.id,
        component: component,
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
        videoId: component.video.id,
        component: component,
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
        videoId: component.video.id,
        component: component,
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

  async function streamSabrCombined({ serverAbrStreamingUrl, videoPlaybackUstreamerConfig, audioItag, videoItag, audioXtags = '', videoXtags = '', playerTimeMs = 0, videoDurationMs = 0, maxRequests = 500, signal, onAudioChunk, onVideoChunk, onTotalDuration, onLiveStart, startAtLive = false, videoId = null, component = null, allAudioFormats = null, allVideoFormats = null }) {
    const yt = _getYoutubePlugin(component);
    const innertube = yt ? await yt.getAPI() : null;
    const clientName = innertube?.context?.client?.clientName || 'WEB';
    const clientVersion = innertube?.context?.client?.clientVersion || '2.20260715.04.00';
    const clientHl = innertube?.context?.client?.hl || 'en';
    const clientOsName = innertube?.context?.client?.osName || 'Windows';
    const clientOsVersion = innertube?.context?.client?.osVersion || '10.0';

    let url = serverAbrStreamingUrl;
    let rn = 1;
    let redirectCount = 0;
    let emptyCount = 0;
    let playbackCookieBytes = null;
    let currentPlayerTimeMs = playerTimeMs;
    let totalDurationMs = videoDurationMs || 0;
    let totalDurationFromFim = false;
    let audioInitAppended = false;
    let videoInitAppended = false;
    let isLive = false;
    let liveStartPending = startAtLive;
    let liveSnapChecked = false;
    let lastAudioSeq = -1;
    let lastVideoSeq = -1;
    const spsState = { poTokenAttempted: false };
    const sabrContextState = _sabrCreateContextState();
    // await sabrPrefetchPoToken(videoId, spsState);

    for (let i = 0; i < maxRequests; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const body = sabrBuildRequest({
        ustreamerConfigB64: videoPlaybackUstreamerConfig,
        clientName, clientVersion,
        itag: videoItag,
        playerTimeMs: currentPlayerTimeMs,
        playbackCookieBytes,
        poToken: spsState.poToken,
        isAudio: false,
        audioItag, videoItag,
        audioXtags, videoXtags,
        combined: true,
        hl: clientHl,
        osName: clientOsName,
        osVersion: clientOsVersion,
        allAudioFormats,
        allVideoFormats,
        sabrContexts: _sabrGetContextsToSend(sabrContextState),
      });
      const rawBytes = await sabrFetch(url, body, rn++, signal);

      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const parts = [...sabrParseUMP(rawBytes)];
      sabrProcessContextParts(parts, sabrContextState);
      const spsResult = await sabrCheckStreamProtection(parts, videoId, spsState);
      sabrLogDiagnosticParts(parts);
      if (spsResult.retry) { i--; continue; }

      const redirectPart = parts.find(p => p.partId === 43);
      if (redirectPart) {
        if (++redirectCount > 10) throw new Error('SABR_TOO_MANY_REDIRECTS');
        const newUrl = sabrParseRedirect(redirectPart.data);
        if (newUrl) { url = newUrl; rn = 1; }
        continue;
      } else {
        redirectCount = 0;
      }

      if (parts.find(p => p.partId === 44)) throw new Error('SABR_ERROR');

      const reloadPart = parts.find(p => p.partId === 46);
      if (reloadPart) {
        const reloadContext = sabrParseReloadPlaybackContext(reloadPart.data);
        if (reloadContext && innertube && videoId) {
          try {
            const reloadedVidData = await innertube.getVidAsync(videoId, reloadContext);
            if (reloadedVidData?.metadata) {
              const newUrl = reloadedVidData.metadata.serverAbrStreamingUrl;
              const newConfig = reloadedVidData.metadata.ustreamerConfig;
              if (newUrl) {
                url = newUrl;
                if (newConfig) videoPlaybackUstreamerConfig = newConfig;
                rn = 1;
                if (component?.video?.metadata) {
                  component.video.metadata.serverAbrStreamingUrl = newUrl;
                  if (newConfig) component.video.metadata.ustreamerConfig = newConfig;
                }
                continue;
              }
            }
          } catch (err) {
            console.error('[SABR combined] Failed to reload player response:', err);
          }
        }
      }

      if (!totalDurationFromFim) {
        const fimPart = parts.find(p => p.partId === 42);
        if (fimPart) {
          const f = sabrParseProtoVarintFields(fimPart.data);
          const units = f[9] || 0;
          const scale = f[10] || 1;
          if (units > 0 && scale > 0) {
            totalDurationMs = Math.round(units / (scale / 1000));
            totalDurationFromFim = true;
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

      const liveMetaPart = parts.find(p => p.partId === 31);
      if (liveMetaPart) {
        const live = sabrParseLiveMetadata(liveMetaPart.data);
        isLive = true;
        totalDurationFromFim = true;
        if (component) {
          component.liveWindow = {
            minSec: live.minSeekableMs / 1000,
            maxSec: live.maxSeekableMs / 1000,
            headSequenceNumber: live.headSequenceNumber,
            videoId,
          };
          if (live.maxSeekableMs - live.minSeekableMs < 1000) component.liveNoDvr = true;
        }
        onTotalDuration?.(live.maxSeekableMs);
        if (liveStartPending) {
          // The stream was opened at 0, which is the start of the broadcast. The head is only
          // known from this response, so drop its media and re-request from just behind the head.
          liveStartPending = false;
          currentPlayerTimeMs = Math.max(live.minSeekableMs, live.maxSeekableMs - 10000);
          onLiveStart?.(currentPlayerTimeMs);
          continue;
        }
      }

      // A live stream has no end, so it must not run into the request cap; abort ends it.
      if (isLive) i--;

      const segments = sabrExtractMedia(parts);
      let newMediaAppended = false;

      for (const seg of segments) {
        if (seg.itag === audioItag) {
          if (seg.isInitSeg) {
            if (audioInitAppended) continue;
            audioInitAppended = true;
          } else {
            if (seg.sequenceNumber !== undefined && seg.sequenceNumber <= lastAudioSeq) continue;
            if (seg.sequenceNumber !== undefined) lastAudioSeq = seg.sequenceNumber;
          }
          await onAudioChunk(seg.data, seg.durationMs);
          newMediaAppended = true;
        } else if (seg.itag === videoItag) {
          if (seg.isInitSeg) {
            if (videoInitAppended) continue;
            videoInitAppended = true;
          } else {
            if (seg.sequenceNumber !== undefined && seg.sequenceNumber <= lastVideoSeq) continue;
            if (seg.sequenceNumber !== undefined) lastVideoSeq = seg.sequenceNumber;
          }
          // Live streams without a DVR window ignore player_time_ms and always answer with
          // the live edge. Follow the server: move the player to where the media really is.
          if (isLive && !liveSnapChecked && !seg.isInitSeg) {
            liveSnapChecked = true;
            if (Math.abs(seg.startMs - currentPlayerTimeMs) > 15000) {
              currentPlayerTimeMs = seg.startMs;
              onLiveStart?.(seg.startMs);
            }
          }
          currentPlayerTimeMs += seg.durationMs;
          await onVideoChunk(seg.data, seg.durationMs);
          newMediaAppended = true;
        }
      }

      if (!newMediaAppended) {
        if (isLive) {
          // At the live edge there is simply nothing new yet; wait for the next segment.
          await new Promise(r => setTimeout(r, 1000));
        } else if (++emptyCount >= 5) break;
      } else {
        emptyCount = 0;
      }

      if (!isLive && totalDurationMs > 0 && currentPlayerTimeMs >= totalDurationMs) break;
    }
  }

  function _sabrStartMseCombined(component, mediaSource, videoMimeType, audioMimeType, streamParams, signal) {
    const videoSB = mediaSource.addSourceBuffer(videoMimeType);
    const audioSB = mediaSource.addSourceBuffer(audioMimeType);
    component.videoSourceBuffer = videoSB;
    component.audioSourceBuffer = audioSB;
    component.videoMediaSource = mediaSource;

    const makeAppendQueue = (sb) => {
      let queue = Promise.resolve();
      let isWaiting = false;
      return (data) => {
        queue = queue.then(async () => {
          if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
          const el = component.$refs.player;
          if (el) {
            while (true) {
              if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
              let bufferAhead = 0;
              const time = el.currentTime;
              const buf = el.buffered;
              for (let i = 0; i < buf.length; i++) {
                if (time >= buf.start(i) && time <= buf.end(i)) { bufferAhead = buf.end(i) - time; break; }
              }
              if (isWaiting) { if (bufferAhead < 5) { isWaiting = false; break; } }
              else { if (bufferAhead >= 25) { isWaiting = true; } else { break; } }
              await new Promise(r => setTimeout(r, 250));
            }
          }
          // Older WebViews (e.g. 134) can keep the buffer busy with an internal async
          // operation (such as a range removal after a duration change)
          while (sb.updating) {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
            await new Promise(r => setTimeout(r, 10));
          }
          // Evict old buffered data behind playback to prevent QuotaExceededError
          const el2 = component.$refs.player;
          if (el2 && !sb.updating) {
            const time2 = el2.currentTime;
            const buf2 = sb.buffered;
            if (buf2.length > 0 && buf2.start(0) < time2 - 30) {
              await new Promise((res, rej) => {
                const onEnd = () => { sb.removeEventListener('updateend', onEnd); res(); };
                sb.addEventListener('updateend', onEnd);
                try { sb.remove(buf2.start(0), Math.max(0, time2 - 30)); }
                catch { sb.removeEventListener('updateend', onEnd); res(); }
              });
            }
          }
          return new Promise((resolve, reject) => {
            if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
            const onEnd = () => { sb.removeEventListener('updateend', onEnd); resolve(); };
            const onErr = () => { sb.removeEventListener('error', onErr); reject(new Error('SourceBuffer append error')); };
            sb.addEventListener('updateend', onEnd);
            sb.addEventListener('error', onErr);
            try {
              if (sb.timestampOffset !== 0) sb.timestampOffset = 0;
              sb.appendBuffer(data);
            }
            catch (e) { sb.removeEventListener('updateend', onEnd); sb.removeEventListener('error', onErr); reject(e); }
          });
        });
        return queue;
      };
    };

    // Skip when it barely differs from the duration already set from lengthSeconds. A skipped value is
    // kept and retried once both buffers go idle, so a growing live duration isn't lost.
    let pendingDurationSec = null;
    const applyPendingDuration = () => {
      if (pendingDurationSec === null || mediaSource.readyState !== 'open' || videoSB.updating || audioSB.updating) return;
      let sec = pendingDurationSec;
      pendingDurationSec = null;
      // A live head segment ends past the reported seekable edge; MSE rejects a duration
      // below the highest buffered timestamp.
      for (const sb of [videoSB, audioSB]) {
        if (sb.buffered.length) sec = Math.max(sec, sb.buffered.end(sb.buffered.length - 1));
      }
      if (!(Math.abs(mediaSource.duration - sec) > 1)) return;
      try { mediaSource.duration = sec; } catch (e) { console.warn('[SABR combined] Failed to set duration:', e?.name, e?.message); }
    };
    videoSB.addEventListener('updateend', applyPendingDuration);
    audioSB.addEventListener('updateend', applyPendingDuration);

    const appendVideo = makeAppendQueue(videoSB);
    const appendAudio = makeAppendQueue(audioSB);
    let videoChunks = 0, audioChunks = 0;

    streamSabrCombined({
      ...streamParams,
      signal,
      onTotalDuration: (ms) => {
        pendingDurationSec = ms / 1000;
        applyPendingDuration();
      },
      onLiveStart: (ms) => {
        const el = component.$refs.player;
        if (!el) return;
        component.isInternalSeek = true;
        el.currentTime = ms / 1000;
      },
      onVideoChunk: (data) => { videoChunks++; return appendVideo(data); },
      onAudioChunk: (data) => { audioChunks++; return appendAudio(data); },
    }).then(async () => {
      console.log('[SABR combined] Stream done. video chunks:', videoChunks, 'audio chunks:', audioChunks);
      if (videoChunks === 0 && audioChunks === 0 && !signal?.aborted) {
        _sabrFallbackFromCombined(component, streamParams);
        return;
      }
      if (mediaSource.readyState === 'open') mediaSource.endOfStream();
    }).catch(e => {
      if (e.name === 'AbortError') {
        // A newer seek/quality-change already aborted this controller and started its own
        // session, which now owns the player. Falling back here would race that newer
        // session for the same MediaSource/SourceBuffers and is what caused playback to
        // get stuck needing a manual quality reselect — so just stop, no fallback.
        console.log('[SABR combined] Stream aborted (superseded by a newer load)');
      } else {
        console.warn('[SABR combined] Stream error:', e?.name, e?.message, e?.stack);
        if (videoChunks === 0 && audioChunks === 0 && !signal?.aborted) {
          _sabrFallbackFromCombined(component, streamParams);
        }
      }
    });
  }

  // Combined SABR (single MediaSource, two SourceBuffers on one <video>) has no simple
  // "direct URL" swap for both tracks at once. On total failure, fall back to the
  // separate dual-element SABR loaders instead — each of those has its own per-track
  // direct-URL fallback (_sabrFallbackToDirectUrl) if SABR fails for them too.
  function _sabrFallbackFromCombined(component, streamParams) {
    console.warn('[SABR combined] No data received — falling back to separate video/audio SABR streams');
    const startTimeSec = (streamParams.playerTimeMs || 0) / 1000;
    loadVideoViaSabr(component, component.currentVideoFormat, startTimeSec);
    loadAudioViaSabr(component, component.currentAudioFormat, startTimeSec);
  }

  async function loadCombinedViaSabr(component, selectedVideoFormat = null, selectedAudioFormat = null, startTimeSec = 0) {
    if (component.videoAbortController) component.videoAbortController.abort();
    if (component.audioAbortController) component.audioAbortController.abort();
    component.videoAbortController = new AbortController();
    component.audioAbortController = component.videoAbortController;
    const signal = component.videoAbortController.signal;

    component.bufferingDetected = true;
    component.lastLoadingStarted = Date.now();
    const wasPlaying = component.wasPlayingBeforeSeek || (component.$refs.player && !component.$refs.player.paused);
    if (component.$refs.player) component.$refs.player.pause();

    // Pick best video
    let bestVideo = selectedVideoFormat;
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
      if (!bestVideo) bestVideo = component.sources.find(s => s.mimeType?.includes('video') && s.qualityLabel) || component.sources[0];
    }

    // Pick best audio
    let bestAudio = selectedAudioFormat;
    if (!bestAudio) {
      const audioTrackIdFromStorage = localStorage.getItem("audioTrackId") || null;
      const audioSFromStorage = localStorage.getItem("audioQuality") || null;
      if (audioTrackIdFromStorage) bestAudio = component.audioSources.find(s => s.audioTrack?.id === audioTrackIdFromStorage);
      if (!bestAudio && audioSFromStorage) bestAudio = component.audioSources.find(s => s.itag.toString() === audioSFromStorage);
      if (!bestAudio) {
        bestAudio = component.audioSources.find(s => s.mimeType?.includes('opus') && s.audioQuality !== 'AUDIO_QUALITY_LOW') ||
          component.audioSources.find(s => s.audioQuality !== 'AUDIO_QUALITY_LOW') ||
          component.audioSources[0];
      }
    }

    if (!bestVideo || !bestAudio) {
      console.warn('[SABR combined] Missing video or audio format, falling back to separate loading');
      await Promise.all([
        loadVideoViaSabr(component, selectedVideoFormat, startTimeSec),
        loadAudioViaSabr(component, selectedAudioFormat, startTimeSec),
      ]);
      return;
    }

    const videoMimeType = bestVideo.mimeType || 'video/mp4; codecs="avc1.42E01E"';
    const audioMimeType = bestAudio.mimeType || 'audio/webm; codecs="opus"';

    if (!window.MediaSource || !MediaSource.isTypeSupported(videoMimeType) || !MediaSource.isTypeSupported(audioMimeType)) {
      console.warn('[SABR combined] MSE not supported, falling back to separate loading');
      await Promise.all([
        loadVideoViaSabr(component, selectedVideoFormat, startTimeSec),
        loadAudioViaSabr(component, selectedAudioFormat, startTimeSec),
      ]);
      return;
    }

    component.currentVideoFormat = bestVideo;
    component.currentAudioFormat = bestAudio;

    const videoXtags = bestVideo.xtags || '';
    const audioXtags = bestAudio.xtags || '';
    console.log('[SABR combined] video itag:', bestVideo.itag, 'xtags:', videoXtags, '| audio itag:', bestAudio.itag, 'xtags:', audioXtags);

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
      component.vidSrc = objectUrl;
      await component.$nextTick();
      if (component.$refs.player) {
        component.$refs.player.src = objectUrl;
        component.$refs.player.load();
      }

      await waitForOpen;
      if (signal.aborted) return;
      console.log('[SABR combined] sourceopen OK');

      const durationSec = component.video.metadata?.lengthSeconds ? parseFloat(component.video.metadata.lengthSeconds) : 0;
      if (durationSec) {
        try { mediaSource.duration = durationSec; } catch (e) {}
      }

      // Live: the window from the previous session is the best duration known until the
      // new session's own LiveMetadata arrives, and a seek target must fit inside it.
      const knownLive = component.liveWindow?.videoId === component.video.id ? component.liveWindow : null;
      if (knownLive) {
        try { mediaSource.duration = knownLive.maxSec; } catch (e) {}
      }
      const startAtLive = !!component.video.isLive && !knownLive && startTimeSec === 0;

      if (component.$refs.player && component.$refs.player.currentTime !== startTimeSec) {
        component.isInternalSeek = true;
        component.$refs.player.currentTime = startTimeSec;
      }

      _sabrStartMseCombined(component, mediaSource, videoMimeType, audioMimeType, {
        startAtLive,
        serverAbrStreamingUrl: component.video.metadata.serverAbrStreamingUrl,
        videoPlaybackUstreamerConfig: component.video.metadata.ustreamerConfig,
        audioItag: bestAudio.itag,
        videoItag: bestVideo.itag,
        audioXtags,
        videoXtags,
        playerTimeMs: Math.round(startTimeSec * 1000),
        videoDurationMs: Math.round(durationSec * 1000),
        videoId: component.video.id,
        component,
      }, signal);

      const elapsed = Date.now() - component.lastLoadingStarted;
      const delay = Math.max(0, 1000 - elapsed);
      setTimeout(() => {
        if (wasPlaying && component.$refs.player) component.$refs.player.play().catch(() => {});
        component.bufferingDetected = false;
        component.wasPlayingBeforeSeek = false;
      }, delay);
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('[SABR combined] Load aborted');
      } else {
        console.warn('[SABR combined] MSE failed:', e);
      }
    }
  }

// --- Exported SABR Module ---
const sabr = {
  streamSabrFormat,
  streamSabrCombined,
  downloadSabrFormat,
  _sabrStartMse,
  _sabrStartMseCombined,
  loadVideoViaSabr,
  loadAudioViaSabr,
  loadCombinedViaSabr,
};

export default sabr;
