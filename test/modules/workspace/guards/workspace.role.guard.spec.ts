import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client';
import {
    WorkspaceMemberStoreKey,
    WorkspaceRoleMetaKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceRoleGuard } from '@modules/workspace/guards/workspace.role.guard';

describe('WorkspaceRoleGuard', () => {
    const reflector = createMock<Reflector>();
    const workspaceMemberDomain = createMock<WorkspaceMemberDomain>();
    const requestStoreService = createMock<RequestStoreService>();
    const handler = vi.fn();
    const context = createMock<ExecutionContext>({ getHandler: () => handler });

    beforeEach(() => vi.resetAllMocks());

    it('validates the stored member against declared roles', () => {
        const roles = [EnumWorkspaceMemberRole.owner];
        const member =
            createMock<
                NonNullable<
                    Parameters<
                        WorkspaceMemberDomain['validateWorkspaceRoleGuard']
                    >[0]
                >
            >();
        reflector.get.mockReturnValue(roles);
        requestStoreService.get.mockReturnValue(member);
        const guard = new WorkspaceRoleGuard(
            reflector,
            workspaceMemberDomain,
            requestStoreService
        );

        expect(guard.canActivate(context)).toBe(true);
        expect(reflector.get).toHaveBeenCalledWith(
            WorkspaceRoleMetaKey,
            handler
        );
        expect(
            workspaceMemberDomain.validateWorkspaceRoleGuard
        ).toHaveBeenCalledWith(member, roles);
        expect(requestStoreService.get).toHaveBeenCalledWith(
            WorkspaceMemberStoreKey
        );
    });

    it('uses an empty role list when metadata is absent', () => {
        reflector.get.mockReturnValue(undefined);
        requestStoreService.get.mockReturnValue(undefined);
        const guard = new WorkspaceRoleGuard(
            reflector,
            workspaceMemberDomain,
            requestStoreService
        );
        expect(guard.canActivate(context)).toBe(true);
        expect(
            workspaceMemberDomain.validateWorkspaceRoleGuard
        ).toHaveBeenCalledWith(undefined, []);
    });
});
