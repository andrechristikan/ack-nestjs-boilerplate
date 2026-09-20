import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class RequestStoreService {
    constructor(private readonly clsService: ClsService) {}

    set<T>(key: string, value: T): void {
        this.clsService.set(key, value);
    }

    get<T>(key: string): T | null {
        const storedValue = this.clsService.get<T>(key) as T | null;

        return storedValue ?? null;
    }

    merge<T extends object>(key: string, value: Partial<T>): void {
        const storedValue = this.get<T>(key);
        const existing = storedValue ?? ({} as T);
        this.set<T>(key, { ...existing, ...value });
    }
}
