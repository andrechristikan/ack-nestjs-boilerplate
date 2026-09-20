import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumWorkspaceMemberRole,
    type WorkspaceMember,
} from '@generated/prisma-client';
import {
    WorkspaceMemberStoreKey,
    WorkspaceRoleMetaKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceRoleGuard } from '@modules/workspace/guards/workspace.role.guard';

describe('WorkspaceRoleGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const handler = vi.fn();
    const joinedAt = new Date('2026-01-01T00:00:00.000Z');
    let guard: WorkspaceRoleGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        context.getHandler.mockReturnValue(handler);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceRoleGuard,
                { provide: Reflector, useValue: reflector },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        guard = module.get(WorkspaceRoleGuard);
    });

    it('validates the stored member against declared roles', () => {
        const roles = [EnumWorkspaceMemberRole.owner];
        const member: WorkspaceMember = {
            id: 'member-id',
            workspaceId: 'workspace-id',
            userId: 'user-id',
            role: EnumWorkspaceMemberRole.owner,
            joinedAt,
            createdAt: joinedAt,
            createdBy: null,
            updatedAt: joinedAt,
            updatedBy: null,
        };
        reflector.get.mockReturnValue(roles);
        requestStoreService.get.mockReturnValue(member);

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

        expect(guard.canActivate(context)).toBe(true);
        expect(
            workspaceMemberDomain.validateWorkspaceRoleGuard
        ).toHaveBeenCalledWith(undefined, []);
    });

    it('throws the domain error synchronously and unchanged', () => {
        const error = new Error('role not allowed');
        reflector.get.mockReturnValue([EnumWorkspaceMemberRole.owner]);
        requestStoreService.get.mockReturnValue(undefined);
        workspaceMemberDomain.validateWorkspaceRoleGuard.mockImplementation(
            () => {
                throw error;
            }
        );

        let thrown: unknown;
        try {
            guard.canActivate(context);
        } catch (e) {
            thrown = e;
        }

        expect(thrown).toBe(error);
    });
});
