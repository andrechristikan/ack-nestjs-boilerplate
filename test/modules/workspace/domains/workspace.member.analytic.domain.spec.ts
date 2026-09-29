import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    IAnalyticRoleCount,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceMemberAnalyticDomain } from '@modules/workspace/domains/workspace.member.analytic.domain';
import { WorkspaceMemberAnalyticRepository } from '@modules/workspace/repositories/workspace.member.analytic.repository';

describe('WorkspaceMemberAnalyticDomain', () => {
    const workspaceMemberAnalyticRepository: MockProxy<WorkspaceMemberAnalyticRepository> =
        mock<WorkspaceMemberAnalyticRepository>();
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
            ],
        }).compile();

        domain = module.get(WorkspaceMemberAnalyticDomain);
    });

    describe('roles', () => {
        it('delegates to the repository role grouping', async () => {
            const rows: IAnalyticRoleCount[] = [{ role: 'admin', count: 2 }];
            workspaceMemberAnalyticRepository.groupByRole.mockResolvedValue(
                rows
            );

            const result = await domain.roles('workspace-1');

            expect(result).toBe(rows);
            expect(
                workspaceMemberAnalyticRepository.groupByRole
            ).toHaveBeenCalledWith('workspace-1');
        });

        it('accepts a null workspace id', async () => {
            workspaceMemberAnalyticRepository.groupByRole.mockResolvedValue([]);

            await domain.roles(null);

            expect(
                workspaceMemberAnalyticRepository.groupByRole
            ).toHaveBeenCalledWith(null);
        });
    });

    describe('countByWorkspace', () => {
        it('delegates to the repository member count', async () => {
            workspaceMemberAnalyticRepository.countByWorkspace.mockResolvedValue(
                6
            );

            const result = await domain.countByWorkspace('workspace-1');

            expect(result).toBe(6);
            expect(
                workspaceMemberAnalyticRepository.countByWorkspace
            ).toHaveBeenCalledWith('workspace-1');
        });
    });

    describe('membershipDistributionOffset', () => {
        it('delegates to the repository offset membership distribution', async () => {
            const params: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput> =
                { limit: 20, skip: 0, orderBy: [] };
            const page: IResponsePaginationReturn<IAnalyticWorkspaceCount> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [{ workspaceId: 'workspace-1', count: 3 }],
            };
            workspaceMemberAnalyticRepository.membershipDistributionOffset.mockResolvedValue(
                page
            );

            const result = await domain.membershipDistributionOffset(params);

            expect(result).toBe(page);
            expect(
                workspaceMemberAnalyticRepository.membershipDistributionOffset
            ).toHaveBeenCalledWith(params);
        });
    });
});
