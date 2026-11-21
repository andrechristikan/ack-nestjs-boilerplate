import { UserUtil } from '@modules/user/utils/user.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { ConfigService } from '@nestjs/config';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
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
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    User,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import type {
    IWorkspaceInviteNotice,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceResendInviteUseCase } from '@modules/workspace/use-cases/workspace.resend-invite.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspace,
    buildWorkspaceContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceResendInviteUseCase', () => {
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const workspace: Workspace = buildWorkspace();
    const invite: WorkspaceInvite = {
        id: 'invite-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        workspaceId: 'workspace-1',
        email: 'invitee@example.com',
        token: 'hashed-token',
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: null,
        projectRole: null,
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
        photo: null,
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
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx = {} as IDatabaseTransactionClient;
    const notice: IWorkspaceInviteNotice = {
        workspaceName: 'Acme',
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
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceResendInviteUseCase,
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                { provide: UserService, useValue: userService },
                { provide: DatabaseService, useValue: databaseService },
                UserUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'message.availableLanguages': ['en'],
                        'workspace.invite.referenceMaxAttempts': 3,
                    }),
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceResendInviteUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceInviteResendRequestDto = {};

        beforeEach(() => {
            workspaceInviteService.getResendableById.mockResolvedValue(invite);
            userService.getOneActiveByEmail.mockResolvedValue(null);
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceInviteService.resolveExpiresInDays.mockResolvedValue(7);
            workspaceInviteService.createInviteTokenData.mockReturnValue(
                tokenData
            );
            workspaceInviteService.resendInviteInTx.mockResolvedValue(invite);
        });

        it('answers AwsSesNotConfiguredException before any read, write, or transaction when SES is unset', async () => {
            workspaceInviteService.assertEmailDeliverable.mockImplementation(
                () => {
                    throw new AwsSesNotConfiguredException();
                }
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    workspaceContext,
                    'invite-1',
                    body
                )
            ).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.sesNotConfigured,
            });
            expect(
                workspaceInviteService.getResendableById
            ).not.toHaveBeenCalled();
            expect(userService.getOneActiveByEmail).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('reads the pending invite, then rotates with the notice and the context for an invitee with no account', async () => {
            const callOrder: string[] = [];
            workspaceInviteService.getResendableById.mockImplementation(
                async () => {
                    callOrder.push('pending');

                    return invite;
                }
            );
            workspaceInviteService.resendInviteInTx.mockImplementation(
                async () => {
                    callOrder.push('rotate');

                    return invite;
                }
            );

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                workspaceContext,
                'invite-1',
                body
            );

            expect(result).toEqual({ data: invite });
            expect(callOrder).toEqual(['pending', 'rotate']);
            expect(
                workspaceInviteService.getResendableById
            ).toHaveBeenCalledWith('invite-1', 'workspace-1');
            expect(userService.getOneActiveByEmail).toHaveBeenCalledWith(
                'invitee@example.com'
            );
            expect(
                workspaceInviteService.resolveExpiresInDays
            ).toHaveBeenCalledWith(null);
            expect(
                workspaceInviteService.createInviteTokenData
            ).toHaveBeenCalledWith(7);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceInviteService.resendInviteInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                tokenData,
                notice
            );
        });

        it('resolves the lifetime while the pending invite read is still pending', async () => {
            const pendingInvite = buildDeferred<WorkspaceInvite>();
            workspaceInviteService.getResendableById.mockReturnValue(
                pendingInvite.promise
            );

            const pending = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                workspaceContext,
                'invite-1',
                { expiryDuration: 14 } as WorkspaceInviteResendRequestDto
            );
            expect(
                workspaceInviteService.resolveExpiresInDays
            ).toHaveBeenCalledWith(14);
            expect(userService.getOneActiveByEmail).not.toHaveBeenCalled();

            pendingInvite.resolve(invite);

            await expect(pending).resolves.toEqual({ data: invite });
            expect(userService.getOneActiveByEmail).toHaveBeenCalledWith(
                'invitee@example.com'
            );
        });

        it('resolves the lifetime from the requested expiry', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                workspaceContext,
                'invite-1',
                {
                    expiryDuration: 14,
                } as WorkspaceInviteResendRequestDto
            );

            expect(
                workspaceInviteService.resolveExpiresInDays
            ).toHaveBeenCalledWith(14);
        });

        it('passes the invitee user id in the notice when the invitee has an account', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                workspaceContext,
                'invite-1',
                body
            );

            expect(
                workspaceInviteService.resendInviteInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'invite-1',
                tokenData,
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
                    userContext,
                    workspaceContext,
                    'invite-1',
                    body
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteNotFound,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws WorkspaceInviteAlreadyProcessedException from a missed guarded rotation without retrying', async () => {
            workspaceInviteService.resendInviteInTx.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    workspaceContext,
                    'invite-1',
                    body
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it.each(['token', 'reference'])(
            'draws fresh token data and opens another transaction when the %s collides',
            async column => {
                const retried = {
                    ...tokenData,
                    hashedToken: 'hashed-token-2',
                };
                workspaceInviteService.createInviteTokenData
                    .mockReturnValueOnce(tokenData)
                    .mockReturnValueOnce(retried);
                workspaceInviteService.resendInviteInTx
                    .mockRejectedValueOnce(
                        buildPrismaKnownRequestError('P2002', column)
                    )
                    .mockResolvedValueOnce(invite);

                const result = await useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    workspaceContext,
                    'invite-1',
                    body
                );

                expect(result).toEqual({ data: invite });
                expect(databaseService.withTransaction).toHaveBeenCalledTimes(
                    2
                );
                expect(
                    workspaceInviteService.resendInviteInTx
                ).toHaveBeenNthCalledWith(
                    2,
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'invite-1',
                    retried,
                    notice
                );
            }
        );

        it('throws DatabaseUniqueValueGenerationFailedException once the attempt budget is spent', async () => {
            workspaceInviteService.resendInviteInTx.mockRejectedValue(
                buildPrismaKnownRequestError('P2002', 'reference')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    workspaceContext,
                    'invite-1',
                    body
                )
            ).rejects.toMatchObject({
                constructor: DatabaseUniqueValueGenerationFailedException,
                module: 'database',
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(3);
        });

        it('maps a write conflict to WorkspaceInviteAlreadyProcessedException without retrying', async () => {
            workspaceInviteService.resendInviteInTx.mockRejectedValue(
                buildPrismaKnownRequestError(DatabaseWriteConflictCode)
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    workspaceContext,
                    'invite-1',
                    body
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('wraps another failure in AppUnknownException without retrying', async () => {
            const cause = new Error('db-down');
            workspaceInviteService.resendInviteInTx.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    workspaceContext,
                    'invite-1',
                    body
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });
    });
});
