/**
 * The seeded RNG, on its own so a render core can reach it without dragging the
 * seed *UI* along.
 *
 * `seed.ts` imports `./controls` (which side-effect-imports `controls.css`) and
 * `./theme.css`. Tree-shaking drops the unused `createSeedUI`, but CSS
 * side-effect imports survive it — so a gallery that imported `makeRng` from
 * `seed.ts` would quietly pull the controls stylesheet onto the index bundle.
 * `seed.ts` re-exports both functions from here, so no existing call site had to
 * change.
 *
 * xmur3 hashes the seed to a 32-bit state; mulberry32 is the generator. Both are
 * the standard public-domain implementations.
 */

function xmur3(seed: string): () => number {
  let h = 1779033703 ^ seed.length;

  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: number): () => number {
  const seedHash = xmur3(String(seed));
  return mulberry32(seedHash());
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000);
}
