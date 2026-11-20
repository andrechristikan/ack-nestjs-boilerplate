import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { MockProxy } from 'vitest-mock-extended';
import { RoleCache } from '@modules/role/caches/role.cache';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('RoleCache', () => {
    let configService: MockProxy<ConfigService>;

    let cache: RoleCache;

    beforeEach(async () => {
        configService = buildConfigService({
            'role.keyPattern': 'Role:{roleId}',
            'role.cacheTtlInMs': 3600000,
            'role.leaseKeyPattern': 'Role:Lease:{roleId}',
            'role.leaseTtlInMs': 10000,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleCache,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        cache = module.get(RoleCache);
    });

    describe('cacheTtlInMs', () => {
        it('reads the TTL from role.cacheTtlInMs', () => {
            expect(cache.cacheTtlInMs).toBe(3600000);
            expect(configService.get).toHaveBeenCalledWith('role.cacheTtlInMs');
        });
    });

    describe('buildRoleKey', () => {
        it('builds the entry key', () => {
            expect(cache.buildRoleKey('role-1')).toBe('Role:role-1');
        });
    });

    describe('buildRoleLease', () => {
        it('builds the lease', () => {
            expect(cache.buildRoleLease('role-1')).toEqual({
                key: 'Role:Lease:role-1',
                ttlInMs: 10000,
            });
        });
    });

    describe('buildRoleKeys', () => {
        it('returns the entry and lease keys', () => {
            expect(cache.buildRoleKeys('role-1')).toEqual([
                'Role:role-1',
                'Role:Lease:role-1',
            ]);
        });
    });
});
