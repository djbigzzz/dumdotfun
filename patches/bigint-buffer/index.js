'use strict';

function toBigIntLE(buf) {
  const reversed = Buffer.from(buf);
  reversed.reverse();
  const hex = reversed.toString('hex');
  if (hex.length === 0) return BigInt(0);
  return BigInt(`0x${hex}`);
}

function toBigIntBE(buf) {
  const hex = buf.toString('hex');
  if (hex.length === 0) return BigInt(0);
  return BigInt(`0x${hex}`);
}

function toBufferLE(num, width) {
  const hex = num.toString(16);
  const buffer = Buffer.from(
    hex.padStart(width * 2, '0').slice(0, width * 2),
    'hex'
  );
  buffer.reverse();
  return buffer;
}

function toBufferBE(num, width) {
  const hex = num.toString(16);
  return Buffer.from(
    hex.padStart(width * 2, '0').slice(0, width * 2),
    'hex'
  );
}

module.exports = { toBigIntLE, toBigIntBE, toBufferLE, toBufferBE };
