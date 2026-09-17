import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class RequestStoreService {
    constructor(private readonly clsService: ClsService) {}

    set<T>(key: string, value: T): void {
        this.clsService.set(key, value);
    }

    get<T>(key: string): T | null {
        return (this.clsService.get<T>(key) as T | null) ?? null;
    }

    merge<T extends object>(key: string, value: Partial<T>): void {
        const existing = this.get<T>(key) ?? ({} as T);
        this.set<T>(key, { ...existing, ...value });
    }
}
