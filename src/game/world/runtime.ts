import { createEntityId, type EntityId, type EntityState, type PositionComponent } from '../entity';
import { CHUNK_SIZE, chunkKey, ChunkCache, tileKey, worldToChunk, worldToLocalTile, type ChunkCoord, type ChunkKey, type ChunkGenerator, type GeneratedChunk, defaultChunkGenerator } from './chunks';
import type { WorldState } from '../types';