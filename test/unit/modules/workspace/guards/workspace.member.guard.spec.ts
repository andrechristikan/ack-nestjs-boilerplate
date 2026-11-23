import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Workspace } from '@generated/prisma-client/client';
import {
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { UserContextStoreKey } from '@modules/user/constants/user.constant';
import { WorkspaceContextStoreKey } from '@modules/workspace/constants/workspace.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IUser } from '@modules/user/interfaces/user.interface';

import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';
import { buildUserContext } from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceMemberGuard', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();

    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: false,
    };

    const member: IWorkspaceMemberWithRole = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-1',
        roleId: 'role-workspace-member',
        role: {
            id: 'role-workspace-member',
            scope: EnumRoleScope.workspace,
            key: 'member',
            name: 'member',
            policyRevision: 0,
        },
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const user: IUser = {
        id: 'user-1',
        name: 'Jane Doe',
        username: 'jane',
        isVerified: false,
        verifiedAt: null,
        email: 'jane@example.com',
        roleId: 'role-1',
        password: null,
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            scope: EnumRoleScope.platform,
            key: 'user',
            name: 'user',
            policyRevision: 0,
        },
    };

    let guard: WorkspaceMemberGuard;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceMemberGuard,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        guard = module.get(WorkspaceMemberGuard);
    });

    describe('canActivate', () => {
        it('validates membership by the stored workspace and user ids and merges the member into the workspace context', async () => {
            const store: Record<string, unknown> = {
                [UserContextStoreKey]: buildUserContext(user),
                [WorkspaceContextStoreKey]: { workspace },
            };
            requestStoreService.get.mockImplementation(
                key => store[key] ?? null
            );
            workspaceMemberService.validateWorkspaceMemberGuard.mockResolvedValue(
                member
            );

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(
                workspaceMemberService.validateWorkspaceMemberGuard
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                WorkspaceContextStoreKey,
                { workspaceMember: member }
            );
        });

        it('throws UserGuardMissingException before the domain call when the store holds no user context', async () => {
            requestStoreService.get.mockReturnValue(null);

            await expect(
                guard.canActivate(executionContext)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.guardMissing
                    ],
                messagePath: 'user.error.guardMissing',
                httpStatus: HttpStatus.UNAUTHORIZED,
            });
            expect(
                workspaceMemberService.validateWorkspaceMemberGuard
            ).not.toHaveBeenCalled();
        });

        it.each([null, {}])(
            'throws WorkspaceGuardMissingException before the domain call when the store holds no workspace',
            async workspaceContext => {
                const store: Record<string, unknown> = {
                    [UserContextStoreKey]: buildUserContext(user),
                    [WorkspaceContextStoreKey]: workspaceContext,
                };
                requestStoreService.get.mockImplementation(
                    key => store[key] ?? null
                );

                await expect(
                    guard.canActivate(executionContext)
                ).rejects.toMatchObject({
                    module: 'workspace',
                    statusCode: EnumWorkspaceStatusCodeError.guardMissing,
                    statusCodeKey:
                        EnumWorkspaceStatusCodeError[
                            EnumWorkspaceStatusCodeError.guardMissing
                        ],
                    messagePath: 'workspace.error.guardMissing',
                    httpStatus: HttpStatus.FORBIDDEN,
                });
                expect(
                    workspaceMemberService.validateWorkspaceMemberGuard
                ).not.toHaveBeenCalled();
            }
        );
    });
});
