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
    getdel: (key: string) => Promise<string | null>;
    unlink: (...keys: string[]) => Promise<number>;
    ping: () => Promise<string>;
}
