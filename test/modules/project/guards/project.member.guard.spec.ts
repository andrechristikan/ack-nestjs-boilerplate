import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
} from '@generated/prisma-client';
import {
    PolicyStoreKey,
    ProjectMemberPolicyStoreKey,
    WorkspaceMemberPolicyStoreKey,
} from '@modules/policy/constants/policy.constant';
import {
    ProjectMemberRequiredMetaKey,
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import type { IProjectMemberWithRolePolicies } from '@modules/project/interfaces/project.interface';
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
    const workspacePolicies = [
        {
            id: 'workspace-policy-id',
            roleId: 'workspace-role-id',
            subject: EnumPolicySubject.workspace,
            action: [EnumPolicyAction.read],
            createdAt: at,
            createdBy: null,
            updatedAt: at,
            updatedBy: null,
        },
    ];
    const projectPolicies = [
        {
            id: 'project-policy-id',
            roleId: 'project-role-id',
            subject: EnumPolicySubject.project,
            action: [EnumPolicyAction.read, EnumPolicyAction.update],
            createdAt: at,
            createdBy: null,
            updatedAt: at,
            updatedBy: null,
        },
    ];
    const member: IProjectMemberWithRolePolicies = {
        id: 'member-id',
        projectId: 'project-id',
        userId: 'user-id',
        roleId: 'project-role-id',
        role: {
            id: 'project-role-id',
            scope: EnumRoleScope.project,
            key: EnumRoleProjectKey.admin,
            name: 'Admin',
            description: null,
            createdAt: at,
            createdBy: null,
            updatedAt: at,
            updatedBy: null,
            policies: projectPolicies,
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
            [WorkspaceMemberPolicyStoreKey]: workspacePolicies,
        });
        reflector.get.mockReturnValue(false);
        projectMemberDomain.validateProjectMemberGuard.mockResolvedValue(null);

        await guard.canActivate(context);

        expect(reflector.get).toHaveBeenCalledWith(
            ProjectMemberRequiredMetaKey,
            handler
        );
    });

    it('stores the membership with its role stripped of policies and the policies under the project policy key alone', async () => {
        stubStore({
            [ProjectStoreKey]: { id: 'project-id' },
            [UserStoreKey]: { id: 'user-id' },
            [WorkspaceMemberPolicyStoreKey]: workspacePolicies,
        });
        reflector.get.mockReturnValue(true);
        projectMemberDomain.validateProjectMemberGuard.mockResolvedValue(
            member
        );

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(
            projectMemberDomain.validateProjectMemberGuard
        ).toHaveBeenCalledWith('project-id', 'user-id', true);
        const { policies: _policies, ...role } = member.role;
        expect(requestStoreService.set).toHaveBeenCalledWith(
            ProjectMemberStoreKey,
            { ...member, role }
        );
        expect(requestStoreService.set).toHaveBeenCalledWith(
            ProjectMemberPolicyStoreKey,
            projectPolicies
        );
        expect(requestStoreService.set).not.toHaveBeenCalledWith(
            PolicyStoreKey,
            expect.anything()
        );
        expect(requestStoreService.get).not.toHaveBeenCalledWith(
            WorkspaceMemberPolicyStoreKey
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

    it('stores nothing and leaves the workspace policies when a non-rejecting route finds no row', async () => {
        stubStore({
            [ProjectStoreKey]: { id: 'project-id' },
            [UserStoreKey]: { id: 'user-id' },
            [WorkspaceMemberPolicyStoreKey]: workspacePolicies,
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
