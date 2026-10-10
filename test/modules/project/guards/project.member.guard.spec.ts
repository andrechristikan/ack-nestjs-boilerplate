import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumRoleScope } from '@generated/prisma-client';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import {
    ProjectMemberRequiredMetaKey,
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import type { IProjectMemberWithRole } from '@modules/project/interfaces/project.interface';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';
import { UserStoreKey } from '@modules/user/constants/user.constant';

describe('ProjectMemberGuard', () => {
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const handler = vi.fn();
    const at = new Date('2026-01-01T00:00:00.000Z');
    const member: IProjectMemberWithRole = {
        id: 'member-id',
        projectId: 'project-id',
        userId: 'user-id',
        roleId: 'project-role-id',
        role: {
            id: 'project-role-id',
            scope: EnumRoleScope.project,
            key: EnumRoleProjectKey.admin,
            name: 'Admin',
        },
        joinedAt: at,
        createdAt: at,
        createdBy: null,
        updatedAt: at,
        updatedBy: null,
    };

    let guard: ProjectMemberGuard;

    function stubStore(store: Record<string, unknown>): void {
        requestStoreService.get.mockImplementation((key: unknown) => {
            return store[key as string];
        });
    }

    beforeEach(async () => {
        vi.resetAllMocks();
        context.getHandler.mockReturnValue(handler);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectMemberGuard,
                { provide: ProjectMemberDomain, useValue: projectMemberDomain },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: Reflector, useValue: reflector },
            ],
        }).compile();

        guard = module.get(ProjectMemberGuard);
    });

    it('reads the required flag from the handler metadata', async () => {
        stubStore({
            [ProjectStoreKey]: { id: 'project-id' },
            [UserStoreKey]: { id: 'user-id' },
        });
        reflector.get.mockReturnValue(false);
        projectMemberDomain.validateProjectMemberGuard.mockResolvedValue(null);

        await guard.canActivate(context);

        expect(reflector.get).toHaveBeenCalledWith(
            ProjectMemberRequiredMetaKey,
            handler
        );
    });

    it('stores the membership with its role and nothing else', async () => {
        stubStore({
            [ProjectStoreKey]: { id: 'project-id' },
            [UserStoreKey]: { id: 'user-id' },
        });
        reflector.get.mockReturnValue(true);
        projectMemberDomain.validateProjectMemberGuard.mockResolvedValue(
            member
        );

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(
            projectMemberDomain.validateProjectMemberGuard
        ).toHaveBeenCalledWith('project-id', 'user-id', true);
        expect(requestStoreService.set).toHaveBeenCalledTimes(1);
        expect(requestStoreService.set).toHaveBeenCalledWith(
            ProjectMemberStoreKey,
            member
        );
        expect(requestStoreService.get).not.toHaveBeenCalledWith(
            PolicyAbilityStoreKey
        );
    });

    it('treats a missing metadata value as strict', async () => {
        stubStore({
            [ProjectStoreKey]: { id: 'project-id' },
            [UserStoreKey]: { id: 'user-id' },
        });
        reflector.get.mockReturnValue(undefined);
        projectMemberDomain.validateProjectMemberGuard.mockResolvedValue(
            member
        );

        await guard.canActivate(context);

        expect(
            projectMemberDomain.validateProjectMemberGuard
        ).toHaveBeenCalledWith('project-id', 'user-id', true);
    });

    it('stores nothing and lets the caller through when a non-rejecting route finds no row', async () => {
        stubStore({
            [ProjectStoreKey]: { id: 'project-id' },
            [UserStoreKey]: { id: 'user-id' },
        });
        reflector.get.mockReturnValue(false);
        projectMemberDomain.validateProjectMemberGuard.mockResolvedValue(null);

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(
            projectMemberDomain.validateProjectMemberGuard
        ).toHaveBeenCalledWith('project-id', 'user-id', false);
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });

    it('propagates the domain rejection unchanged and publishes nothing', async () => {
        const error = new Error('not a project member');
        stubStore({
            [ProjectStoreKey]: { id: 'project-id' },
            [UserStoreKey]: { id: 'user-id' },
        });
        reflector.get.mockReturnValue(true);
        projectMemberDomain.validateProjectMemberGuard.mockRejectedValue(error);

        await expect(guard.canActivate(context)).rejects.toBe(error);
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });

    it.each([
        {
            name: 'the store is empty',
            project: undefined,
            user: undefined,
            expected: [null, null, true],
        },
        {
            name: 'only the project is stored',
            project: { id: 'project-id' },
            user: undefined,
            expected: ['project-id', null, true],
        },
        {
            name: 'only the user is stored',
            project: undefined,
            user: { id: 'user-id' },
            expected: [null, 'user-id', true],
        },
    ])(
        'passes null for the missing identifier when $name',
        async ({ project, user, expected }) => {
            stubStore({
                [ProjectStoreKey]: project,
                [UserStoreKey]: user,
            });
            reflector.get.mockReturnValue(true);
            projectMemberDomain.validateProjectMemberGuard.mockResolvedValue(
                member
            );

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(
                projectMemberDomain.validateProjectMemberGuard
            ).toHaveBeenCalledWith(...expected);
        }
    );
});
