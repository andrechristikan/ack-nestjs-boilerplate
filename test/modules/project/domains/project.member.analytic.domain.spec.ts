import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { EnumRoleScope } from '@generated/prisma-client';
import { ProjectMemberAnalyticDomain } from '@modules/project/domains/project.member.analytic.domain';
import { ProjectMemberAnalyticRepository } from '@modules/project/repositories/project.member.analytic.repository';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';

describe('ProjectMemberAnalyticDomain', () => {
    const projectMemberAnalyticRepository: MockProxy<ProjectMemberAnalyticRepository> =
        mock<ProjectMemberAnalyticRepository>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const adminRole = {
        id: 'admin-role-id',
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.admin,
        name: 'Admin',
    };
    const viewerRole = {
        id: 'viewer-role-id',
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.viewer,
        name: 'Viewer',
    };

    let domain: ProjectMemberAnalyticDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectMemberAnalyticDomain,
                {
                    provide: ProjectMemberAnalyticRepository,
                    useValue: projectMemberAnalyticRepository,
                },
                { provide: RoleDomain, useValue: roleDomain },
            ],
        }).compile();

        domain = module.get(ProjectMemberAnalyticDomain);
    });

    describe('roles', () => {
        it('maps the grouped role ids to their catalog keys', async () => {
            projectMemberAnalyticRepository.groupByRole.mockResolvedValue([
                { key: adminRole.id, count: 3 },
                { key: viewerRole.id, count: 9 },
            ]);
            roleDomain.getByIds.mockResolvedValue([adminRole, viewerRole]);

            await expect(domain.roles()).resolves.toEqual([
                { role: EnumRoleProjectKey.admin, count: 3 },
                { role: EnumRoleProjectKey.viewer, count: 9 },
            ]);
            expect(roleDomain.getByIds).toHaveBeenCalledWith([
                adminRole.id,
                viewerRole.id,
            ]);
        });

        it('drops a bucket whose role id no longer resolves to a role', async () => {
            projectMemberAnalyticRepository.groupByRole.mockResolvedValue([
                { key: adminRole.id, count: 1 },
                { key: 'deleted-role-id', count: 4 },
            ]);
            roleDomain.getByIds.mockResolvedValue([adminRole]);

            await expect(domain.roles()).resolves.toEqual([
                { role: EnumRoleProjectKey.admin, count: 1 },
            ]);
        });
    });

    describe('membershipDistributionOffset', () => {
        it('forwards the pagination params and returns the repository page', async () => {
            const params = { limit: 10, skip: 0 };
            const page = {
                type: EnumPaginationType.offset as const,
                count: 0,
                perPage: 10,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            projectMemberAnalyticRepository.membershipDistributionOffset.mockResolvedValue(
                page
            );

            await expect(
                domain.membershipDistributionOffset(params)
            ).resolves.toBe(page);
            expect(
                projectMemberAnalyticRepository.membershipDistributionOffset
            ).toHaveBeenCalledWith(params);
        });
    });
});
