import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    const reflector = createMock<Reflector>();
    const projectMemberDomain = createMock<ProjectMemberDomain>();
    const requestStoreService = createMock<RequestStoreService>();
    const handler = vi.fn();
    const context = createMock<ExecutionContext>({ getHandler: () => handler });

    beforeEach(() => vi.resetAllMocks());

    it('publishes the workspace-owner bypass returned by role validation', async () => {
        const roles = [EnumProjectMemberRole.admin];
        const workspaceMember =
            createMock<
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
        const guard = new ProjectRoleGuard(
            reflector,
            projectMemberDomain,
            requestStoreService
        );

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
            createMock<
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
        const guard = new ProjectRoleGuard(
            reflector,
            projectMemberDomain,
            requestStoreService
        );

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(requestStoreService.set).toHaveBeenCalledWith(
            ProjectWorkspaceOwnerStoreKey,
            false
        );
    });

    it('rejects a non-owner without an allowed role', async () => {
        const roles = [EnumProjectMemberRole.admin];
        const workspaceMember =
            createMock<
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
        const guard = new ProjectRoleGuard(
            reflector,
            projectMemberDomain,
            requestStoreService
        );

        await expect(guard.canActivate(context)).rejects.toBe(error);
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });

    it('defaults the allowed roles and the project id when neither is published', async () => {
        reflector.get.mockReturnValue(undefined);
        requestStoreService.get.mockReturnValue(undefined);
        projectMemberDomain.validateProjectRoleGuard.mockResolvedValue(false);
        const guard = new ProjectRoleGuard(
            reflector,
            projectMemberDomain,
            requestStoreService
        );

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(
            projectMemberDomain.validateProjectRoleGuard
        ).toHaveBeenCalledWith(null, undefined, []);
    });
});
