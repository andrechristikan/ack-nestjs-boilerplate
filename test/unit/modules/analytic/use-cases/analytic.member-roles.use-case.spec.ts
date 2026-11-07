import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticWorkspaceUserService } from '@modules/analytic/services/analytic.workspace-user.service';
import { AnalyticMemberRolesUseCase } from '@modules/analytic/use-cases/analytic.member-roles.use-case';

describe('AnalyticMemberRolesUseCase', () => {
    const analyticWorkspaceUserService: MockProxy<AnalyticWorkspaceUserService> =
        mock<AnalyticWorkspaceUserService>();

    let useCase: AnalyticMemberRolesUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticMemberRolesUseCase,
                {
                    provide: AnalyticWorkspaceUserService,
                    useValue: analyticWorkspaceUserService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticMemberRolesUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticWorkspaceUserService.memberRoles.mockResolvedValue([
                { role: 'admin', count: 2 },
            ]);

            const result = await useCase.execute('workspace-1');

            expect(result).toEqual({
                data: { roles: [{ role: 'admin', count: 2 }] },
            });
            expect(
                analyticWorkspaceUserService.memberRoles
            ).toHaveBeenCalledWith('workspace-1');
        });
    });
});
