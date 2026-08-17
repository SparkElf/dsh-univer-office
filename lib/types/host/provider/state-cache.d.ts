/** A short-lived promise cache that coalesces concurrent reads. */
export declare class StateCache<K, V> {
    private readonly ttlMs;
    private readonly entries;
    constructor(ttlMs: number);
    /** Return a fresh cached promise or compute and cache one. */
    get(key: K, compute: () => Promise<V>): Promise<V>;
    /** Remove one entry after a mutation. */
    delete(key: K): void;
    /** Remove all cached state during disposal. */
    clear(): void;
}
//# sourceMappingURL=state-cache.d.ts.map