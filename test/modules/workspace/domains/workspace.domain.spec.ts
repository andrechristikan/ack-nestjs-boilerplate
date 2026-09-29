import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Prisma,
    TwoFactor,
    Workspace,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
} from '@modules/user/interfaces/user.interface';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
import { WorkspaceSlugInvalidException } from '@modules/workspace/exceptions/workspace.slug-invalid.exception';
import type {
    IWorkspaceCreate,
    IWorkspaceOwnedUser,
    IWorkspaceUpdate,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

describe('WorkspaceDomain', () => {
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceMemberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const workspaceInviteRepository: MockProxy<WorkspaceInviteRepository> =
        mock<WorkspaceInviteRepository>();
    const workspaceJoinRequestRepository: MockProxy<WorkspaceJoinRequestRepository> =
        mock<WorkspaceJoinRequestRepository>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const projectDomain: MockProxy<ProjectDomain> = mock<ProjectDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const userOnboardingDomain: MockProxy<UserOnboardingDomain> =
        mock<UserOnboardingDomain>();
    const userOnboardingUtil: MockProxy<UserOnboardingUtil> =
        mock<UserOnboardingUtil>();
    const userVerificationDomain: MockProxy<UserVerificationDomain> =
        mock<UserVerificationDomain>();
    const userTwoFactorDomain: MockProxy<UserTwoFactorDomain> =
        mock<UserTwoFactorDomain>();
    const passwordHistoryDomain: MockProxy<PasswordHistoryDomain> =
        mock<PasswordHistoryDomain>();
    const notificationDomain: MockProxy<NotificationDomain> =
        mock<NotificationDomain>();
    const termPolicyAcceptanceDomain: MockProxy<TermPolicyAcceptanceDomain> =
        mock<TermPolicyAcceptanceDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();

    const configValues: Record<string, unknown> = {
        'workspace.maxWorkspacesPerUser': 5,
        'workspace.slugRegex': /^[a-z0-9-]+$/,
        'workspace.slugPrefix': 'ws-',
        'workspace.slugMaxLength': 12,
        'workspace.slugMaxAttempts': 3,
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

    const twoFactor: TwoFactor = {
        id: 'two-factor-1',
        userId: 'user-1',
        secret: null,
        pendingSecret: null,
        backupCodes: [],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    function buildUser(id: string): IUser {
        return {
            id,
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
    }

    let domain: WorkspaceDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => configValues[key]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceDomain,
                { provide: WorkspaceRepository, useValue: workspaceRepository },
                {
                    provide: WorkspaceMemberRepository,
                    useValue: workspaceMemberRepository,
                },
                {
                    provide: WorkspaceInviteRepository,
                    useValue: workspaceInviteRepository,
                },
                {
                    provide: WorkspaceJoinRequestRepository,
                    useValue: workspaceJoinRequestRepository,
                },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                {
                    provide: WorkspaceInviteDomain,
                    useValue: workspaceInviteDomain,
                },
                { provide: ProjectDomain, useValue: projectDomain },
                { provide: UserDomain, useValue: userDomain },
                {
                    provide: UserOnboardingDomain,
                    useValue: userOnboardingDomain,
                },
                { provide: UserOnboardingUtil, useValue: userOnboardingUtil },
                {
                    provide: UserVerificationDomain,
                    useValue: userVerificationDomain,
                },
                {
                    provide: UserTwoFactorDomain,
                    useValue: userTwoFactorDomain,
                },
                {
                    provide: PasswordHistoryDomain,
                    useValue: passwordHistoryDomain,
                },
                { provide: NotificationDomain, useValue: notificationDomain },
                {
                    provide: TermPolicyAcceptanceDomain,
                    useValue: termPolicyAcceptanceDomain,
                },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: ConfigService, useValue: configService },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
            ],
        }).compile();

        domain = module.get(WorkspaceDomain);
    });

    describe('validateWorkspaceGuard', () => {
        it('throws WorkspaceNotFoundException when the id is null', async () => {
            await expect(
                domain.validateWorkspaceGuard(null)
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.notFound
                    ],
                messagePath: 'workspace.error.notFound',
            });
            expect(workspaceRepository.findActiveById).not.toHaveBeenCalled();
        });

        it('throws WorkspaceNotFoundException when no active workspace matches the id', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(null);

            await expect(
                domain.validateWorkspaceGuard('workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.notFound
                    ],
                messagePath: 'workspace.error.notFound',
            });
        });

        it('returns the active workspace resolved by id', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);

            const result = await domain.validateWorkspaceGuard('workspace-1');

            expect(result).toBe(workspace);
            expect(workspaceRepository.findActiveById).toHaveBeenCalledWith(
                'workspace-1'
            );
        });
    });

    describe('getListForMember', () => {
        it('delegates to the repository cursor listing', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput> =
                { limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [workspace],
            };
            workspaceRepository.findWithPaginationCursorByMember.mockResolvedValue(
                page
            );

            const result = await domain.getListForMember('user-1', pagination);

            expect(result).toBe(page);
            expect(
                workspaceRepository.findWithPaginationCursorByMember
            ).toHaveBeenCalledWith('user-1', pagination);
        });
    });

    describe('createInTx', () => {
        it('creates the workspace row and its owner membership', async () => {
            const tx = {} as IDatabaseTransactionClient;
            const create: IWorkspaceCreate = { name: 'Acme' };
            workspaceRepository.createInTx.mockResolvedValue(workspace);

            const result = await domain.createInTx(
                tx,
                'user-1',
                create,
                'acme-team',
                'workspace-1'
            );

            expect(result).toBe(workspace);
            expect(workspaceRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                create,
                'acme-team',
                'workspace-1'
            );
            expect(
                workspaceMemberRepository.createOwnerInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'user-1');
        });
    });

    describe('createPersonalInTx', () => {
        it('creates the workspace with only a name', async () => {
            const tx = {} as IDatabaseTransactionClient;
            workspaceRepository.createInTx.mockResolvedValue(workspace);

            await domain.createPersonalInTx(
                tx,
                'user-1',
                'Acme',
                'acme-team',
                'workspace-1'
            );

            expect(workspaceRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                { name: 'Acme' },
                'acme-team',
                'workspace-1'
            );
        });
    });

    describe('createOwnedForUsersInTx', () => {
        it('does nothing for an empty user list', async () => {
            const tx = {} as IDatabaseTransactionClient;

            await domain.createOwnedForUsersInTx(tx, []);

            expect(workspaceRepository.createInTx).not.toHaveBeenCalled();
        });

        it('creates a personal workspace for every owned user', async () => {
            const tx = {} as IDatabaseTransactionClient;
            const owned: IWorkspaceOwnedUser[] = [
                {
                    userId: 'user-1',
                    workspaceId: 'workspace-1',
                    name: 'User One',
                    slug: 'user-one',
                },
                {
                    userId: 'user-2',
                    workspaceId: 'workspace-2',
                    name: 'User Two',
                    slug: 'user-two',
                },
            ];
            workspaceRepository.createInTx.mockResolvedValue(workspace);

            await domain.createOwnedForUsersInTx(tx, owned);

            expect(workspaceRepository.createInTx).toHaveBeenNthCalledWith(
                1,
                tx,
                'user-1',
                { name: 'User One' },
                'user-one',
                'workspace-1'
            );
            expect(workspaceRepository.createInTx).toHaveBeenNthCalledWith(
                2,
                tx,
                'user-2',
                { name: 'User Two' },
                'user-two',
                'workspace-2'
            );
        });
    });

    describe('commitOnboarding', () => {
        const tx = {} as IDatabaseTransactionClient;

        const personalInput: IUserCreateWithWorkspaceInput = {
            userId: 'user-1',
            email: 'user1@example.com',
            name: 'User One',
            username: 'alice',
            countryId: 'country-1',
            roleId: 'role-1',
            signUpFrom: EnumUserSignUpFrom.website,
            signUpWith: EnumUserSignUpWith.credential,
            isVerified: false,
            termPolicy: {
                [EnumTermPolicyType.termsOfService]: true,
                [EnumTermPolicyType.privacy]: true,
                [EnumTermPolicyType.cookies]: true,
                [EnumTermPolicyType.marketing]: false,
            },
            acceptedTermPolicyTypes: [EnumTermPolicyType.termsOfService],
            password: {
                passwordHash: 'hashed',
                passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
                passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
                passwordPeriodExpired: new Date('2026-06-01T00:00:00.000Z'),
            },
            passwordHistoryType: EnumPasswordHistoryType.signUp,
            verification: {
                reference: 'VER-1',
                token: 'token-1',
                type: EnumVerificationType.email,
                to: 'user1@example.com',
                expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                verifiedAt: null,
                isUsed: false,
            },
            workspaceContext: {
                type: EnumUserSignUpWorkspaceContextType.personal,
                workspaceId: 'workspace-1',
                slugCandidates: ['user-one-a', 'user-one-b'],
                name: 'User One',
            },
            createdBy: 'user-1',
        };

        const inviteInput: IUserCreateWithWorkspaceInput = {
            userId: 'user-2',
            email: 'user2@example.com',
            name: 'User Two',
            username: 'bob',
            countryId: 'country-1',
            roleId: 'role-1',
            signUpFrom: EnumUserSignUpFrom.website,
            signUpWith: EnumUserSignUpWith.credential,
            isVerified: false,
            termPolicy: {
                [EnumTermPolicyType.termsOfService]: true,
                [EnumTermPolicyType.privacy]: true,
                [EnumTermPolicyType.cookies]: true,
                [EnumTermPolicyType.marketing]: false,
            },
            acceptedTermPolicyTypes: [EnumTermPolicyType.termsOfService],
            password: null,
            passwordHistoryType: null,
            verification: null,
            workspaceContext: {
                type: EnumUserSignUpWorkspaceContextType.invite,
                workspaceId: 'workspace-1',
                workspaceInviteId: 'invite-1',
                invitedByUserId: 'user-1',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                projectId: null,
                projectMemberRole: null,
            },
            createdBy: 'user-2',
        };

        beforeEach(() => {
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );
            userOnboardingDomain.createManyInTx.mockResolvedValue([
                buildUser('user-1'),
                buildUser('user-2'),
            ]);
            userTwoFactorDomain.createDisabledInTx.mockResolvedValue(twoFactor);
            userOnboardingDomain.buildOnboardingActivities.mockReturnValue([]);
            workspaceRepository.createInTx.mockResolvedValue(workspace);
        });

        it('commits onboarding on the first slug attempt, covering both branches of password, verification, and invite handling', async () => {
            const rows = await domain.commitOnboarding(
                [personalInput, inviteInput],
                EnumUserCreateMode.signUp,
                5000
            );

            expect(rows).toEqual([
                { ...buildUser('user-1'), twoFactor },
                { ...buildUser('user-2'), twoFactor },
            ]);
            expect(passwordHistoryDomain.createInTx).toHaveBeenCalledTimes(1);
            expect(passwordHistoryDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'hashed',
                EnumPasswordHistoryType.signUp,
                personalInput.password!.passwordPeriodExpired,
                personalInput.password!.passwordCreated,
                'user-1'
            );
            expect(
                notificationDomain.createDefaultsInTx
            ).toHaveBeenNthCalledWith(1, tx, 'user-1');
            expect(
                notificationDomain.createDefaultsInTx
            ).toHaveBeenNthCalledWith(2, tx, 'user-2');
            expect(
                userVerificationDomain.createFromOnboardingInTx
            ).toHaveBeenCalledTimes(1);
            expect(
                userVerificationDomain.createFromOnboardingInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                personalInput.verification,
                'user-1'
            );
            expect(
                userTwoFactorDomain.createDisabledInTx
            ).toHaveBeenNthCalledWith(1, tx, 'user-1', 'user-1');
            expect(
                userTwoFactorDomain.createDisabledInTx
            ).toHaveBeenNthCalledWith(2, tx, 'user-2', 'user-2');
            expect(workspaceRepository.createInTx).toHaveBeenCalledTimes(1);
            expect(workspaceRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                { name: 'User One' },
                'user-one-a',
                'workspace-1'
            );
            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).toHaveBeenCalledWith(tx, 'user-2', inviteInput.workspaceContext);
            expect(
                termPolicyAcceptanceDomain.acceptPublishedInTx
            ).toHaveBeenNthCalledWith(
                1,
                tx,
                'user-1',
                [EnumTermPolicyType.termsOfService],
                'user-1'
            );
            expect(
                termPolicyAcceptanceDomain.acceptPublishedInTx
            ).toHaveBeenNthCalledWith(
                2,
                tx,
                'user-2',
                [EnumTermPolicyType.termsOfService],
                'user-2'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([]);
        });

        it('falls back to a single attempt when no personal-context input carries slug candidates', async () => {
            await domain.commitOnboarding(
                [inviteInput],
                EnumUserCreateMode.signUp,
                5000
            );

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(workspaceRepository.createInTx).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([]);
        });

        it('retries with the next slug candidate after a slug collision and commits', async () => {
            const collision = new Error('slug collision');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx));
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const rows = await domain.commitOnboarding(
                [personalInput],
                EnumUserCreateMode.signUp,
                5000
            );

            expect(rows).toHaveLength(1);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'slug'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([]);
        });

        it('throws DatabaseUniqueValueGenerationFailedException when every slug candidate collides', async () => {
            const collision = new Error('slug collision');
            databaseService.withTransaction.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                domain.commitOnboarding(
                    [personalInput],
                    EnumUserCreateMode.signUp,
                    5000
                )
            ).rejects.toMatchObject({
                constructor: DatabaseUniqueValueGenerationFailedException,
                module: 'database',
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
                statusCodeKey:
                    EnumDatabaseStatusCodeError[
                        EnumDatabaseStatusCodeError.uniqueValueGenerationFailed
                    ],
                messagePath: 'database.error.uniqueValueGenerationFailed',
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
        });

        it('maps a non-collision transaction error through the onboarding util and throws it', async () => {
            const otherError = new Error('duplicate email');
            databaseService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            const mapped = new Error('mapped exception');
            userOnboardingUtil.mapCreateCollision.mockReturnValue(mapped);

            await expect(
                domain.commitOnboarding(
                    [personalInput],
                    EnumUserCreateMode.signUp,
                    5000
                )
            ).rejects.toBe(mapped);
            expect(userOnboardingUtil.mapCreateCollision).toHaveBeenCalledWith(
                otherError
            );
        });

        it('builds the admin payload metadata event and stages it', async () => {
            userOnboardingDomain.buildAdminPayloadMetadata.mockReturnValue({
                userCount: 1,
            });
            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.adminUserImport,
                metadata: { userCount: 1 },
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(stagedEvent);

            await domain.commitOnboarding(
                [inviteInput],
                EnumUserCreateMode.admin,
                5000,
                EnumActivityLogAction.adminUserImport
            );

            expect(
                userOnboardingDomain.buildAdminPayloadMetadata
            ).toHaveBeenCalledWith(EnumActivityLogAction.adminUserImport, [
                { ...buildUser('user-1'), twoFactor },
            ]);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminUserImport,
                metadata: { userCount: 1 },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
        });
    });

    describe('createWorkspace', () => {
        const create: IWorkspaceCreate = { name: 'Acme' };

        it('throws WorkspaceCapReachedException when the owner already meets the cap', async () => {
            workspaceMemberRepository.countOwnedActiveByUser.mockResolvedValue(
                5
            );

            await expect(
                domain.createWorkspace('user-1', create)
            ).rejects.toMatchObject({
                constructor: WorkspaceCapReachedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.capReached,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.capReached
                    ],
                messagePath: 'workspace.error.capReached',
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('creates the workspace on the first slug candidate and stages the created activity', async () => {
            workspaceMemberRepository.countOwnedActiveByUser.mockResolvedValue(
                1
            );
            helperStringService.generateSlug
                .mockReturnValueOnce('ws-aaa')
                .mockReturnValueOnce('ws-bbb')
                .mockReturnValueOnce('ws-ccc');
            databaseUtil.createId.mockReturnValue('workspace-1');
            const tx = {} as IDatabaseTransactionClient;
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceRepository.createInTx.mockResolvedValue(workspace);
            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.workspaceCreated,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(stagedEvent);

            const result = await domain.createWorkspace('user-1', create);

            expect(result).toBe(workspace);
            expect(workspaceRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                create,
                'ws-aaa',
                'workspace-1'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceCreated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
        });

        it('retries with the next slug candidate after a collision and creates on the second attempt', async () => {
            workspaceMemberRepository.countOwnedActiveByUser.mockResolvedValue(
                1
            );
            helperStringService.generateSlug
                .mockReturnValueOnce('ws-aaa')
                .mockReturnValueOnce('ws-bbb')
                .mockReturnValueOnce('ws-ccc');
            databaseUtil.createId.mockReturnValue('workspace-1');
            const tx = {} as IDatabaseTransactionClient;
            const collision = new Error('slug collision');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(fn => fn(tx));
            databaseUtil.isUniqueCollision.mockReturnValue(true);
            workspaceRepository.createInTx.mockResolvedValue(workspace);
            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.workspaceCreated,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(stagedEvent);

            const result = await domain.createWorkspace('user-1', create);

            expect(result).toBe(workspace);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
        });

        it('propagates a non-collision transaction error without retrying', async () => {
            workspaceMemberRepository.countOwnedActiveByUser.mockResolvedValue(
                1
            );
            helperStringService.generateSlug.mockReturnValue('ws-aaa');
            databaseUtil.createId.mockReturnValue('workspace-1');
            const otherError = new Error('unexpected');
            databaseService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(domain.createWorkspace('user-1', create)).rejects.toBe(
                otherError
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('throws DatabaseUniqueValueGenerationFailedException when every slug candidate collides', async () => {
            workspaceMemberRepository.countOwnedActiveByUser.mockResolvedValue(
                1
            );
            helperStringService.generateSlug
                .mockReturnValueOnce('ws-aaa')
                .mockReturnValueOnce('ws-bbb')
                .mockReturnValueOnce('ws-ccc');
            databaseUtil.createId.mockReturnValue('workspace-1');
            const collision = new Error('slug collision');
            databaseService.withTransaction.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                domain.createWorkspace('user-1', create)
            ).rejects.toMatchObject({
                constructor: DatabaseUniqueValueGenerationFailedException,
                module: 'database',
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(3);
        });
    });

    describe('getCurrentWorkspace', () => {
        it('returns the given workspace unchanged', () => {
            expect(domain.getCurrentWorkspace(workspace)).toBe(workspace);
        });
    });

    describe('updateWorkspace', () => {
        it('updates the workspace details and stages the updated activity', async () => {
            const update: IWorkspaceUpdate = { name: 'Acme 2' };
            workspaceRepository.updateDetails.mockResolvedValue(workspace);
            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.workspaceUpdated,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(stagedEvent);

            const result = await domain.updateWorkspace(
                'workspace-1',
                'user-1',
                update
            );

            expect(result).toBe(workspace);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceUpdated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(workspaceRepository.updateDetails).toHaveBeenCalledWith(
                'workspace-1',
                update
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
        });
    });

    describe('updateWorkspaceIsPublic', () => {
        it('updates the visibility and stages the visibility-updated activity in order', async () => {
            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.workspaceVisibilityUpdated,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(stagedEvent);
            const callOrder: string[] = [];
            workspaceRepository.updateIsPublic.mockImplementation(async () => {
                callOrder.push('updateIsPublic');
                return workspace;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            const result = await domain.updateWorkspaceIsPublic(
                'workspace-1',
                'user-1',
                true
            );

            expect(result).toBe(workspace);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceVisibilityUpdated,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(workspaceRepository.updateIsPublic).toHaveBeenCalledWith(
                'workspace-1',
                true
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
            expect(callOrder).toEqual(['updateIsPublic', 'stagePrepared']);
        });
    });

    describe('updateWorkspaceSlug', () => {
        it('throws WorkspaceSlugInvalidException before checking availability when the slug breaks the pattern', async () => {
            await expect(
                domain.updateWorkspaceSlug(
                    'workspace-1',
                    'user-1',
                    'Invalid Slug!'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceSlugInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.slugInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.slugInvalid
                    ],
                messagePath: 'workspace.error.slugInvalid',
            });
            expect(workspaceRepository.existsBySlug).not.toHaveBeenCalled();
        });

        it('throws WorkspaceSlugAlreadyExistsException when the slug is taken', async () => {
            workspaceRepository.existsBySlug.mockResolvedValue(true);

            await expect(
                domain.updateWorkspaceSlug('workspace-1', 'user-1', 'taken')
            ).rejects.toMatchObject({
                constructor: WorkspaceSlugAlreadyExistsException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.slugAlreadyExists,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.slugAlreadyExists
                    ],
                messagePath: 'workspace.error.slugAlreadyExists',
            });
            expect(workspaceRepository.updateSlug).not.toHaveBeenCalled();
        });

        it('updates the slug and stages the updated activity', async () => {
            workspaceRepository.existsBySlug.mockResolvedValue(false);
            workspaceRepository.updateSlug.mockResolvedValue(workspace);
            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.workspaceUpdated,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(stagedEvent);

            const result = await domain.updateWorkspaceSlug(
                'workspace-1',
                'user-1',
                'acme-team'
            );

            expect(result).toBe(workspace);
            expect(workspaceRepository.existsBySlug).toHaveBeenCalledWith(
                'acme-team',
                'workspace-1'
            );
            expect(workspaceRepository.updateSlug).toHaveBeenCalledWith(
                'workspace-1',
                'acme-team'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
        });
    });

    describe('switchWorkspace', () => {
        it('stops before switching when the workspace guard rejects the workspace', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(null);

            await expect(
                domain.switchWorkspace('user-1', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.notFound
                    ],
                messagePath: 'workspace.error.notFound',
            });
            expect(
                workspaceMemberDomain.validateWorkspaceMemberGuard
            ).not.toHaveBeenCalled();
            expect(userDomain.setLastWorkspace).not.toHaveBeenCalled();
        });

        it('validates membership and sets the last workspace', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);
            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.workspaceSwitched,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(stagedEvent);

            await domain.switchWorkspace('user-1', 'workspace-1');

            expect(
                workspaceMemberDomain.validateWorkspaceMemberGuard
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceSwitched,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(userDomain.setLastWorkspace).toHaveBeenCalledWith(
                'user-1',
                'workspace-1'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
        });
    });

    describe('softDeleteWorkspace', () => {
        it('soft-deletes the workspace and its dependents inside a transaction', async () => {
            const deletedAt = new Date('2026-03-01T00:00:00.000Z');
            helperDateService.create.mockReturnValue(deletedAt);
            const tx = {} as IDatabaseTransactionClient;
            databaseService.withTransaction.mockImplementation(fn => fn(tx));
            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.workspaceDeleted,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(stagedEvent);

            await domain.softDeleteWorkspace('workspace-1', 'user-1');

            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceDeleted,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
            });
            expect(workspaceRepository.softDeleteInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                deletedAt
            );
            expect(
                projectDomain.softDeleteByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', deletedAt, 'user-1');
            expect(
                workspaceInviteRepository.expirePendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1');
            expect(
                workspaceJoinRequestRepository.cancelPendingByWorkspaceInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1');
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
        });
    });

    describe('getListForAdmin', () => {
        it('delegates to the repository offset listing with the isPublic filter', async () => {
            const pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput> =
                { limit: 20, skip: 0, orderBy: [] };
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [workspace],
            };
            workspaceRepository.findWithPaginationOffsetForAdmin.mockResolvedValue(
                page
            );

            const result = await domain.getListForAdmin(pagination, {
                isPublic: { equals: true },
            });

            expect(result).toBe(page);
            expect(
                workspaceRepository.findWithPaginationOffsetForAdmin
            ).toHaveBeenCalledWith(pagination, { isPublic: { equals: true } });
        });
    });

    describe('getByIdForAdmin', () => {
        it('throws WorkspaceNotFoundException when the workspace does not exist', async () => {
            workspaceRepository.findByIdForAdmin.mockResolvedValue(null);

            await expect(
                domain.getByIdForAdmin('workspace-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.notFound
                    ],
                messagePath: 'workspace.error.notFound',
            });
        });

        it('returns the workspace resolved for admin', async () => {
            workspaceRepository.findByIdForAdmin.mockResolvedValue(workspace);

            const result = await domain.getByIdForAdmin('workspace-1');

            expect(result).toBe(workspace);
        });
    });

    describe('previewWorkspace', () => {
        it('throws WorkspaceNotFoundException when no active public workspace matches the slug', async () => {
            workspaceRepository.findActivePublicBySlug.mockResolvedValue(null);

            await expect(
                domain.previewWorkspace('acme-team')
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.notFound
                    ],
                messagePath: 'workspace.error.notFound',
            });
            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'joinRequestAllowed');
        });

        it('returns the public workspace resolved by slug', async () => {
            workspaceRepository.findActivePublicBySlug.mockResolvedValue(
                workspace
            );

            const result = await domain.previewWorkspace('acme-team');

            expect(result).toBe(workspace);
        });
    });

    describe('drawSlugCandidates', () => {
        it('draws one slug candidate per configured attempt', () => {
            helperStringService.generateSlug
                .mockReturnValueOnce('ws-aaa')
                .mockReturnValueOnce('ws-bbb')
                .mockReturnValueOnce('ws-ccc');

            const result = domain['drawSlugCandidates']();

            expect(result).toEqual(['ws-aaa', 'ws-bbb', 'ws-ccc']);
            expect(helperStringService.generateSlug).toHaveBeenCalledTimes(3);
            expect(helperStringService.generateSlug).toHaveBeenNthCalledWith(
                1,
                'ws-',
                12
            );
        });
    });

    describe('assertSlugAllowed', () => {
        it('does not throw for a slug matching the pattern and length', () => {
            expect(() =>
                domain['assertSlugAllowed']('acme-team')
            ).not.toThrow();
        });

        it('throws WorkspaceSlugInvalidException for a slug breaking the pattern', () => {
            let thrown: unknown;
            try {
                domain['assertSlugAllowed']('Not Allowed!');
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(WorkspaceSlugInvalidException);
            expect(thrown).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.slugInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.slugInvalid
                    ],
                messagePath: 'workspace.error.slugInvalid',
            });
        });

        it('throws WorkspaceSlugInvalidException for a slug exceeding the max length', () => {
            let thrown: unknown;
            try {
                domain['assertSlugAllowed']('a'.repeat(13));
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(WorkspaceSlugInvalidException);
            expect(thrown).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.slugInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.slugInvalid
                    ],
                messagePath: 'workspace.error.slugInvalid',
            });
        });
    });

    describe('assertJoinRequestAllowed', () => {
        it('validates the joinRequestAllowed feature-flag metadata', async () => {
            await domain['assertJoinRequestAllowed']();

            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'joinRequestAllowed');
        });
    });

    describe('buildOwnedUsers', () => {
        it('maps only personal-context inputs into owned users at the given slug attempt', () => {
            const personalInput: IUserCreateWithWorkspaceInput = {
                userId: 'user-1',
                email: 'user1@example.com',
                name: 'User One',
                username: 'alice',
                countryId: 'country-1',
                roleId: 'role-1',
                signUpFrom: EnumUserSignUpFrom.website,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified: false,
                termPolicy: {
                    [EnumTermPolicyType.termsOfService]: true,
                    [EnumTermPolicyType.privacy]: true,
                    [EnumTermPolicyType.cookies]: true,
                    [EnumTermPolicyType.marketing]: false,
                },
                acceptedTermPolicyTypes: [EnumTermPolicyType.termsOfService],
                password: null,
                passwordHistoryType: null,
                verification: null,
                workspaceContext: {
                    type: EnumUserSignUpWorkspaceContextType.personal,
                    workspaceId: 'workspace-1',
                    slugCandidates: ['slug-a', 'slug-b'],
                    name: 'User One',
                },
                createdBy: 'user-1',
            };
            const inviteInput: IUserCreateWithWorkspaceInput = {
                userId: 'user-2',
                email: 'user2@example.com',
                name: 'User Two',
                username: 'bob',
                countryId: 'country-1',
                roleId: 'role-1',
                signUpFrom: EnumUserSignUpFrom.website,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified: false,
                termPolicy: {
                    [EnumTermPolicyType.termsOfService]: true,
                    [EnumTermPolicyType.privacy]: true,
                    [EnumTermPolicyType.cookies]: true,
                    [EnumTermPolicyType.marketing]: false,
                },
                acceptedTermPolicyTypes: [EnumTermPolicyType.termsOfService],
                password: null,
                passwordHistoryType: null,
                verification: null,
                workspaceContext: {
                    type: EnumUserSignUpWorkspaceContextType.invite,
                    workspaceId: 'workspace-1',
                    workspaceInviteId: 'invite-1',
                    invitedByUserId: 'user-1',
                    workspaceMemberRole: EnumWorkspaceMemberRole.member,
                    projectId: null,
                    projectMemberRole: null,
                },
                createdBy: 'user-2',
            };

            const result = domain['buildOwnedUsers'](
                [personalInput, inviteInput],
                1
            );

            expect(result).toEqual([
                {
                    userId: 'user-1',
                    workspaceId: 'workspace-1',
                    name: 'User One',
                    slug: 'slug-b',
                },
            ]);
        });
    });

    describe('prepareOnboardingActivities', () => {
        const user = buildUser('user-1');

        it('adds no admin event when no admin action is given', () => {
            userOnboardingDomain.buildOnboardingActivities.mockReturnValue([]);

            const events = domain['prepareOnboardingActivities'](
                [],
                [],
                EnumUserCreateMode.signUp
            );

            expect(events).toEqual([]);
            expect(
                userOnboardingDomain.buildAdminPayloadMetadata
            ).not.toHaveBeenCalled();
        });

        it('adds the admin payload event and every onboarding activity when an admin action is given', () => {
            const stagedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.adminUserImport,
                metadata: { userCount: 1 },
                onError: false,
            };
            const activityEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userCreated,
                metadata: {},
                onError: false,
            };
            userOnboardingDomain.buildAdminPayloadMetadata.mockReturnValue({
                userCount: 1,
            });
            userOnboardingDomain.buildOnboardingActivities.mockReturnValue([
                {
                    action: EnumActivityLogAction.userCreated,
                    userId: 'user-1',
                    workspaceId: null,
                    createdBy: 'user-1',
                    metadata: {},
                },
            ]);
            activityLogDomain.prepare
                .mockReturnValueOnce(stagedEvent)
                .mockReturnValueOnce(activityEvent);

            const events = domain['prepareOnboardingActivities'](
                [personalInputFixture()],
                [user],
                EnumUserCreateMode.admin,
                EnumActivityLogAction.adminUserImport
            );

            expect(events).toEqual([stagedEvent, activityEvent]);
            expect(
                userOnboardingDomain.buildAdminPayloadMetadata
            ).toHaveBeenCalledWith(EnumActivityLogAction.adminUserImport, [
                user,
            ]);
        });

        function personalInputFixture(): IUserCreateWithWorkspaceInput {
            return {
                userId: 'user-1',
                email: 'user1@example.com',
                name: 'User One',
                username: 'alice',
                countryId: 'country-1',
                roleId: 'role-1',
                signUpFrom: EnumUserSignUpFrom.website,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified: false,
                termPolicy: {
                    [EnumTermPolicyType.termsOfService]: true,
                    [EnumTermPolicyType.privacy]: true,
                    [EnumTermPolicyType.cookies]: true,
                    [EnumTermPolicyType.marketing]: false,
                },
                acceptedTermPolicyTypes: [EnumTermPolicyType.termsOfService],
                password: null,
                passwordHistoryType: null,
                verification: null,
                workspaceContext: {
                    type: EnumUserSignUpWorkspaceContextType.personal,
                    workspaceId: 'workspace-1',
                    slugCandidates: ['user-one-a'],
                    name: 'User One',
                },
                createdBy: 'user-1',
            };
        }
    });
});
