import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ICacheLease } from '@common/cache/interfaces/cache.interface';

@Injectable()
export class RoleCache {
    private readonly roleKeyPattern: string;
    readonly roleTtlInMs: number;
    private readonly roleLeaseKeyPattern: string;
    private readonly roleLeaseTtlInMs: number;

    constructor(private readonly configService: ConfigService) {
        this.roleKeyPattern =
            this.configService.get<string>('role.keyPattern')!;
        this.roleTtlInMs = this.configService.get<number>('role.cacheTtlInMs')!;
        this.roleLeaseKeyPattern = this.configService.get<string>(
            'role.leaseKeyPattern'
        )!;
        this.roleLeaseTtlInMs =
            this.configService.get<number>('role.leaseTtlInMs')!;
    }

    private buildRoleLeaseKey(roleId: string): string {
        return this.roleLeaseKeyPattern.replace('{roleId}', () => roleId);
    }

    buildRoleKey(roleId: string): string {
        return this.roleKeyPattern.replace('{roleId}', () => roleId);
    }

    buildRoleLease(roleId: string): ICacheLease {
        const leaseKey = this.buildRoleLeaseKey(roleId);

        return { key: leaseKey, ttlInMs: this.roleLeaseTtlInMs };
    }

    /** The entry key and its lease key. */
    buildRoleKeys(roleId: string): string[] {
        return [this.buildRoleKey(roleId), this.buildRoleLeaseKey(roleId)];
    }
}
