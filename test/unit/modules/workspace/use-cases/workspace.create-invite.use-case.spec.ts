import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
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
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumProjectMemberRole,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Project,
    User,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ProjectService } from '@modules/project/services/project.service';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import { WorkspaceInviteProjectMismatchException } from '@modules/workspace/exceptions/workspace.invite-project-mismatch.exception';
import { WorkspaceMemberAlreadyExistsException } from '@modules/workspace/exceptions/workspace.member-already-exists.exception';
import type {
    IWorkspaceInviteNotice,
    IWorkspaceInvitePrepared,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
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
import { WorkspaceCreateInviteUseCase } from '@modules/workspace/use-cases/workspace.create-invite.use-case';

describe('WorkspaceCreateInviteUseCase', () => {
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();
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
    const censoredInvite = { ...invite, email: 'invi*ee@e**********' };
    const project: Project = {
        id: 'project-1',
        workspaceId: 'workspace-1',
        name: 'Launch',
        slug: 'launch',
        description: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
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
    const prepared: IWorkspaceInvitePrepared = {
        workspaceInviteId: 'invite-new',
        nonce: 'nonce-hash',
        expiresInDays: 7,
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

    let useCase: WorkspaceCreateInviteUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceCreateInviteUseCase,
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                { provide: ProjectService, useValue: projectService },
                { provide: UserService, useValue: userService },
                { provide: DatabaseService, useValue: databaseService },
                UserUtil,
                WorkspaceUtil,
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

        useCase = module.get(WorkspaceCreateInviteUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceInviteCreateRequestDto = {
            email: 'invitee@example.com' as Lowercase<string>,
            workspaceRole: EnumWorkspaceMemberRole.member,
        };
        beforeEach(() => {
            userService.getOneActiveByEmail.mockResolvedValue(null);
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceInviteService.prepareInvite.mockResolvedValue(prepared);
            workspaceInviteService.createInviteTokenData.mockReturnValue(
                tokenData
            );
            workspaceInviteService.createInviteInTx.mockResolvedValue(invite);
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
                    {
                        ...body,
                        projectId: 'project-1',
                        projectRole: EnumProjectMemberRole.member,
                    } as WorkspaceInviteCreateRequestDto
                )
            ).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.sesNotConfigured,
            });
            expect(
                projectService.getActiveByIdAndWorkspace
            ).not.toHaveBeenCalled();
            expect(userService.getOneActiveByEmail).not.toHaveBeenCalled();
            expect(workspaceInviteService.prepareInvite).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('checks, then writes with the notice and the context for an invitee with no account', async () => {
            const callOrder: string[] = [];
            userService.getOneActiveByEmail.mockImplementation(async () => {
                callOrder.push('lookup');

                return null;
            });
            workspaceInviteService.assertProjectRolePaired.mockImplementation(
                async () => {
                    callOrder.push('paired');
                }
            );
            workspaceInviteService.assertCreatable.mockImplementation(() => {
                callOrder.push('assertCreatable');
            });
            workspaceInviteService.createInviteInTx.mockImplementation(
                async () => {
                    callOrder.push('create');

                    return invite;
                }
            );

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                workspaceContext,
                body
            );

            expect(result).toEqual({ data: censoredInvite });
            expect(callOrder).toEqual([
                'lookup',
                'paired',
                'assertCreatable',
                'create',
            ]);
            expect(
                projectService.getActiveByIdAndWorkspace
            ).not.toHaveBeenCalled();
            expect(userService.getOneActiveByEmail).toHaveBeenCalledWith(
                'invitee@example.com'
            );
            expect(workspaceInviteService.assertCreatable).toHaveBeenCalledWith(
                {
                    email: 'invitee@example.com',
                    workspaceRole: EnumWorkspaceMemberRole.member,
                    projectId: null,
                    projectRole: null,
                    expiryDuration: null,
                },
                null
            );
            expect(
                workspaceInviteService.assertInviteeNotMember
            ).not.toHaveBeenCalled();
            expect(workspaceInviteService.prepareInvite).toHaveBeenCalledWith(
                'workspace-1',
                {
                    email: 'invitee@example.com',
                    workspaceRole: EnumWorkspaceMemberRole.member,
                    projectId: null,
                    projectRole: null,
                    expiryDuration: null,
                }
            );
            expect(
                workspaceInviteService.createInviteTokenData
            ).toHaveBeenCalledWith(7);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceInviteService.createInviteInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                {
                    email: 'invitee@example.com',
                    workspaceRole: EnumWorkspaceMemberRole.member,
                    projectId: null,
                    projectRole: null,
                    expiryDuration: null,
                },
                prepared,
                tokenData,
                notice
            );
        });

        it("puts the signed-in user's name in the notice and reads no user", async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                workspaceContext,
                body
            );

            expect(
                workspaceInviteService.createInviteInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                expect.objectContaining({ email: 'invitee@example.com' }),
                prepared,
                tokenData,
                expect.objectContaining({ inviterName: 'Jane Doe' })
            );
            expect(userService.getOneActiveByEmail).toHaveBeenCalledOnce();
        });

        it('passes the invitee user id in the notice when the invitee has an account', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                workspaceContext,
                body
            );

            expect(
                workspaceInviteService.createInviteInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                expect.objectContaining({ email: 'invitee@example.com' }),
                prepared,
                tokenData,
                { ...notice, inviteeUserId: 'user-2' }
            );
        });

        it('looks up the active project and forwards the project fields and expiry when given', async () => {
            projectService.getActiveByIdAndWorkspace.mockResolvedValue(project);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                workspaceContext,
                {
                    ...body,
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                    expiryDuration: 14,
                } as WorkspaceInviteCreateRequestDto
            );

            expect(
                projectService.getActiveByIdAndWorkspace
            ).toHaveBeenCalledWith('project-1', 'workspace-1');
            expect(workspaceInviteService.assertCreatable).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                    expiryDuration: 14,
                }),
                project
            );
            expect(
                workspaceInviteService.createInviteInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                expect.objectContaining({ expiryDuration: 14 }),
                prepared,
                tokenData,
                notice
            );
        });

        it('starts the project read, the invitee lookup, and the preparation while the pairing gate is still pending', async () => {
            const gate = buildDeferred<void>();
            workspaceInviteService.assertProjectRolePaired.mockReturnValue(
                gate.promise
            );
            projectService.getActiveByIdAndWorkspace.mockResolvedValue(project);
            const withProject = {
                ...body,
                projectId: 'project-1',
                projectRole: EnumProjectMemberRole.member,
            } as WorkspaceInviteCreateRequestDto;

            const pending = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                workspaceContext,
                withProject
            );
            expect(
                projectService.getActiveByIdAndWorkspace
            ).toHaveBeenCalledWith('project-1', 'workspace-1');
            expect(userService.getOneActiveByEmail).toHaveBeenCalledWith(
                'invitee@example.com'
            );
            expect(workspaceInviteService.prepareInvite).toHaveBeenCalledWith(
                'workspace-1',
                expect.objectContaining({ projectId: 'project-1' })
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();

            gate.resolve();

            await expect(pending).resolves.toEqual({ data: censoredInvite });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('reads the project and the invitee together', async () => {
            const deferredProject = buildDeferred<Project | null>();
            projectService.getActiveByIdAndWorkspace.mockReturnValue(
                deferredProject.promise
            );
            userService.getOneActiveByEmail.mockImplementation(async () => {
                deferredProject.resolve(project);

                return null;
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                workspaceContext,
                {
                    ...body,
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                } as WorkspaceInviteCreateRequestDto
            );

            expect(workspaceInviteService.assertCreatable).toHaveBeenCalledWith(
                expect.objectContaining({ projectId: 'project-1' }),
                project
            );
        });

        it('writes nothing when the project pairing gate rejects', async () => {
            workspaceInviteService.assertProjectRolePaired.mockRejectedValue(
                new WorkspaceInviteRoleRequiredException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    workspaceContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteRoleRequired,
            });
            expect(
                workspaceInviteService.assertCreatable
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('writes nothing when the creation check rejects', async () => {
            workspaceInviteService.assertCreatable.mockImplementation(() => {
                throw new WorkspaceInviteProjectMismatchException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    workspaceContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteProjectMismatch,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('checks the existing user is not a member before the write', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                workspaceContext,
                body
            );

            expect(
                workspaceInviteService.assertInviteeNotMember
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
            expect(
                workspaceInviteService.assertInviteeNotMember
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
        });

        it('throws WorkspaceMemberAlreadyExistsException and writes nothing when the invitee is already a member', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);
            workspaceInviteService.assertInviteeNotMember.mockRejectedValue(
                new WorkspaceMemberAlreadyExistsException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    workspaceContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberAlreadyExists,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws WorkspaceInviteDuplicateException on the first attempt when the nonce collides', async () => {
            workspaceInviteService.createInviteInTx.mockRejectedValue(
                buildPrismaKnownRequestError('P2002', 'nonce')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    workspaceContext,
                    body
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteDuplicateException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteDuplicate,
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
                workspaceInviteService.createInviteInTx
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
                    body
                );

                expect(result).toEqual({ data: censoredInvite });
                expect(databaseService.withTransaction).toHaveBeenCalledTimes(
                    2
                );
                expect(
                    workspaceInviteService.createInviteInTx
                ).toHaveBeenNthCalledWith(
                    2,
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    expect.objectContaining({ email: 'invitee@example.com' }),
                    prepared,
                    retried,
                    notice
                );
            }
        );

        it('throws DatabaseUniqueValueGenerationFailedException once the attempt budget is spent', async () => {
            workspaceInviteService.createInviteInTx.mockRejectedValue(
                buildPrismaKnownRequestError('P2002', 'token')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    workspaceContext,
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

        it('rethrows an AppBaseException without retrying', async () => {
            const failure = new WorkspaceMemberAlreadyExistsException();
            workspaceInviteService.createInviteInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    workspaceContext,
                    body
                )
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('maps a write conflict to WorkspaceInviteDuplicateException without retrying', async () => {
            workspaceInviteService.createInviteInTx.mockRejectedValue(
                buildPrismaKnownRequestError(DatabaseWriteConflictCode)
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    workspaceContext,
                    body
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteDuplicateException,
                statusCode: EnumWorkspaceStatusCodeError.inviteDuplicate,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('wraps another failure in AppUnknownException without retrying', async () => {
            const cause = new Error('db-down');
            workspaceInviteService.createInviteInTx.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    workspaceContext,
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
