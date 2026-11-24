import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ICacheLease } from '@common/cache/interfaces/cache.interface';

@Injectable()
export class RoleCache {
    private readonly keyPattern: string;
    readonly cacheTtlInMs: number;
    private readonly leaseKeyPattern: string;
    private readonly leaseTtlInMs: number;

    constructor(private readonly configService: ConfigService) {
        this.keyPattern = this.configService.get<string>('role.keyPattern')!;
        this.cacheTtlInMs =
            this.configService.get<number>('role.cacheTtlInMs')!;
        this.leaseKeyPattern = this.configService.get<string>(
            'role.leaseKeyPattern'
        )!;
        this.leaseTtlInMs =
            this.configService.get<number>('role.leaseTtlInMs')!;
    }

    private buildRoleLeaseKey(roleId: string): string {
        return this.leaseKeyPattern.replace('{roleId}', () => roleId);
    }

    buildRoleKey(roleId: string): string {
        return this.keyPattern.replace('{roleId}', () => roleId);
    }

    buildRoleLease(roleId: string): ICacheLease {
        const leaseKey = this.buildRoleLeaseKey(roleId);

        return { key: leaseKey, ttlInMs: this.leaseTtlInMs };
    }

    buildRoleKeys(roleId: string): string[] {
        return [this.buildRoleKey(roleId), this.buildRoleLeaseKey(roleId)];
    }
}
