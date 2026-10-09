import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type {
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import {
    EnumRoleType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import {
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';

describe('WorkspaceMemberGuard', () => {
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
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

    const member: WorkspaceMember = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: EnumWorkspaceMemberRole.member,
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
        passwordAttempt: null,
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
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: true,
        },
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    let guard: WorkspaceMemberGuard;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceMemberGuard,
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        guard = module.get(WorkspaceMemberGuard);
    });

    describe('canActivate', () => {
        it('validates membership by the stored workspace and user ids and caches it', async () => {
            requestStoreService.get.mockImplementation(
                (key: string): unknown => {
                    if (key === WorkspaceStoreKey) return workspace;
                    if (key === UserStoreKey) return user;
                    return null;
                }
            );
            workspaceMemberDomain.validateWorkspaceMemberGuard.mockResolvedValue(
                member
            );

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(
                workspaceMemberDomain.validateWorkspaceMemberGuard
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
            expect(requestStoreService.set).toHaveBeenCalledWith(
                WorkspaceMemberStoreKey,
                member
            );
        });

        it('throws UserGuardMissingException before the domain call when the user store is empty', async () => {
            requestStoreService.get.mockImplementation(
                (key: string): unknown => {
                    if (key === WorkspaceStoreKey) return workspace;
                    return null;
                }
            );

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
                workspaceMemberDomain.validateWorkspaceMemberGuard
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceGuardMissingException before the domain call when the workspace store is empty', async () => {
            requestStoreService.get.mockImplementation(
                (key: string): unknown => {
                    if (key === UserStoreKey) return user;
                    return null;
                }
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
                workspaceMemberDomain.validateWorkspaceMemberGuard
            ).not.toHaveBeenCalled();
        });
    });
});
