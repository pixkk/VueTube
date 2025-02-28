// Collection of functions that are useful but non-specific to any particular files

function getBetweenStrings(data, start_string, end_string) {
  const regex = new RegExp(
    `${escapeRegExp(start_string)}(.*?)${escapeRegExp(end_string)}`,
    "s"
  );
  const match = data.match(regex);
  return match ? match[1] : undefined;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function getCpn() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let result = "";
  for (let i = 16; i > 0; --i)
    result += chars[Math.round(Math.random() * (chars.length - 1))];
  return result;
}

function getMutationByKey(key, mutations) {
  if (!key || !mutations) return undefined;
  return mutations.find((mutation) => mutation.entityKey === key).payload;
}

function setHttp(link) {
  if (link.search(/^http[s]?\:\/\//) == -1) {
    link = "http://" + link;
  }
  return link;
}

// Replace inputted html with tweemoji
function parseEmoji(body) {
  try {

    if (twemoji)
      return twemoji.parse(body, {
        folder: "svg",
        ext: ".svg",
        base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
      });
  }catch (e) {

  }
}

// Function to convert seconds to VTT timestamp format
function secondsToVTTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.round((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}
// Function to convert miliseconds to VTT timestamp format
function millisecondsToVttTime(duration) {
  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((duration % (1000 * 60)) / 1000);
  const milliseconds = duration % 1000;

  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');
  const formattedMilliseconds = milliseconds.toString().padStart(3, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}.${formattedMilliseconds}`;
}
function decodeHtmlEntities(str) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<!doctype html><body>${str}`, 'text/html');
  return doc.body.textContent || '';
}

// Function to parse transcript and convert to VTT
function convertTranscriptToVTT(transcript) {
  let isOkay = true;
  // transcript =JSON.parse(JSON.stringify(transcript)).data;
  // console.warn(transcript);
  // Extract <text> elements from the transcript
  let textElements = transcript.match(/<text start="([\d.]+)" dur="([\d.]+)">([^<]+)<\/text>/g);
if (textElements == null) {
  isOkay = false;
  textElements = transcript.match(/<p t="([\d.]+)" d="([\d.]+)" wp="[\d.]+" ws="[\d.]+">([^<]+)<\/p>/g);
  if (textElements == null) {
    textElements = transcript.match(/<p t="([\d.]+)" d="([\d.]+)">([^<]+)<\/p>/g);
  }
}

  // Initialize VTT output with header
  let vttOutput = 'WEBVTT\n\n';
  for (let i = 0; i < textElements.length; i++) {
    let textElement = textElements[i];
    let startMatch = textElement.match(/start="([\d.]+)"/);
    if (startMatch == null) {
      startMatch = textElement.match(/t="([\d.]+)"/)
    }
    let durMatch = textElement.match(/dur="([\d.]+)"/);

    if (durMatch == null) {
      durMatch = textElement.match(/d="([\d.]+)"/)
    }
    let contentMatch = textElement.match(/>([^<]+)<\/text>/);
    if (contentMatch == null) {
      contentMatch = textElement.match(/>([^<]+)<\/p>/)
    }

    if (startMatch && durMatch && contentMatch) {
      let start;
      let duration;
      if (isOkay) {
        start = parseFloat(startMatch[1]);
        duration = parseFloat(durMatch[1]);
      }
      else {
        start = parseInt(startMatch[1]);
        duration = parseInt(durMatch[1]);
      }
      let content = decodeHtmlEntities(contentMatch[1].replace(/\+/g, ' ')); // Decode HTML entities

      let end;
      if (i+1 >= textElements.length) {
        end = start + duration;
      }
      else {
        end = textElements[i+1].match(/start="([\d.]+)"/);
        if (end == null) {
          end = textElements[i+1].match(/t="([\d.]+)"/);
        }
        end = end[1];
      }
      let startTime;
      let endTime;
      if (isOkay) {
        startTime = secondsToVTTTime(start);
        endTime = secondsToVTTTime(end);
      }
      else {
        startTime = millisecondsToVttTime(start);
        endTime = millisecondsToVttTime(end);
      }

      vttOutput += `${startTime} --> ${endTime}\n\n\n`; // margin bottom huh
      vttOutput += `${startTime} --> ${endTime}\n${content}\n\n`;
      // console.log(vttOutput);
    }
  }
  return vttOutput.trim();
}

function linkParser(url) {
  let result;
  if (url) {
    try {
      const slug = new URL(setHttp(url));
      const host = slug.hostname.toLowerCase().replace(/^(www|m)\./, "");
      if (host == "youtube.com") {
        result = slug;
      } else if (host == "youtu.be") {
        result = new URL("/watch", window.location.origin);
        result.searchParams.set("v", slug.pathname.split("/")[1]);
      }
    } finally {
      return result instanceof URL ? result : false;
    }
  }
}
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function humanFileSize(size) {
  var i = Math.floor( Math.log(size) / Math.log(1024) );
  return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};

module.exports = {
  getBetweenStrings,
  hexToRgb,
  rgbToHex,
  getCpn,
  getMutationByKey,
  linkParser,
  delay,
  parseEmoji,
  humanFileSize,
  convertTranscriptToVTT
};
