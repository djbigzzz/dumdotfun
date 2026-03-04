import { writeFileSync, existsSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';

const targetDir = join(process.cwd(), 'node_modules', 'bigint-buffer');
const targetFile = join(targetDir, 'dist', 'node.js');

if (existsSync(targetDir)) {
  const pureJS = `'use strict';

Object.defineProperty(exports, "__esModule", { value: true });

function toBigIntLE(buf) {
    const reversed = Buffer.from(buf);
    reversed.reverse();
    const hex = reversed.toString('hex');
    if (hex.length === 0) {
        return BigInt(0);
    }
    return BigInt(\`0x\${hex}\`);
}
exports.toBigIntLE = toBigIntLE;

function toBigIntBE(buf) {
    const hex = buf.toString('hex');
    if (hex.length === 0) {
        return BigInt(0);
    }
    return BigInt(\`0x\${hex}\`);
}
exports.toBigIntBE = toBigIntBE;

function toBufferLE(num, width) {
    const hex = num.toString(16);
    const buffer = Buffer.from(hex.padStart(width * 2, '0').slice(0, width * 2), 'hex');
    buffer.reverse();
    return buffer;
}
exports.toBufferLE = toBufferLE;

function toBufferBE(num, width) {
    const hex = num.toString(16);
    return Buffer.from(hex.padStart(width * 2, '0').slice(0, width * 2), 'hex');
}
exports.toBufferBE = toBufferBE;
`;

  writeFileSync(targetFile, pureJS);

  const bindingGyp = join(targetDir, 'binding.gyp');
  if (existsSync(bindingGyp)) unlinkSync(bindingGyp);

  const srcDir = join(targetDir, 'src');
  if (existsSync(srcDir)) rmSync(srcDir, { recursive: true, force: true });

  console.log('Patched bigint-buffer: replaced native bindings with pure JS implementation');
}
