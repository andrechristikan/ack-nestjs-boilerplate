export interface IStubCacheClient {
    get: (key: string) => Promise<string | null>;
    set: (
        key: string,
        value: string,
        ...options: (string | number)[]
    ) => Promise<'OK' | null>;
    eval: (
        script: string,
        numKeys: number,
        ...args: string[]
    ) => Promise<unknown>;
    unlink: (...keys: string[]) => Promise<number>;
    flushdb: () => Promise<'OK'>;
    ping: () => Promise<string>;
}
