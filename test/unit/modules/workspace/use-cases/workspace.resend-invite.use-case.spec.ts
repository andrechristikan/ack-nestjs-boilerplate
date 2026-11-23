import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { RoleService } from '@modules/role/services/role.service';
import { EnumRoleScope } from '@generated/prisma-client/client';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumWorkspaceInviteStatus,
} from '@generated/prisma-client/client';
import type {
    User,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import type {
    IWorkspaceInviteNotice,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceResendInviteUseCase } from '@modules/workspace/use-cases/workspace.resend-invite.use-case';
import {
    buildUser,
    buildWorkspaceMember,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('WorkspaceResendInviteUseCase', () => {
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const scoped: IPolicyWhereInput<'WorkspaceInvite'> = { id: 'scoped-1' };
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: false,
    };
    const invite: WorkspaceInvite = {
        id: 'invite-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        workspaceId: 'workspace-1',
        email: 'invitee@example.com',
        token: 'hashed-token',
        workspaceRoleId: 'role-workspace-member',
        projectId: null,
        projectRoleId: null,
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'user-1',
        acceptedAt: null,
        acceptedByUserId: null,
        nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    const existingUser: User = {
        id: 'user-2',
        name: 'Jane Doe',
        username: 'jane',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'invitee@example.com',
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
        gender: null,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };
    const tokenData: IWorkspaceInviteTokenData = {
        token: 'token-value',
        hashedToken: 'hashed-token',
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        claimLink:
            'https://app.example.com/workspace/invites?inviteToken=token-value',
        signUpLink: 'https://app.example.com/sign-up/token-value',
    };
    const notice: IWorkspaceInviteNotice = {
        workspaceName: 'Acme',
        workspaceRoleName: 'Member',
        inviterName: 'Jane Doe',
        inviteeUserId: null,
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(
        workspace,
        buildWorkspaceMember('user-1')
    );

    let useCase: WorkspaceResendInviteUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(scoped);
        roleService.getRefByIdForScope.mockResolvedValue({
            id: 'role-workspace-member',
            scope: EnumRoleScope.workspace,
            key: 'member',
            name: 'Member',
            policyRevision: 0,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: RoleService, useValue: roleService },
                WorkspaceResendInviteUseCase,
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                { provide: UserService, useValue: userService },
            ],
        }).compile();

        useCase = module.get(WorkspaceResendInviteUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceInviteResendRequestDto = {};

        beforeEach(() => {
            workspaceInviteService.getResendableById.mockResolvedValue(invite);
            userService.getOneActiveByEmail.mockResolvedValue(null);
            workspaceInviteService.getInviterName.mockResolvedValue('Jane Doe');
            workspaceInviteService.resendInvite.mockResolvedValue({
                invite,
                tokenData,
            });
        });

        it('scopes the WorkspaceInvite update read through the ability and forwards the predicate to the read', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                'invite-1',
                body
            );

            expect(policyAbilityService.scope).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.update,
                EnumPolicySubject.WorkspaceInvite
            );
            expect(
                workspaceInviteService.getResendableById
            ).toHaveBeenCalledWith('invite-1', 'workspace-1', scoped);
            expect(policyAbilityService.scope).toHaveBeenCalledBefore(
                workspaceInviteService.getResendableById
            );
        });

        it('rejects with the forbidden error and reads nothing when the ability holds no rule', async () => {
            policyAbilityService.scope.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext,
                    'invite-1',
                    body
                )
            ).rejects.toThrow(PolicyForbiddenException);
            expect(
                workspaceInviteService.getResendableById
            ).not.toHaveBeenCalled();
        });

        it('reads the pending invite, then rotates with the notice and the context for an invitee with no account', async () => {
            const callOrder: string[] = [];
            workspaceInviteService.getResendableById.mockImplementation(
                async () => {
                    callOrder.push('pending');

                    return invite;
                }
            );
            workspaceInviteService.resendInvite.mockImplementation(async () => {
                callOrder.push('rotate');

                return { invite, tokenData };
            });

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                'invite-1',
                body
            );

            expect(result).toEqual({ data: invite });
            expect(callOrder).toEqual(['pending', 'rotate']);
            expect(
                workspaceInviteService.getResendableById
            ).toHaveBeenCalledWith('invite-1', 'workspace-1', scoped);
            expect(userService.getOneActiveByEmail).toHaveBeenCalledWith(
                'invitee@example.com'
            );
            expect(workspaceInviteService.resendInvite).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                null,
                notice
            );
        });

        it('forwards the requested expiry to the domain', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                'invite-1',
                {
                    expiryDuration: 14,
                } as WorkspaceInviteResendRequestDto
            );

            expect(workspaceInviteService.resendInvite).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                14,
                notice
            );
        });

        it('passes the invitee user id in the notice when the invitee has an account', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                'invite-1',
                body
            );

            expect(workspaceInviteService.resendInvite).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                null,
                { ...notice, inviteeUserId: 'user-2' }
            );
        });

        it('rotates nothing when the invite is not pending', async () => {
            workspaceInviteService.getResendableById.mockRejectedValue(
                new WorkspaceInviteNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext,
                    'invite-1',
                    body
                )
            ).rejects.toBeInstanceOf(WorkspaceInviteNotFoundException);
            expect(workspaceInviteService.resendInvite).not.toHaveBeenCalled();
        });

        it('rotates nothing when the inviter name read rejects', async () => {
            const failure = new Error('read-failed');
            workspaceInviteService.getInviterName.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext,
                    'invite-1',
                    body
                )
            ).rejects.toBe(failure);
            expect(workspaceInviteService.resendInvite).not.toHaveBeenCalled();
        });

        it('rejects with the rotation failure', async () => {
            workspaceInviteService.resendInvite.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext,
                    'invite-1',
                    body
                )
            ).rejects.toBeInstanceOf(WorkspaceInviteAlreadyProcessedException);
        });
    });
});
