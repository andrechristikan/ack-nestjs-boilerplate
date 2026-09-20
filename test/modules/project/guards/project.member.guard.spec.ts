import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { UserStoreKey } from '@modules/user/constants/user.constant';

describe('ProjectMemberGuard', () => {
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();

    let guard: ProjectMemberGuard;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectMemberGuard,
                { provide: ProjectMemberDomain, useValue: projectMemberDomain },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        guard = module.get(ProjectMemberGuard);
    });

    it('validates and stores the current project membership', async () => {
        const member =
            mock<
                Awaited<
                    ReturnType<
                        ProjectMemberDomain['validateProjectMemberGuard']
                    >
                >
            >();
        requestStoreService.get.mockImplementation(key => {
            if (key === ProjectStoreKey) return { id: 'project-id' };
            if (key === UserStoreKey) return { id: 'user-id' };
            return undefined;
        });
        projectMemberDomain.validateProjectMemberGuard.mockResolvedValue(
            member
        );

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(
            projectMemberDomain.validateProjectMemberGuard
        ).toHaveBeenCalledWith('project-id', 'user-id');
        expect(requestStoreService.set).toHaveBeenCalledWith(
            ProjectMemberStoreKey,
            member
        );
    });

    it('propagates the domain rejection unchanged and publishes nothing', async () => {
        const error = new Error('not a project member');
        requestStoreService.get.mockImplementation(key => {
            if (key === ProjectStoreKey) return { id: 'project-id' };
            if (key === UserStoreKey) return { id: 'user-id' };
            return undefined;
        });
        projectMemberDomain.validateProjectMemberGuard.mockRejectedValue(error);

        await expect(guard.canActivate(context)).rejects.toBe(error);
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });

    it.each([
        {
            name: 'the store is empty',
            project: undefined,
            user: undefined,
            expected: [null, null],
        },
        {
            name: 'only the project is stored',
            project: { id: 'project-id' },
            user: undefined,
            expected: ['project-id', null],
        },
        {
            name: 'only the user is stored',
            project: undefined,
            user: { id: 'user-id' },
            expected: [null, 'user-id'],
        },
    ])(
        'passes null for the missing identifier when $name',
        async ({ project, user, expected }) => {
            requestStoreService.get.mockImplementation(key => {
                if (key === ProjectStoreKey) return project;
                if (key === UserStoreKey) return user;
                return undefined;
            });
            projectMemberDomain.validateProjectMemberGuard.mockResolvedValue(
                mock<
                    Awaited<
                        ReturnType<
                            ProjectMemberDomain['validateProjectMemberGuard']
                        >
                    >
                >()
            );

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(
                projectMemberDomain.validateProjectMemberGuard
            ).toHaveBeenCalledWith(...expected);
        }
    );
});
