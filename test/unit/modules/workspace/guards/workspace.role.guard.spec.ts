import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    WorkspaceMemberStoreKey,
    WorkspaceRoleMetaKey,
} from '@modules/workspace/constants/workspace.constant';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceRoleGuard } from '@modules/workspace/guards/workspace.role.guard';

describe('WorkspaceRoleGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();

    const member: WorkspaceMember = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: EnumWorkspaceMemberRole.admin,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    let guard: WorkspaceRoleGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        executionContext.getHandler.mockReturnValue(vi.fn());

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceRoleGuard,
                { provide: Reflector, useValue: reflector },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        guard = module.get(WorkspaceRoleGuard);
    });

    describe('canActivate', () => {
        it('validates the stored member against the required roles', () => {
            const handler = executionContext.getHandler();
            reflector.get.mockReturnValue([EnumWorkspaceMemberRole.admin]);
            requestStoreService.get.mockReturnValue(member);

            const result = guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(reflector.get).toHaveBeenCalledWith(
                WorkspaceRoleMetaKey,
                handler
            );
            expect(requestStoreService.get).toHaveBeenCalledWith(
                WorkspaceMemberStoreKey
            );
            expect(
                workspaceMemberDomain.validateWorkspaceRoleGuard
            ).toHaveBeenCalledWith(member, [EnumWorkspaceMemberRole.admin]);
        });

        it('validates against an empty role list when none is set on the handler', () => {
            reflector.get.mockReturnValue(undefined);
            requestStoreService.get.mockReturnValue(member);

            guard.canActivate(executionContext);

            expect(
                workspaceMemberDomain.validateWorkspaceRoleGuard
            ).toHaveBeenCalledWith(member, []);
        });

        it('throws WorkspaceMemberGuardMissingException before the domain call when the member store is empty', () => {
            reflector.get.mockReturnValue([EnumWorkspaceMemberRole.admin]);
            requestStoreService.get.mockReturnValue(null);

            let thrown: unknown;
            try {
                guard.canActivate(executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberGuardMissing,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberGuardMissing
                    ],
                messagePath: 'workspace.error.memberGuardMissing',
                httpStatus: HttpStatus.FORBIDDEN,
            });
            expect(
                workspaceMemberDomain.validateWorkspaceRoleGuard
            ).not.toHaveBeenCalled();
        });

        it('propagates the exception the domain throws for a forbidden role', () => {
            reflector.get.mockReturnValue([EnumWorkspaceMemberRole.owner]);
            requestStoreService.get.mockReturnValue(member);
            const forbidden = new Error('forbidden');
            workspaceMemberDomain.validateWorkspaceRoleGuard.mockImplementation(
                () => {
                    throw forbidden;
                }
            );

            let thrown: unknown;
            try {
                guard.canActivate(executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBe(forbidden);
        });
    });
});
