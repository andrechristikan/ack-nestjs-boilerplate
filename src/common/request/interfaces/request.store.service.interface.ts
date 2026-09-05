export interface IRequestStoreService {
    set<T>(key: string, value: T): void;
    get<T>(key: string): T | null;
    merge<T extends object>(key: string, value: Partial<T>): void;
}
