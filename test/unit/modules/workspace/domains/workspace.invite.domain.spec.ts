import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Duration } from 'luxon';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Prisma,
    Project,
    User,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type {
    IUserSignUpWorkspaceInvite,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import { WorkspaceInviteProjectMismatchException } from '@modules/workspace/exceptions/workspace.invite-project-mismatch.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import type {
    IWorkspaceInviteCreate,
    IWorkspaceInviteInviter,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';

describe('WorkspaceInviteDomain', () => {
    const workspaceInviteRepository: MockProxy<WorkspaceInviteRepository> =
        mock<WorkspaceInviteRepository>();
    const workspaceMemberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const projectDomain: MockProxy<ProjectDomain> = mock<ProjectDomain>();
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const userOnboardingDomain: MockProxy<UserOnboardingDomain> =
        mock<UserOnboardingDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();

    const configValues: Record<string, unknown> = {
        'home.url': 'https://app.example.com',
        'workspace.invite.expiredInDays': 7,
        'workspace.invite.tokenLength': 40,
        'workspace.invite.referencePrefix': 'WIN',
        'workspace.invite.referenceRandomLength': 6,
        'workspace.invite.linkPattern': '{homeUrl}/invite/{token}',
        'workspace.invite.signUpLinkPattern': '{homeUrl}/sign-up/{token}',
    };

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

    const baseInvite: WorkspaceInvite = {
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
    };

    const baseUser: User = {
        id: 'user-2',
        name: 'Jane Doe',
        username: 'jane',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
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
        gender: EnumUserGender.female,
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
    };

    const baseProject: Project = {
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

    let domain: WorkspaceInviteDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => configValues[key]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceInviteDomain,
                {
                    provide: WorkspaceInviteRepository,
                    useValue: workspaceInviteRepository,
                },
                {
                    provide: WorkspaceMemberRepository,
                    useValue: workspaceMemberRepository,
                },
                { provide: WorkspaceRepository, useValue: workspaceRepository },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                { provide: ProjectDomain, useValue: projectDomain },
                { provide: ProjectMemberDomain, useValue: projectMemberDomain },
                { provide: UserDomain, useValue: userDomain },
                {
                    provide: UserOnboardingDomain,
                    useValue: userOnboardingDomain,
                },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: ConfigService, useValue: configService },
                { provide: NotificationQueue, useValue: notificationQueue },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
            ],
        }).compile();

        domain = module.get(WorkspaceInviteDomain);
    });

    describe('validateInviteToken', () => {
        it('throws WorkspaceInviteInvalidException when no pending invite matches the token', async () => {
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                null
            );
            helperHashService.sha256Hash.mockReturnValue('hashed-token');

            await expect(
                domain.validateInviteToken('raw-token')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteInvalid
                    ],
                messagePath: 'workspace.error.inviteInvalid',
            });
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'raw-token'
            );
        });

        it('returns the pending invite matching the token', async () => {
            const invite = baseInvite;
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                invite
            );

            const result = await domain.validateInviteToken('raw-token');

            expect(result).toBe(invite);
            expect(
                workspaceInviteRepository.findPendingByHashedToken
            ).toHaveBeenCalledWith('hashed-token');
        });
    });

    describe('resolveForSignUp', () => {
        it('builds a personal workspace context when no invite token is given', async () => {
            const personalContext: IUserSignUpWorkspacePersonal = {
                type: EnumUserSignUpWorkspaceContextType.personal,
                workspaceId: 'workspace-1',
                slugCandidates: ['user-a'],
                name: 'User One',
            };
            userOnboardingDomain.buildPersonalWorkspaceContexts.mockReturnValue(
                [personalContext]
            );

            const result = await domain.resolveForSignUp(
                null,
                'user@example.com',
                'alice'
            );

            expect(result).toBe(personalContext);
            expect(
                userOnboardingDomain.buildPersonalWorkspaceContexts
            ).toHaveBeenCalledWith(['alice']);
            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceInviteInvalidException when no pending invite matches the token', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                null
            );

            await expect(
                domain.resolveForSignUp(
                    'raw-token',
                    'user@example.com',
                    'alice'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteInvalid
                    ],
                messagePath: 'workspace.error.inviteInvalid',
            });
            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'invitationAllowed');
        });

        it('throws WorkspaceInviteInvalidException when the invite email does not match, case-insensitively', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                { ...baseInvite, email: 'other@example.com' }
            );

            await expect(
                domain.resolveForSignUp(
                    'raw-token',
                    'USER@example.com',
                    'alice'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteInvalid
                    ],
                messagePath: 'workspace.error.inviteInvalid',
            });
        });

        it('returns the invite workspace context with project fields defaulted to null', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                { ...baseInvite, email: 'USER@example.com' }
            );

            const result = await domain.resolveForSignUp(
                'raw-token',
                'user@example.com',
                'alice'
            );

            expect(result).toEqual({
                type: EnumUserSignUpWorkspaceContextType.invite,
                workspaceId: 'workspace-1',
                workspaceInviteId: 'invite-1',
                invitedByUserId: 'user-1',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                projectId: null,
                projectMemberRole: null,
            });
        });

        it('returns the invite workspace context with project fields present', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                {
                    ...baseInvite,
                    email: 'user@example.com',
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                }
            );

            const result = await domain.resolveForSignUp(
                'raw-token',
                'user@example.com',
                'alice'
            );

            expect(result).toMatchObject({
                projectId: 'project-1',
                projectMemberRole: EnumProjectMemberRole.member,
            });
        });
    });

    describe('expireStalePending', () => {
        it('delegates to the repository', async () => {
            workspaceInviteRepository.expireStalePending.mockResolvedValue(3);

            const result = await domain.expireStalePending();

            expect(result).toBe(3);
        });
    });

    describe('getInvitesList', () => {
        it('validates the invitation feature-flag then delegates to the repository', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput> =
                { limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<never> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceInviteRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await domain.getInvitesList(
                'workspace-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'invitationAllowed');
            expect(
                workspaceInviteRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, null);
        });

        it('forwards the status filter to the repository', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput> =
                { limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<never> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            const status = { status: { in: ['pending'] } };
            workspaceInviteRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await domain.getInvitesList(
                'workspace-1',
                pagination,
                status
            );

            expect(result).toBe(page);
            expect(
                workspaceInviteRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, status);
        });
    });

    describe('createInvite', () => {
        const create: IWorkspaceInviteCreate = {
            email: 'invitee@example.com' as Lowercase<string>,
            workspaceRole: EnumWorkspaceMemberRole.member,
            projectId: null,
            projectRole: null,
            expiryDuration: null,
        };

        beforeEach(() => {
            helperStringService.random.mockReturnValue('random-value');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            helperDateService.forward.mockReturnValue(
                new Date('2026-01-08T00:00:00.000Z')
            );
            helperStringService.fillPattern.mockReturnValue(
                'https://app.example.com/invite/random-value'
            );
            databaseUtil.createId.mockReturnValue('invite-1');
            workspaceInviteRepository.existsPendingByWorkspaceAndEmail.mockResolvedValue(
                false
            );
            userDomain.getOneActiveByEmail.mockResolvedValue(null);
            workspaceInviteRepository.createPending.mockResolvedValue(
                baseInvite
            );
        });

        it('throws WorkspaceInviteRoleRequiredException when only projectId is given', async () => {
            await expect(
                domain.createInvite(workspace, 'user-1', {
                    ...create,
                    projectId: 'project-1',
                })
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteRoleRequiredException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteRoleRequired,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteRoleRequired
                    ],
                messagePath: 'workspace.error.inviteRoleRequired',
            });
        });

        it('throws WorkspaceInviteRoleRequiredException when only projectRole is given', async () => {
            await expect(
                domain.createInvite(workspace, 'user-1', {
                    ...create,
                    projectRole: EnumProjectMemberRole.member,
                })
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteRoleRequiredException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteRoleRequired,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteRoleRequired
                    ],
                messagePath: 'workspace.error.inviteRoleRequired',
            });
        });

        it('throws WorkspaceInviteProjectMismatchException when the project is not active in the workspace', async () => {
            projectDomain.getActiveByIdAndWorkspace.mockResolvedValue(null);

            await expect(
                domain.createInvite(workspace, 'user-1', {
                    ...create,
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                })
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteProjectMismatchException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteProjectMismatch,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteProjectMismatch
                    ],
                messagePath: 'workspace.error.inviteProjectMismatch',
            });
        });

        it('throws WorkspaceInviteDuplicateException when a pending invite already exists', async () => {
            workspaceInviteRepository.existsPendingByWorkspaceAndEmail.mockResolvedValue(
                true
            );

            await expect(
                domain.createInvite(workspace, 'user-1', create)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteDuplicateException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteDuplicate,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteDuplicate
                    ],
                messagePath: 'workspace.error.inviteDuplicate',
            });
        });

        it('creates the invite, stages the activity log in order, and emails the unregistered invitee when no user matches', async () => {
            const stagedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceInviteCreated,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
            const callOrder: string[] = [];
            workspaceInviteRepository.createPending.mockImplementation(
                async () => {
                    callOrder.push('createPending');
                    return baseInvite;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            const invite = await domain.createInvite(
                workspace,
                'user-1',
                create
            );

            expect(invite).toBe(baseInvite);
            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceInviteCreated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { workspaceInviteId: 'invite-1' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
            expect(callOrder).toEqual(['createPending', 'stagePrepared']);
            expect(
                workspaceInviteRepository.createPending
            ).toHaveBeenCalledWith(
                expect.objectContaining({ projectId: null, projectRole: null })
            );
            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
        });

        it('creates the invite with two activity logs in order and notifies the existing user when it differs from the actor', async () => {
            const existingUser = { ...baseUser, id: 'user-9' };
            userDomain.getOneActiveByEmail.mockResolvedValue(existingUser);
            const createdActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceInviteCreated,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            const createdByAdminActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceInviteCreatedByAdmin,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(createdActivityLog)
                .mockReturnValueOnce(createdByAdminActivityLog);
            const callOrder: string[] = [];
            workspaceInviteRepository.createPending.mockImplementation(
                async () => {
                    callOrder.push('createPending');
                    return baseInvite;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await domain.createInvite(workspace, 'user-1', create);

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(2);
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceInviteCreated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: {
                    workspaceInviteId: 'invite-1',
                    targetUserId: 'user-9',
                },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceInviteCreatedByAdmin,
                userId: 'user-9',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                createdActivityLog,
                createdByAdminActivityLog,
            ]);
            expect(callOrder).toEqual(['createPending', 'stagePrepared']);
            expect(notificationQueue.sendWorkspaceInvite).toHaveBeenCalledTimes(
                1
            );
        });

        it('creates the invite with a single activity log in order when the existing user is the actor', async () => {
            const existingUser = { ...baseUser, id: 'user-1' };
            userDomain.getOneActiveByEmail.mockResolvedValue(existingUser);
            const stagedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceInviteCreated,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
            const callOrder: string[] = [];
            workspaceInviteRepository.createPending.mockImplementation(
                async () => {
                    callOrder.push('createPending');
                    return baseInvite;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await domain.createInvite(workspace, 'user-1', create);

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceInviteCreated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: {
                    workspaceInviteId: 'invite-1',
                    targetUserId: 'user-1',
                },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
            expect(callOrder).toEqual(['createPending', 'stagePrepared']);
        });

        it('looks up the active project when a project id and role are given', async () => {
            const project = baseProject;
            projectDomain.getActiveByIdAndWorkspace.mockResolvedValue(project);
            const stagedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceInviteCreated,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(stagedActivityLog);

            await domain.createInvite(workspace, 'user-1', {
                ...create,
                projectId: 'project-1',
                projectRole: EnumProjectMemberRole.member,
            });

            expect(
                projectDomain.getActiveByIdAndWorkspace
            ).toHaveBeenCalledWith('project-1', 'workspace-1');
            expect(
                workspaceInviteRepository.createPending
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                })
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('resendInvite', () => {
        beforeEach(() => {
            helperStringService.random.mockReturnValue('random-value');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            helperDateService.forward.mockReturnValue(
                new Date('2026-01-08T00:00:00.000Z')
            );
            helperStringService.fillPattern.mockReturnValue(
                'https://app.example.com/invite/random-value'
            );
            userDomain.getOneActiveByEmail.mockResolvedValue(null);
        });

        it('throws WorkspaceInviteNotFoundException when the invite does not exist', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                domain.resendInvite(
                    workspace,
                    'user-1',
                    'invite-1',
                    EnumWorkspaceInviteExpiry.sevenDays
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteNotFound
                    ],
                messagePath: 'workspace.error.inviteNotFound',
            });
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the invite is no longer pending', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue({
                ...baseInvite,
                status: EnumWorkspaceInviteStatus.accepted,
            });

            await expect(
                domain.resendInvite(workspace, 'user-1', 'invite-1', null)
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteAlreadyProcessed
                    ],
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
        });

        it('rotates the token, notifies, and returns the rotated invite', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                baseInvite
            );
            const rotated = { ...baseInvite, reference: 'WIN-xyz999' };
            workspaceInviteRepository.rotateForResend.mockResolvedValue(
                rotated
            );

            const result = await domain.resendInvite(
                workspace,
                'user-1',
                'invite-1',
                null
            );

            expect(result).toBe(rotated);
            expect(
                workspaceInviteRepository.rotateForResend
            ).toHaveBeenCalledWith(
                'invite-1',
                'hashed-token',
                expect.any(String),
                new Date('2026-01-08T00:00:00.000Z')
            );
            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).toHaveBeenCalledTimes(1);
        });
    });

    describe('revokeInvite', () => {
        it('throws WorkspaceInviteNotFoundException when the invite does not exist', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                domain.revokeInvite('workspace-1', 'user-1', 'invite-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteNotFound
                    ],
                messagePath: 'workspace.error.inviteNotFound',
            });
        });

        it('throws WorkspaceInviteAlreadyProcessedException when the invite is no longer pending', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue({
                ...baseInvite,
                status: EnumWorkspaceInviteStatus.expired,
            });

            await expect(
                domain.revokeInvite('workspace-1', 'user-1', 'invite-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteAlreadyProcessed
                    ],
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
        });

        it('revokes with a single activity log in order when no active user matches the invited email', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                baseInvite
            );
            userDomain.getOneActiveByEmail.mockResolvedValue(null);
            const stagedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceInviteRevoked,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
            const callOrder: string[] = [];
            workspaceInviteRepository.revoke.mockImplementation(async () => {
                callOrder.push('revoke');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await domain.revokeInvite('workspace-1', 'user-1', 'invite-1');

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceInviteRevoked,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { workspaceInviteId: 'invite-1' },
            });
            expect(workspaceInviteRepository.revoke).toHaveBeenCalledWith(
                'invite-1'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
            expect(callOrder).toEqual(['revoke', 'stagePrepared']);
        });

        it('revokes with two activity logs in order when the existing user differs from the actor', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                baseInvite
            );
            userDomain.getOneActiveByEmail.mockResolvedValue({
                ...baseUser,
                id: 'user-9',
            });
            const revokedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceInviteRevoked,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            const revokedByAdminActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceInviteRevokedByAdmin,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(revokedActivityLog)
                .mockReturnValueOnce(revokedByAdminActivityLog);

            await domain.revokeInvite('workspace-1', 'user-1', 'invite-1');

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(2);
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceInviteRevokedByAdmin,
                userId: 'user-9',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                revokedActivityLog,
                revokedByAdminActivityLog,
            ]);
        });

        it('revokes with a single activity log when the existing user is the actor', async () => {
            workspaceInviteRepository.findByIdAndWorkspace.mockResolvedValue(
                baseInvite
            );
            userDomain.getOneActiveByEmail.mockResolvedValue({
                ...baseUser,
                id: 'user-1',
            });
            const stagedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceInviteRevoked,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(stagedActivityLog);

            await domain.revokeInvite('workspace-1', 'user-1', 'invite-1');

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('acceptOnSignUpInTx', () => {
        const tx = {} as IDatabaseTransactionClient;

        it('creates the workspace membership and accepts the invite with no project', async () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            const context: IUserSignUpWorkspaceInvite = {
                type: EnumUserSignUpWorkspaceContextType.invite,
                workspaceId: 'workspace-1',
                workspaceInviteId: 'invite-1',
                invitedByUserId: 'user-1',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                projectId: null,
                projectMemberRole: null,
            };

            await domain.acceptOnSignUpInTx(tx, 'user-2', context);

            expect(workspaceMemberDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'user-2',
                EnumWorkspaceMemberRole.member,
                'user-2'
            );
            expect(workspaceInviteRepository.acceptInTx).toHaveBeenCalledWith(
                tx,
                'invite-1',
                'user-2',
                new Date('2026-01-01T00:00:00.000Z')
            );
            expect(projectMemberDomain.createInTx).not.toHaveBeenCalled();
        });

        it('creates the project membership as well when a project id and role are given', async () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            const context: IUserSignUpWorkspaceInvite = {
                type: EnumUserSignUpWorkspaceContextType.invite,
                workspaceId: 'workspace-1',
                workspaceInviteId: 'invite-1',
                invitedByUserId: 'user-1',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                projectId: 'project-1',
                projectMemberRole: EnumProjectMemberRole.member,
            };

            await domain.acceptOnSignUpInTx(tx, 'user-2', context);

            expect(projectMemberDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'project-1',
                'user-2',
                EnumProjectMemberRole.member,
                'user-2'
            );
        });
    });

    describe('claimInvite', () => {
        beforeEach(() => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            const tx = {} as IDatabaseTransactionClient;
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
        });

        it('throws WorkspaceInviteInvalidException when the token does not resolve a pending invite', async () => {
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                null
            );

            await expect(
                domain.claimInvite('user-1', 'user@example.com', 'raw-token')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteInvalid
                    ],
                messagePath: 'workspace.error.inviteInvalid',
            });
        });

        it('throws WorkspaceInviteInvalidException when the caller email does not match the invite', async () => {
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                { ...baseInvite, email: 'invitee@example.com' }
            );

            await expect(
                domain.claimInvite(
                    'user-1',
                    'someone-else@example.com',
                    'raw-token'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteInvalid
                    ],
                messagePath: 'workspace.error.inviteInvalid',
            });
        });

        it('throws WorkspaceInviteInvalidException when the caller is already a member', async () => {
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                { ...baseInvite, email: 'user@example.com' }
            );
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                {
                    id: 'member-1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    createdBy: null,
                    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                    updatedBy: null,
                    workspaceId: 'workspace-1',
                    userId: 'user-1',
                    role: EnumWorkspaceMemberRole.member,
                    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
                }
            );

            await expect(
                domain.claimInvite('user-1', 'user@example.com', 'raw-token')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteInvalid
                    ],
                messagePath: 'workspace.error.inviteInvalid',
            });
        });

        it('claims with a single activity log and no project membership when the caller invited itself', async () => {
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                {
                    ...baseInvite,
                    email: 'user@example.com',
                    invitedByUserId: 'user-1',
                }
            );
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            const stagedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceInviteAccepted,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(stagedActivityLog);

            await domain.claimInvite('user-1', 'user@example.com', 'raw-token');

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(1);
            expect(userDomain.setLastWorkspaceInTx).toHaveBeenCalledWith(
                {},
                'user-1',
                'workspace-1'
            );
            expect(projectMemberDomain.createInTx).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('claims with two activity logs and creates the project membership when both invitedByUserId and project fields differ', async () => {
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                {
                    ...baseInvite,
                    email: 'user@example.com',
                    invitedByUserId: 'user-9',
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                }
            );
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );
            const acceptedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceInviteAccepted,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            const acceptedByInviteeActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceInviteAcceptedByInvitee,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(acceptedActivityLog)
                .mockReturnValueOnce(acceptedByInviteeActivityLog);

            await domain.claimInvite('user-1', 'user@example.com', 'raw-token');

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(2);
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceInviteAcceptedByInvitee,
                userId: 'user-9',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(projectMemberDomain.createInTx).toHaveBeenCalledWith(
                {},
                'project-1',
                'user-1',
                EnumProjectMemberRole.member,
                'user-1'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                acceptedActivityLog,
                acceptedByInviteeActivityLog,
            ]);
        });
    });

    describe('previewInvite', () => {
        it('throws WorkspaceInviteInvalidException when the workspace is not active', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                baseInvite
            );
            workspaceRepository.findActiveById.mockResolvedValue(null);
            userDomain.getNameById.mockResolvedValue(null);

            await expect(
                domain.previewInvite('raw-token')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteInvalid
                    ],
                messagePath: 'workspace.error.inviteInvalid',
            });
        });

        it('returns the workspace, invite, and inviter', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            const invite = baseInvite;
            workspaceInviteRepository.findPendingByHashedToken.mockResolvedValue(
                invite
            );
            workspaceRepository.findActiveById.mockResolvedValue(workspace);
            const inviter: IWorkspaceInviteInviter = {
                name: 'Jane Doe',
                username: 'jane',
            };
            userDomain.getNameById.mockResolvedValue(inviter);

            const result = await domain.previewInvite('raw-token');

            expect(result).toEqual({ workspace, invite, inviter });
        });
    });

    describe('assertInvitationAllowed', () => {
        it('validates the invitationAllowed feature-flag metadata', async () => {
            await domain['assertInvitationAllowed']();

            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'invitationAllowed');
        });
    });

    describe('createInviteTokenData', () => {
        beforeEach(() => {
            helperStringService.random
                .mockReturnValueOnce('token-value')
                .mockReturnValueOnce('reference-suffix');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            helperDateService.forward.mockReturnValue(
                new Date('2026-01-08T00:00:00.000Z')
            );
            helperStringService.fillPattern
                .mockReturnValueOnce(
                    'https://app.example.com/invite/token-value'
                )
                .mockReturnValueOnce(
                    'https://app.example.com/sign-up/token-value'
                );
        });

        it('builds token data with the default expiry when none is given', () => {
            const result = domain['createInviteTokenData'](null);

            expect(result).toEqual({
                token: 'token-value',
                hashedToken: 'hashed-token',
                reference: 'WIN-reference-suffix',
                expiredAt: new Date('2026-01-08T00:00:00.000Z'),
                claimLink: 'https://app.example.com/invite/token-value',
                signUpLink: 'https://app.example.com/sign-up/token-value',
            });
            expect(helperDateService.forward).toHaveBeenCalledWith(
                new Date('2026-01-01T00:00:00.000Z'),
                Duration.fromObject({ days: 7 })
            );
        });

        it('builds token data with the given expiry duration', () => {
            domain['createInviteTokenData'](14);

            expect(helperDateService.forward).toHaveBeenCalledWith(
                new Date('2026-01-01T00:00:00.000Z'),
                Duration.fromObject({ days: 14 })
            );
        });
    });

    describe('sendInviteNotification', () => {
        const invite = baseInvite;
        const tokenData = {
            token: 'token-value',
            hashedToken: 'hashed-token',
            reference: 'WIN-abc123',
            expiredAt: new Date('2026-02-01T00:00:00.000Z'),
            claimLink: 'https://app.example.com/invite/token-value',
            signUpLink: 'https://app.example.com/sign-up/token-value',
        };

        beforeEach(() => {
            helperDateService.formatToIso.mockReturnValue(
                '2026-02-01T00:00:00.000Z'
            );
        });

        it('sends the in-app invite to an existing user', async () => {
            const existingUser = baseUser;
            userDomain.getNameById.mockResolvedValue({
                name: 'Jane Doe',
                username: 'jane',
            });

            await domain['sendInviteNotification'](
                workspace,
                invite,
                tokenData,
                'user-1',
                existingUser
            );

            expect(notificationQueue.sendWorkspaceInvite).toHaveBeenCalledWith(
                existingUser.id,
                expect.objectContaining({
                    inviteAcceptLink: tokenData.claimLink,
                    inviterName: 'Jane Doe',
                }),
                'user-1'
            );
            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).not.toHaveBeenCalled();
        });

        it('falls back to the inviter username, then the workspace name, and emails the unregistered invitee', async () => {
            userDomain.getNameById.mockResolvedValue(null);

            await domain['sendInviteNotification'](
                workspace,
                invite,
                tokenData,
                'user-1',
                null
            );

            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).toHaveBeenCalledWith(
                invite.email,
                expect.objectContaining({
                    inviteAcceptLink: tokenData.signUpLink,
                    inviterName: workspace.name,
                })
            );
            expect(
                notificationQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
        });

        it('falls back to the inviter username when the inviter has no name', async () => {
            userDomain.getNameById.mockResolvedValue({
                name: null,
                username: 'jane',
            });

            await domain['sendInviteNotification'](
                workspace,
                invite,
                tokenData,
                'user-1',
                null
            );

            expect(
                notificationEmailQueue.sendWorkspaceInviteUnregistered
            ).toHaveBeenCalledWith(
                invite.email,
                expect.objectContaining({ inviterName: 'jane' })
            );
        });
    });
});
