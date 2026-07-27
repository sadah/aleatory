export interface WorkCoreOptions<P> {
  /** Canvas backing-store edge in px. All geometry derives from this. */
  size: number;
  seed: number;
  params?: Partial<P>;
}

export interface WorkCore<P> {
  /** Rebuild seed-derived state. Idempotent. */
  build(): void;
  /** Fixed-timestep render — same contract as today's renderFrame(n). */
  renderFrame(n: number): void;
  /** Merge params, doing any structural rebuild the change requires. */
  setParams(next: Partial<P>): void;
  /** Re-resolve every palette-derived colour. */
  refreshPalette(): void;
  /** The overlay string. Returned, not written — the core must not touch DOM. */
  getStatusText(n: number): string;
  /** Frames per seamless loop, or null when the work has no cycle. */
  getCycleFrames(): number | null;
  /** Release typed arrays and Path2Ds. */
  destroy(): void;
}
