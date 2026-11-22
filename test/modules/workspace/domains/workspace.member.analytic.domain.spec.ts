import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { EnumRoleScope } from '@generated/prisma-client';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';
import { WorkspaceMemberAnalyticDomain } from '@modules/workspace/domains/workspace.member.analytic.domain';
import { WorkspaceMemberAnalyticRepository } from '@modules/workspace/repositories/workspace.member.analytic.repository';

describe('WorkspaceMemberAnalyticDomain', () => {
    const workspaceMemberAnalyticRepository: MockProxy<WorkspaceMemberAnalyticRepository> =
        mock<WorkspaceMemberAnalyticRepository>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const ownerRole = {
        id: 'owner-role-id',
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.owner,
        name: 'Owner',
    };
    const memberRole = {
        id: 'member-role-id',
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.member,
        name: 'Member',
    };

    let domain: WorkspaceMemberAnalyticDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceMemberAnalyticDomain,
                {
                    provide: WorkspaceMemberAnalyticRepository,
                    useValue: workspaceMemberAnalyticRepository,
                },
                { provide: RoleDomain, useValue: roleDomain },
            ],
        }).compile();

        domain = module.get(WorkspaceMemberAnalyticDomain);
    });

    describe('roles', () => {
        it('maps the grouped role ids to their catalog keys', async () => {
            workspaceMemberAnalyticRepository.groupByRole.mockResolvedValue([
                { key: ownerRole.id, count: 2 },
                { key: memberRole.id, count: 7 },
            ]);
            roleDomain.getByIds.mockResolvedValue([ownerRole, memberRole]);

            await expect(domain.roles('workspace-id')).resolves.toEqual([
                { role: EnumRoleWorkspaceKey.owner, count: 2 },
                { role: EnumRoleWorkspaceKey.member, count: 7 },
            ]);
            expect(
                workspaceMemberAnalyticRepository.groupByRole
            ).toHaveBeenCalledWith('workspace-id');
            expect(roleDomain.getByIds).toHaveBeenCalledWith([
                ownerRole.id,
                memberRole.id,
            ]);
        });

        it('groups across every workspace when no workspace is given', async () => {
            workspaceMemberAnalyticRepository.groupByRole.mockResolvedValue([]);
            roleDomain.getByIds.mockResolvedValue([]);

            await expect(domain.roles(null)).resolves.toEqual([]);
            expect(
                workspaceMemberAnalyticRepository.groupByRole
            ).toHaveBeenCalledWith(null);
        });

        it('drops a bucket whose role id no longer resolves to a role', async () => {
            workspaceMemberAnalyticRepository.groupByRole.mockResolvedValue([
                { key: ownerRole.id, count: 1 },
                { key: 'deleted-role-id', count: 4 },
            ]);
            roleDomain.getByIds.mockResolvedValue([ownerRole]);

            await expect(domain.roles('workspace-id')).resolves.toEqual([
                { role: EnumRoleWorkspaceKey.owner, count: 1 },
            ]);
        });
    });

    describe('countByWorkspace', () => {
        it('returns the member count the repository reports', async () => {
            workspaceMemberAnalyticRepository.countByWorkspace.mockResolvedValue(
                5
            );

            await expect(domain.countByWorkspace('workspace-id')).resolves.toBe(
                5
            );
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
            workspaceMemberAnalyticRepository.membershipDistributionOffset.mockResolvedValue(
                page
            );

            await expect(
                domain.membershipDistributionOffset(params)
            ).resolves.toBe(page);
            expect(
                workspaceMemberAnalyticRepository.membershipDistributionOffset
            ).toHaveBeenCalledWith(params);
        });
    });
});
