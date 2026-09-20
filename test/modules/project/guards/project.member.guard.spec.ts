import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { UserStoreKey } from '@modules/user/constants/user.constant';

describe('ProjectMemberGuard', () => {
    const projectMemberDomain = createMock<ProjectMemberDomain>();
    const requestStoreService = createMock<RequestStoreService>();
    const context = createMock<ExecutionContext>();

    beforeEach(() => vi.resetAllMocks());

    it('validates and stores the current project membership', async () => {
        const member =
            createMock<
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
        const guard = new ProjectMemberGuard(
            projectMemberDomain,
            requestStoreService
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
        const guard = new ProjectMemberGuard(
            projectMemberDomain,
            requestStoreService
        );

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
                createMock<
                    Awaited<
                        ReturnType<
                            ProjectMemberDomain['validateProjectMemberGuard']
                        >
                    >
                >()
            );
            const guard = new ProjectMemberGuard(
                projectMemberDomain,
                requestStoreService
            );

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(
                projectMemberDomain.validateProjectMemberGuard
            ).toHaveBeenCalledWith(...expected);
        }
    );
});
