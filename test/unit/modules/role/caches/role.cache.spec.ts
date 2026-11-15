import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RoleCache } from '@modules/role/caches/role.cache';

describe('RoleCache', () => {
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let cache: RoleCache;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'role.keyPattern': 'Role:{roleId}',
                'role.cacheTtlInMs': 3600000,
                'role.leaseKeyPattern': 'Role:Lease:{roleId}',
                'role.leaseTtlInMs': 10000,
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleCache,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        cache = module.get(RoleCache);
    });

    describe('roleTtlInMs', () => {
        it('reads the TTL from role.cacheTtlInMs', () => {
            expect(cache.roleTtlInMs).toBe(3600000);
            expect(configGet).toHaveBeenCalledWith('role.cacheTtlInMs');
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
