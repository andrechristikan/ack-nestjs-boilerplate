import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    IAnalyticProjectCount,
    IAnalyticRoleCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { ProjectMemberAnalyticDomain } from '@modules/project/domains/project.member.analytic.domain';
import { ProjectMemberAnalyticRepository } from '@modules/project/repositories/project.member.analytic.repository';

describe('ProjectMemberAnalyticDomain', () => {
    const projectMemberAnalyticRepository: MockProxy<ProjectMemberAnalyticRepository> =
        mock<ProjectMemberAnalyticRepository>();
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
            ],
        }).compile();
        domain = module.get(ProjectMemberAnalyticDomain);
    });

    describe('getMembershipDistributionOffset', () => {
        it('delegates to the repository with the given pagination params', async () => {
            const params: IPaginationQueryOffsetParams<Prisma.ProjectMemberWhereInput> =
                { where: {}, orderBy: [], limit: 20, skip: 0 };
            const page: IResponsePaginationReturn<IAnalyticProjectCount> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [{ projectId: '507f1f77bcf86cd799439011', count: 4 }],
            };
            projectMemberAnalyticRepository.groupMembershipDistributionOffset.mockResolvedValue(
                page
            );

            const result = await domain.getMembershipDistributionOffset(params);

            expect(result).toBe(page);
            expect(
                projectMemberAnalyticRepository.groupMembershipDistributionOffset
            ).toHaveBeenCalledWith(params);
        });
    });

    describe('getRoles', () => {
        it('delegates to the repository role grouping', async () => {
            const roles: IAnalyticRoleCount[] = [{ role: 'admin', count: 2 }];
            projectMemberAnalyticRepository.groupByRole.mockResolvedValue(
                roles
            );

            const result = await domain.getRoles();

            expect(result).toBe(roles);
            expect(
                projectMemberAnalyticRepository.groupByRole
            ).toHaveBeenCalledWith();
        });
    });
});
