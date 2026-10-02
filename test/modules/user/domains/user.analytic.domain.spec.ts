import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumRoleScope } from '@generated/prisma-client/client';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserAnalyticRepository } from '@modules/user/repositories/user.analytic.repository';

describe('UserAnalyticDomain', () => {
    const userAnalyticRepository: MockProxy<UserAnalyticRepository> =
        mock<UserAnalyticRepository>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();

    let domain: UserAnalyticDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserAnalyticDomain,
                {
                    provide: UserAnalyticRepository,
                    useValue: userAnalyticRepository,
                },
                { provide: RoleDomain, useValue: roleDomain },
            ],
        }).compile();
        domain = moduleRef.get(UserAnalyticDomain);
    });

    describe('groupByRole', () => {
        it('replaces the role id of each bucket with the role key', async () => {
            userAnalyticRepository.groupByRole.mockResolvedValue([
                { key: 'admin-role-id', count: 2 },
                { key: 'user-role-id', count: 7 },
            ]);
            roleDomain.getByIds.mockResolvedValue([
                {
                    id: 'admin-role-id',
                    scope: EnumRoleScope.platform,
                    key: EnumRolePlatformKey.admin,
                    name: 'Admin',
                },
                {
                    id: 'user-role-id',
                    scope: EnumRoleScope.platform,
                    key: EnumRolePlatformKey.user,
                    name: 'User',
                },
            ]);

            await expect(domain.groupByRole()).resolves.toEqual([
                { key: EnumRolePlatformKey.admin, count: 2 },
                { key: EnumRolePlatformKey.user, count: 7 },
            ]);
            expect(roleDomain.getByIds).toHaveBeenCalledWith([
                'admin-role-id',
                'user-role-id',
            ]);
        });

        it('drops a bucket whose role no longer resolves', async () => {
            userAnalyticRepository.groupByRole.mockResolvedValue([
                { key: 'missing-role-id', count: 1 },
            ]);
            roleDomain.getByIds.mockResolvedValue([]);

            await expect(domain.groupByRole()).resolves.toEqual([]);
        });

        it('returns no buckets when no user holds a role', async () => {
            userAnalyticRepository.groupByRole.mockResolvedValue([]);
            roleDomain.getByIds.mockResolvedValue([]);

            await expect(domain.groupByRole()).resolves.toEqual([]);
        });
    });
});
