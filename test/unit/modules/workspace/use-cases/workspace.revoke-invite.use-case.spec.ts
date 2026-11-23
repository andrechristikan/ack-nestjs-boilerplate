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
import type { User, WorkspaceInvite } from '@generated/prisma-client/client';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceRevokeInviteUseCase } from '@modules/workspace/use-cases/workspace.revoke-invite.use-case';
import {
    buildUser,
    buildWorkspace,
    buildWorkspaceMember,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('WorkspaceRevokeInviteUseCase', () => {
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const scoped: IPolicyWhereInput<'WorkspaceInvite'> = { id: 'scoped-1' };
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const userService: MockProxy<UserService> = mock<UserService>();
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
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(
        buildWorkspace(),
        buildWorkspaceMember('user-1')
    );

    let useCase: WorkspaceRevokeInviteUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(scoped);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceRevokeInviteUseCase,
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

        useCase = module.get(WorkspaceRevokeInviteUseCase);
    });

    describe('execute', () => {
        beforeEach(() => {
            workspaceInviteService.getPendingById.mockResolvedValue(invite);
            userService.getOneActiveByEmail.mockResolvedValue(null);
        });

        it('scopes the WorkspaceInvite delete read through the ability and forwards the predicate to the read', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                'invite-1'
            );

            expect(policyAbilityService.scope).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.delete,
                EnumPolicySubject.WorkspaceInvite
            );
            expect(workspaceInviteService.getPendingById).toHaveBeenCalledWith(
                'invite-1',
                'workspace-1',
                scoped
            );
            expect(policyAbilityService.scope).toHaveBeenCalledBefore(
                workspaceInviteService.getPendingById
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
                    'invite-1'
                )
            ).rejects.toThrow(PolicyForbiddenException);
            expect(
                workspaceInviteService.getPendingById
            ).not.toHaveBeenCalled();
        });

        it('reads the pending invite and the invitee, then revokes with a null invitee and the context', async () => {
            const callOrder: string[] = [];
            workspaceInviteService.getPendingById.mockImplementation(
                async () => {
                    callOrder.push('pending');

                    return invite;
                }
            );
            userService.getOneActiveByEmail.mockImplementation(async () => {
                callOrder.push('lookup');

                return null;
            });
            workspaceInviteService.revokeInvite.mockImplementation(async () => {
                callOrder.push('revoke');
            });

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                'invite-1'
            );

            expect(result).toEqual({});
            expect(callOrder).toEqual(['pending', 'lookup', 'revoke']);
            expect(workspaceInviteService.getPendingById).toHaveBeenCalledWith(
                'invite-1',
                'workspace-1',
                scoped
            );
            expect(userService.getOneActiveByEmail).toHaveBeenCalledWith(
                'invitee@example.com'
            );
            expect(workspaceInviteService.revokeInvite).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                'workspace-1',
                null
            );
        });

        it('passes the invitee user id when the invitee has an account', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                policyContext,
                'invite-1'
            );

            expect(workspaceInviteService.revokeInvite).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                'workspace-1',
                'user-2'
            );
        });

        it('looks up no invitee when the invite is not pending', async () => {
            workspaceInviteService.getPendingById.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext,
                    'invite-1'
                )
            ).rejects.toBeInstanceOf(WorkspaceInviteAlreadyProcessedException);
            expect(userService.getOneActiveByEmail).not.toHaveBeenCalled();
        });

        it('rejects with the guarded revoke failure', async () => {
            workspaceInviteService.revokeInvite.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    policyContext,
                    'invite-1'
                )
            ).rejects.toBeInstanceOf(WorkspaceInviteAlreadyProcessedException);
        });
    });
});
