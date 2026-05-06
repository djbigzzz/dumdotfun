import { writeFileSync, existsSync, unlinkSync, rmSync, mkdirSync, cpSync, lstatSync } from 'fs';
import { join } from 'path';

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

const patchedPackageJson = JSON.stringify({
  name: "bigint-buffer",
  version: "1.2.0",
  description: "Pure JS replacement for bigint-buffer — no native bindings, eliminates GHSA-3gc7-fjrx-p6mg buffer overflow",
  main: "index.js",
  license: "MIT"
}, null, 2) + '\n';

const patchSrc = join(process.cwd(), 'patches', 'bigint-buffer');

const targets = [
  join(process.cwd(), 'node_modules', 'bigint-buffer'),
  join(process.cwd(), 'node_modules', '@solana', 'buffer-layout-utils', 'patches', 'bigint-buffer'),
];

for (const targetDir of targets) {
  let lst = null;
  try { lst = lstatSync(targetDir); } catch {}
  if (lst && lst.isSymbolicLink() && !existsSync(targetDir)) {
    unlinkSync(targetDir);
    lst = null;
  }
  if (lst && existsSync(targetDir)) {
    const targetFile = join(targetDir, 'dist', 'node.js');
    if (existsSync(join(targetDir, 'dist'))) {
      writeFileSync(targetFile, pureJS);
    }

    const bindingGyp = join(targetDir, 'binding.gyp');
    if (existsSync(bindingGyp)) unlinkSync(bindingGyp);

    const srcDir = join(targetDir, 'src');
    if (existsSync(srcDir)) rmSync(srcDir, { recursive: true, force: true });

    writeFileSync(join(targetDir, 'package.json'), patchedPackageJson);

    console.log(`Patched bigint-buffer at ${targetDir}`);
  } else {
    mkdirSync(targetDir, { recursive: true });
    cpSync(patchSrc, targetDir, { recursive: true });
    writeFileSync(join(targetDir, 'package.json'), patchedPackageJson);
    console.log(`Created bigint-buffer patch at ${targetDir}`);
  }
}
