import { Buffer } from "buffer";

globalThis.Buffer = Buffer;

export default defineNuxtPlugin(() => {});
