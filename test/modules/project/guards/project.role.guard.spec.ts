import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumProjectMemberRole } from '@generated/prisma-client';
import {
    ProjectRoleMetaKey,
    ProjectStoreKey,
    ProjectWorkspaceOwnerStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectRoleGuard } from '@modules/project/guards/project.role.guard';
import { WorkspaceMemberStoreKey } from '@modules/workspace/constants/workspace.constant';

describe('ProjectRoleGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const handler = vi.fn();

    let guard: ProjectRoleGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        context.getHandler.mockReturnValue(handler);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectRoleGuard,
                { provide: Reflector, useValue: reflector },
                { provide: ProjectMemberDomain, useValue: projectMemberDomain },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        guard = module.get(ProjectRoleGuard);
    });

    it('publishes the workspace-owner bypass returned by role validation', async () => {
        const roles = [EnumProjectMemberRole.admin];
        const workspaceMember =
            mock<
                NonNullable<
                    Parameters<
                        ProjectMemberDomain['validateProjectRoleGuard']
                    >[1]
                >
            >();
        reflector.get.mockReturnValue(roles);
        requestStoreService.get.mockImplementation(key => {
            if (key === ProjectStoreKey) return { id: 'project-id' };
            if (key === WorkspaceMemberStoreKey) return workspaceMember;
            return undefined;
        });
        projectMemberDomain.validateProjectRoleGuard.mockResolvedValue(true);

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(reflector.get).toHaveBeenCalledWith(ProjectRoleMetaKey, handler);
        expect(
            projectMemberDomain.validateProjectRoleGuard
        ).toHaveBeenCalledWith('project-id', workspaceMember, roles);
        expect(requestStoreService.set).toHaveBeenCalledWith(
            ProjectWorkspaceOwnerStoreKey,
            true
        );
    });

    it('publishes false and passes when a non-owner holds an allowed role', async () => {
        const roles = [EnumProjectMemberRole.member];
        const workspaceMember =
            mock<
                NonNullable<
                    Parameters<
                        ProjectMemberDomain['validateProjectRoleGuard']
                    >[1]
                >
            >();
        reflector.get.mockReturnValue(roles);
        requestStoreService.get.mockImplementation(key => {
            if (key === ProjectStoreKey) return { id: 'project-id' };
            if (key === WorkspaceMemberStoreKey) return workspaceMember;
            return undefined;
        });
        projectMemberDomain.validateProjectRoleGuard.mockResolvedValue(false);

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(requestStoreService.set).toHaveBeenCalledWith(
            ProjectWorkspaceOwnerStoreKey,
            false
        );
    });

    it('rejects a non-owner without an allowed role', async () => {
        const roles = [EnumProjectMemberRole.admin];
        const workspaceMember =
            mock<
                NonNullable<
                    Parameters<
                        ProjectMemberDomain['validateProjectRoleGuard']
                    >[1]
                >
            >();
        reflector.get.mockReturnValue(roles);
        requestStoreService.get.mockImplementation(key => {
            if (key === ProjectStoreKey) return { id: 'project-id' };
            if (key === WorkspaceMemberStoreKey) return workspaceMember;
            return undefined;
        });
        const error = new Error('forbidden');
        projectMemberDomain.validateProjectRoleGuard.mockRejectedValue(error);

        await expect(guard.canActivate(context)).rejects.toBe(error);
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });

    it('defaults the allowed roles and the project id when neither is published', async () => {
        reflector.get.mockReturnValue(undefined);
        requestStoreService.get.mockReturnValue(undefined);
        projectMemberDomain.validateProjectRoleGuard.mockResolvedValue(false);

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(
            projectMemberDomain.validateProjectRoleGuard
        ).toHaveBeenCalledWith(null, undefined, []);
    });
});
