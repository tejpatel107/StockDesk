import { LRUCache } from "lru-cache";

export const cache = new LRUCache<string, unknown>({
  max: 5,              
  ttl: 60 * 1000
});
