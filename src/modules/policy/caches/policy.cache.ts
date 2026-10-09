import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import type { IPolicyRule } from '@modules/policy/interfaces/policy.interface';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';

/** Read-through cache over the raw policy rows of one role. */
@Injectable()
export class PolicyCache {
    private readonly logger = new Logger(PolicyCache.name);
    private readonly keyPattern: string;
    private readonly cacheTtlInMs: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        private readonly policyRepository: PolicyRepository,
        private readonly configService: ConfigService
    ) {
        this.keyPattern = this.configService.get<string>('policy.keyPattern')!;
        this.cacheTtlInMs = this.configService.get<number>(
            'policy.cacheTtlInMs'
        )!;
    }

    private toKey(roleId: string): string {
        return this.keyPattern.replace('{roleId}', () => roleId);
    }

    /** Returns the cached rules of the roles that hit; a role that missed is absent from the map. */
    async getCacheByRoleIds(
        roleIds: string[]
    ): Promise<Map<string, IPolicyRule[]>> {
        try {
            const cached = await this.cacheManager.mget<IPolicyRule[]>(
                roleIds.map(roleId => this.toKey(roleId))
            );
            return new Map(
                roleIds.flatMap((roleId, index) =>
                    cached[index] ? [[roleId, cached[index]]] : []
                )
            );
        } catch (error: unknown) {
            this.logger.error(error, 'Policy cache read failed');
            return new Map();
        }
    }

    async setCacheByRoleIds(
        policiesByRoleId: Map<string, IPolicyRule[]>
    ): Promise<void> {
        try {
            await this.cacheManager.mset(
                [...policiesByRoleId].map(([roleId, policies]) => ({
                    key: this.toKey(roleId),
                    value: policies,
                    ttl: this.cacheTtlInMs,
                }))
            );
        } catch (error: unknown) {
            this.logger.error(error, 'Policy cache write failed');
        }
    }

    /** Loads the roles in one query. A role with no policies maps to an empty list. */
    private async loadByRoleIds(
        roleIds: string[]
    ): Promise<Map<string, IPolicyRule[]>> {
        const policies = await this.policyRepository.findManyByRoleIds(roleIds);
        const byRoleId = Map.groupBy(policies, policy => policy.roleId);

        return new Map(
            roleIds.map(roleId => [roleId, byRoleId.get(roleId) ?? []])
        );
    }

    /** Deletes the role key. A failure rejects: a policy is authority, so a stale entry would keep a revoked grant working until the TTL. */
    async deleteCacheByRoleId(roleId: string): Promise<void> {
        await this.cacheManager.del(this.toKey(roleId));
    }

    /**
     * Read-through cache for many roles: one cache read for every role, one repository query for
     * the roles that missed, one cache write for what that query loaded. A role with no policies
     * is cached as an empty list.
     */
    async getByRoleIdsAndCache(roleIds: string[]): Promise<IPolicyRule[]> {
        const uniqueRoleIds = [...new Set(roleIds)];
        const hits = await this.getCacheByRoleIds(uniqueRoleIds);
        const missedRoleIds = uniqueRoleIds.filter(roleId => !hits.has(roleId));

        if (missedRoleIds.length === 0) {
            return uniqueRoleIds.flatMap(roleId => hits.get(roleId)!);
        }

        const loaded = await this.loadByRoleIds(missedRoleIds);
        await this.setCacheByRoleIds(loaded);

        return uniqueRoleIds.flatMap(
            roleId => hits.get(roleId) ?? loaded.get(roleId)!
        );
    }
}
