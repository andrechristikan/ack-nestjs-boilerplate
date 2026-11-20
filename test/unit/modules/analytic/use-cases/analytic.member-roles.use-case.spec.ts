import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticWorkspaceService } from '@modules/analytic/services/analytic.workspace.service';
import { AnalyticMemberRolesUseCase } from '@modules/analytic/use-cases/analytic.member-roles.use-case';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import {
    buildWorkspace,
    buildWorkspaceMember,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('AnalyticMemberRolesUseCase', () => {
    const workspaceContext = buildWorkspaceContext(
        buildWorkspace(),
        buildWorkspaceMember('user-1', EnumWorkspaceMemberRole.admin)
    );
    const analyticWorkspaceService: MockProxy<AnalyticWorkspaceService> =
        mock<AnalyticWorkspaceService>();

    let useCase: AnalyticMemberRolesUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticMemberRolesUseCase,
                {
                    provide: AnalyticWorkspaceService,
                    useValue: analyticWorkspaceService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticMemberRolesUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticWorkspaceService.memberRoles.mockResolvedValue([
                { role: 'admin', count: 2 },
            ]);

            const result = await useCase.execute(workspaceContext);

            expect(result).toEqual({
                data: { roles: [{ role: 'admin', count: 2 }] },
            });
            expect(analyticWorkspaceService.memberRoles).toHaveBeenCalledWith(
                'workspace-1'
            );
        });
    });
});
