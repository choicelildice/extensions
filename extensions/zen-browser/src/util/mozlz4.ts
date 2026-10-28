/**
 * Minimal, defensive decoder for Mozilla's `mozLz40` container: an 8-byte magic,
 * a little-endian uint32 of the decompressed size, then one raw LZ4 block.
 *
 * The file is read from the Zen profile and could be truncated, corrupt or
 * replaced by another process, so every field is validated and every index is
 * bounds-checked. Malformed input throws instead of hanging or over-allocating.
 */

export const MOZLZ4_MAGIC = "mozLz40\0";
const HEADER_LENGTH = 12;

/** Zen's session file is a few MB at most; anything near this is corrupt. */
export const MAX_DECOMPRESSED_BYTES = 256 * 1024 * 1024;

export function decodeMozLz4(buffer: Buffer): Buffer {
  if (buffer.length < HEADER_LENGTH) {
    throw new Error("mozLz4: file is too short to contain a header.");
  }
  if (buffer.toString("latin1", 0, MOZLZ4_MAGIC.length) !== MOZLZ4_MAGIC) {
    throw new Error("mozLz4: invalid magic header.");
  }
  const originalLength = buffer.readUInt32LE(8);
  if (originalLength > MAX_DECOMPRESSED_BYTES) {
    throw new Error(`mozLz4: declared size ${originalLength} exceeds the ${MAX_DECOMPRESSED_BYTES} byte limit.`);
  }
  const output = Buffer.alloc(originalLength);
  const written = decodeLz4Block(buffer.subarray(HEADER_LENGTH), output);
  return output.subarray(0, written);
}

/** Decodes one raw LZ4 block into `output`, returning the number of bytes written. */
export function decodeLz4Block(input: Buffer, output: Buffer): number {
  const n = input.length;
  let i = 0;
  let j = 0;

  const readLength = (base: number): number => {
    let length = base;
    if (base === 15) {
      let b: number;
      do {
        if (i >= n) throw new Error("LZ4: truncated length sequence.");
        b = input[i++];
        length += b;
      } while (b === 255);
    }
    return length;
  };

  while (i < n) {
    const token = input[i++];

    const literalsLength = readLength(token >> 4);
    if (i + literalsLength > n) throw new Error("LZ4: literals run past end of input.");
    if (j + literalsLength > output.length) throw new Error("LZ4: literals exceed declared output size.");
    input.copy(output, j, i, i + literalsLength);
    i += literalsLength;
    j += literalsLength;

    if (i >= n) break; // Last sequence carries literals only.

    if (i + 2 > n) throw new Error("LZ4: truncated match offset.");
    const offset = input[i++] | (input[i++] << 8);
    if (offset === 0 || offset > j) throw new Error("LZ4: invalid match offset.");

    const matchLength = readLength(token & 0x0f) + 4;
    if (j + matchLength > output.length) throw new Error("LZ4: match exceeds declared output size.");
    let pos = j - offset;
    const end = j + matchLength;
    while (j < end) output[j++] = output[pos++];
  }

  return j;
}
