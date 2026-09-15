  private readonly loaded = new Set<ChunkKey>();
  constructor(private world: WorldState, generator: ChunkGenerator = defaultChunkGenerator) { this.cache = new ChunkCache(generator); }
  bindWorld(world: WorldState, preserveLoaded = false): void {
    const loaded = preserveLoaded ? [...this.loaded] : [];
    this.world = world;
    this.cache.clear();
    this.loaded.clear();
    for (const key of loaded) {
      const parts = key.split(',');
      const x = Number(parts[0]);
      const y = Number(parts[1]);
      if (Number.isFinite(x) && Number.isFinite(y)) this.load({ x, y });
    }
  }
  load(coord: ChunkCoord): GeneratedChunk { const key = chunkKey(coord); const chunk = this.getGenerated(coord); this.loaded.add(key); return chunk; }
  unload(coord: ChunkCoord): void { const key = chunkKey(coord); this.loaded.delete(key); this.cache.unload(coord); }
  isLoaded(coord: ChunkCoord): boolean { return this.loaded.has(chunkKey(coord)); }
  loadedKeys(): ReadonlySet<ChunkKey> { return this.loaded; }