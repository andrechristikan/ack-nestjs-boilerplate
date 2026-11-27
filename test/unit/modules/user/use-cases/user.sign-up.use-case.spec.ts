import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { setImmediate } from 'node:timers/promises';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumProjectMemberRole,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumVerificationType,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { Country, WorkspaceInvite } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { CountryService } from '@modules/country/services/country.service';
import { AuthPasswordCommonException } from '@modules/auth/exceptions/auth.password-common.exception';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type { INotificationVerificationLinkContext } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { RoleService } from '@modules/role/services/role.service';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import type {
    ITermPolicyAcceptanceCreate,
    ITermPolicyRef,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRequiredNotPublishedException } from '@modules/term-policy/exceptions/term-policy.required-not-published.exception';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
import { UserService } from '@modules/user/services/user.service';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { EnumUserCreateWorkspaceContextType } from '@modules/user/enums/user.enum';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type {
    IUserCheckUsername,
    IUserCreateWithWorkspaceInput,
    IUserRegistration,
    IUserCreateWorkspaceInvite,
    IUserCreateWorkspacePersonal,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { UserSignUpUseCase } from '@modules/user/use-cases/user.sign-up.use-case';
import {
    buildApiKeyContext,
    buildRequestContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserSignUpUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const authPasswordService: MockProxy<AuthPasswordService> =
        mock<AuthPasswordService>();
    const userRegistrationService: MockProxy<UserRegistrationService> =
        mock<UserRegistrationService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const countryService: MockProxy<CountryService> = mock<CountryService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    let useCase: UserSignUpUseCase;
    let databaseUtil: DatabaseUtil;
    let helperStringService: HelperStringService;

    const tx = {} as IDatabaseTransactionClient;
    const configValues: Record<string, unknown> = {
        ...TestUnitUserConfigValues,
        'workspace.slugMaxAttempts': 2,
        'app.name': 'ACK Boilerplate',
        'user.default.role': 'user',
        'user.default.country': 'ID',
        'user.createTimeoutInMs': 5000,
        'user.createBulkTimeoutInMs': 30000,
    };
    const contextWords = [
        'ACK Boilerplate',
        'bramble',
        'bramble2fox',
        'Bramble Fox',
    ];
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const activityEntry = buildActivityLogCreateManyEffect('activity-entry');
    const welcomeEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.welcome,
            context: {
                userId: 'user-bramble',
                proceedBy: 'user-bramble',
                snapshot: null,
                verificationId: null,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'welcome-user-bramble',
    };
    const verificationEffect: INotificationNotifyEffect = {
        ...welcomeEffect,
        data: {
            ...welcomeEffect.data,
            kind: EnumNotificationKind.verificationEmail,
        },
        idempotencyKey: 'verificationEmail-VRF-bramble',
    };
    const country: Country = {
        id: 'country-bramble',
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        phoneCode: ['62'],
        continent: 'Asia',
        timezone: 'Asia/Jakarta',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const personalContext: IUserCreateWorkspacePersonal = {
        type: EnumUserCreateWorkspaceContextType.personal,
        workspaceId: 'workspace-bramble',
        slugCandidates: ['w-bramble', 'w-bramble-b'],
        name: "bramble2fox's Workspace",
    };
    const inviteContext: IUserCreateWorkspaceInvite = {
        type: EnumUserCreateWorkspaceContextType.invite,
        workspaceId: 'workspace-invite',
        workspaceInviteId: 'invite-bramble',
        invitedByUserId: 'user-inviter',
        workspaceMemberRole: EnumWorkspaceMemberRole.member,
        projectId: 'project-bramble',
        projectMemberRole: EnumProjectMemberRole.admin,
    };
    const password: IAuthPassword = {
        passwordHash: 'hashed',
        passwordExpired: null,
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };
    const input: IUserCreateWithWorkspaceInput = {
        userId: 'user-bramble',
        email: 'bramble@example.com',
        name: null,
        username: 'bramble2fox',
        countryId: 'country-bramble',
        roleId: 'role-bramble',
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        isVerified: false,
        verifiedAt: null,
        acceptedTermPolicyTypes: [EnumTermPolicyType.termsOfService],
        password,
        passwordHistoryType: EnumPasswordHistoryType.signUp,
        verification: {
            reference: 'VRF-bramble',
            token: 'hashed-token',
            type: EnumVerificationType.email,
            action: null,
            mobileNumberId: null,
            to: 'bramble@example.com',
            expiredAt: new Date('2026-03-05T00:00:00.000Z'),
            verifiedAt: null,
            isUsed: false,
        },
        login: null,
        workspaceContext: personalContext,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        createdBy: 'user-bramble',
    };
    const inviteInput: IUserCreateWithWorkspaceInput = {
        ...input,
        workspaceContext: inviteContext,
    };
    const emailVerification: IUserVerificationEmailCreate = {
        type: 'email',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        expiredInMinutes: 15,
        resendInMinutes: 5,
        reference: 'VRF-bramble',
        token: 'raw-token',
        hashedToken: 'hashed-token',
        link: 'https://example.com/verify-email?token=raw-token',
    };
    const verificationContext: INotificationVerificationLinkContext = {
        userId: 'user-bramble',
        proceedBy: 'user-bramble',
        link: 'https://example.com/verify-email?token=raw-token',
        expiredAt: '2026-03-05T00:00:00.000Z',
        expiredInMinutes: 15,
        reference: 'VRF-bramble',
    };
    const acceptanceEntry: ITermPolicyAcceptanceCreate = {
        userId: 'user-bramble',
        types: [EnumTermPolicyType.termsOfService],
        createdBy: 'user-bramble',
    };
    const termPolicyRefs: ITermPolicyRef[] = [
        {
            id: 'term-policy-terms',
            type: EnumTermPolicyType.termsOfService,
            version: 1,
        },
    ];
    const stageInput = {
        action: EnumActivityLogAction.userSignedUp,
        userId: 'user-bramble',
        createdBy: 'user-bramble',
        metadata: {},
    };
    const clearUsername: IUserCheckUsername = {
        badWord: false,
        exist: false,
        pattern: false,
    };
    const role: IRole = {
        id: 'role-bramble',
        name: 'user',
        type: EnumRoleType.user,
        isImmutable: false,
    };
    const invite: WorkspaceInvite = {
        id: 'invite-bramble',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-inviter',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-inviter',
        workspaceId: 'workspace-invite',
        email: 'bramble@example.com',
        token: 'hashed-token',
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: 'project-bramble',
        projectRole: EnumProjectMemberRole.admin,
        reference: 'WIN-bramble',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'user-inviter',
        acceptedAt: null,
        acceptedByUserId: null,
        nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        activityLogQueue.recordEffect.mockReturnValue(activityEntry);
        notificationQueue.notify.mockImplementation(kind =>
            kind === EnumNotificationKind.welcome
                ? welcomeEffect
                : verificationEffect
        );
        roleService.getByName.mockResolvedValue(role);
        countryService.getOne.mockResolvedValue(country);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserSignUpUseCase,
                { provide: UserService, useValue: userService },
                { provide: AuthPasswordService, useValue: authPasswordService },
                AuthPasswordUtil,
                {
                    provide: UserRegistrationService,
                    useValue: userRegistrationService,
                },
                { provide: MfaService, useValue: mfaService },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
                { provide: WorkspaceService, useValue: workspaceService },
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                { provide: RoleService, useValue: roleService },
                { provide: CountryService, useValue: countryService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
                UserCreateUtil,
                UserVerificationUtil,
                WorkspaceUtil,
                HelperStringService,
                HelperDateService,
                HelperHashService,
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                DatabaseUtil,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        useCase = module.get(UserSignUpUseCase);
        databaseUtil = module.get(DatabaseUtil);
        helperStringService = module.get(HelperStringService);
    });

    describe('execute', () => {
        const dto: UserSignUpRequestDto = {
            username: 'bramble2fox',
            countryId: 'country-bramble',
            email: 'bramble@example.com' as Lowercase<string>,
            password: 'plainPassword123!',
            marketing: true,
            cookies: true,
            from: EnumUserSignUpFrom.website,
        };
        const signUpInput: IUserRegistration = {
            username: 'bramble2fox',
            email: 'bramble@example.com',
            name: null,
            countryId: 'country-bramble',
            password: 'plainPassword123!',
            from: EnumUserSignUpFrom.website,
            cookies: true,
            marketing: true,
            inviteToken: null,
        };

        beforeEach(() => {
            workspaceInviteService.getSignUpInvite.mockResolvedValue(null);
            vi.spyOn(databaseUtil, 'createId').mockReturnValue(
                'workspace-bramble'
            );
            vi.spyOn(helperStringService, 'random')
                .mockReturnValueOnce('bramble')
                .mockReturnValueOnce('bramble-b');
            userRegistrationService.prepareSignUp.mockResolvedValue({
                input,
                emailVerification,
            });
            userService.existsByEmail.mockResolvedValue(false);
            userService.checkUsername.mockResolvedValue(clearUsername);
            termPolicyAcceptanceService.getPublishedForAcceptance.mockResolvedValue(
                termPolicyRefs
            );
        });

        it('commits the new user on one transaction, adds the created entries and the welcome and verification effects on the same tx, and returns an empty envelope', async () => {
            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({});

            expect(workspaceInviteService.getSignUpInvite).toHaveBeenCalledWith(
                null,
                'bramble@example.com'
            );
            expect(roleService.getByName).toHaveBeenCalledWith('user');
            expect(countryService.getOne).toHaveBeenCalledWith(
                'country-bramble'
            );
            expect(
                termPolicyAcceptanceService.getPublishedForAcceptance
            ).toHaveBeenCalledWith(
                [EnumTermPolicyType.termsOfService, EnumTermPolicyType.privacy],
                [
                    EnumTermPolicyType.termsOfService,
                    EnumTermPolicyType.privacy,
                    EnumTermPolicyType.cookies,
                    EnumTermPolicyType.marketing,
                ]
            );
            expect(userRegistrationService.prepareSignUp).toHaveBeenCalledWith(
                signUpInput,
                { roleId: 'role-bramble', workspaceContext: personalContext }
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                null,
                stageInput
            );
            expect(notificationQueue.notify).toHaveBeenCalledTimes(2);
            expect(notificationQueue.notify).toHaveBeenNthCalledWith(
                1,
                EnumNotificationKind.welcome,
                { userId: 'user-bramble', proceedBy: 'user-bramble' }
            );
            expect(notificationQueue.notify).toHaveBeenNthCalledWith(
                2,
                EnumNotificationKind.verificationEmail,
                verificationContext
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                activityEntry,
                activityEntry,
                activityEntry,
                welcomeEffect,
                verificationEffect,
            ]);
            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).toHaveBeenCalledWith(tx, termPolicyRefs, [acceptanceEntry]);
        });

        it('refuses a disallowed password with the application name, the email local part, the username, and the name before it prepares the user', async () => {
            const refused = new AuthPasswordCommonException();
            authPasswordService.assertAllowed.mockRejectedValue(refused);

            await expect(
                useCase.execute(requestContext, apiKeyContext, {
                    ...dto,
                    name: 'Bramble Fox',
                })
            ).rejects.toBe(refused);

            expect(authPasswordService.assertAllowed).toHaveBeenCalledWith(
                'plainPassword123!',
                contextWords
            );
            expect(
                userRegistrationService.prepareSignUp
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('adds the effects after the last write and before the commit returns', async () => {
            await useCase.execute(requestContext, apiKeyContext, dto);

            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).toHaveBeenCalledBefore(outboxService.addManyInTx);
        });

        it('forwards the name and the invite token when a token is present', async () => {
            workspaceInviteService.getSignUpInvite.mockResolvedValue(invite);

            await useCase.execute(requestContext, apiKeyContext, {
                ...dto,
                name: 'Bramble Fox',
                inviteToken: 'raw-token',
            });

            expect(workspaceInviteService.getSignUpInvite).toHaveBeenCalledWith(
                'raw-token',
                'bramble@example.com'
            );
            expect(userRegistrationService.prepareSignUp).toHaveBeenCalledWith(
                {
                    ...signUpInput,
                    name: 'Bramble Fox',
                    inviteToken: 'raw-token',
                },
                { roleId: 'role-bramble', workspaceContext: inviteContext }
            );
        });

        it('throws the disabled exception when invitations are closed', async () => {
            workspaceInviteService.getSignUpInvite.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, {
                    ...dto,
                    inviteToken: 'raw-token',
                })
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
            });
        });

        it('throws the invite exception when the invite does not resolve', async () => {
            workspaceInviteService.getSignUpInvite.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, {
                    ...dto,
                    inviteToken: 'raw-token',
                })
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
            });
        });

        it('calls the role, email, username, country, password, and term policy checks while the invite read is still pending', async () => {
            const inviteRead = buildDeferred<null>();
            workspaceInviteService.getSignUpInvite.mockReturnValue(
                inviteRead.promise
            );

            const running = useCase.execute(requestContext, apiKeyContext, dto);

            expect(roleService.getByName).toHaveBeenCalledWith('user');
            expect(userService.existsByEmail).toHaveBeenCalledWith(
                'bramble@example.com'
            );
            expect(userService.checkUsername).toHaveBeenCalledWith(
                'bramble2fox'
            );
            expect(countryService.getOne).toHaveBeenCalledWith(
                'country-bramble'
            );
            expect(authPasswordService.assertAllowed).toHaveBeenCalled();
            expect(
                termPolicyAcceptanceService.getPublishedForAcceptance
            ).toHaveBeenCalled();

            inviteRead.resolve(null);
            await running;
        });

        it('answers AwsSesNotConfiguredException before any read when SES is unset', async () => {
            userService.assertEmailDeliverable.mockImplementation(() => {
                throw new AwsSesNotConfiguredException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.sesNotConfigured,
            });
            expect(roleService.getByName).not.toHaveBeenCalled();
            expect(userService.existsByEmail).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('answers the role gate before the email and username gates', async () => {
            roleService.getByName.mockRejectedValue(
                new RoleNotFoundException()
            );
            userService.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
            expect(userService.assertEmailAvailable).not.toHaveBeenCalled();
            expect(
                userRegistrationService.prepareSignUp
            ).not.toHaveBeenCalled();
        });

        it('answers the country gate before the email and username gates', async () => {
            countryService.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );
            userService.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
            });
            expect(userService.assertEmailAvailable).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('answers the email gate before the username gate and opens no transaction', async () => {
            userService.existsByEmail.mockResolvedValue(true);
            userService.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailExist,
            });
            expect(userService.assertEmailAvailable).toHaveBeenCalledWith(true);
            expect(userService.assertUsernameAvailable).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('opens no transaction when the username gate rejects', async () => {
            userService.assertUsernameAvailable.mockImplementation(() => {
                throw new UserUsernameExistException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameExist,
            });
            expect(userService.assertUsernameAvailable).toHaveBeenCalledWith(
                clearUsername
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('asserts the required term policies are published before it prepares the user and opens no transaction when one is not', async () => {
            const failure = new TermPolicyRequiredNotPublishedException();
            termPolicyAcceptanceService.getPublishedForAcceptance.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);
            expect(
                termPolicyAcceptanceService.getPublishedForAcceptance
            ).toHaveBeenCalledWith(
                [EnumTermPolicyType.termsOfService, EnumTermPolicyType.privacy],
                [
                    EnumTermPolicyType.termsOfService,
                    EnumTermPolicyType.privacy,
                    EnumTermPolicyType.cookies,
                    EnumTermPolicyType.marketing,
                ]
            );
            expect(
                userRegistrationService.prepareSignUp
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('adds no entry or effect outside the transaction when the commit throws', async () => {
            const failure = new UserEmailExistException();
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('createSignUpUser', () => {
        it('runs every write on one transaction in sign-up order', async () => {
            await expect(
                useCase['createSignUpUser'](
                    requestContext,
                    apiKeyContext,
                    inviteInput,
                    emailVerification,
                    termPolicyRefs
                )
            ).resolves.toBeUndefined();

            expect(userService.createManyInTx).toHaveBeenCalledWith(tx, [
                inviteInput,
            ]);
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenCalledWith(tx, []);
            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble', inviteContext);
            expect(projectMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'project-bramble',
                'user-bramble',
                EnumProjectMemberRole.admin,
                'user-bramble'
            );
            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).toHaveBeenCalledWith(tx, termPolicyRefs, [acceptanceEntry]);

            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                workspaceService.createOwnedForUsersInTx
            );
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenCalledBefore(workspaceInviteService.acceptOnSignUpInTx);
            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledBefore(projectMemberService.createInTx);
            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledBefore(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
        });

        it('writes the Mfa rows, password history, and notification defaults on tx right after the users', async () => {
            await useCase['createSignUpUser'](
                requestContext,
                apiKeyContext,
                input,
                emailVerification,
                termPolicyRefs
            );

            expect(mfaService.createManyInTx).toHaveBeenCalledTimes(1);
            expect(mfaService.createManyInTx).toHaveBeenCalledWith(tx, [input]);
            expect(passwordHistoryService.createManyInTx).toHaveBeenCalledWith(
                tx,
                [
                    {
                        userId: 'user-bramble',
                        password: 'hashed',
                        type: EnumPasswordHistoryType.signUp,
                        expiredAt: new Date('2026-04-01T00:00:00.000Z'),
                        createdAt: new Date('2026-01-01T00:00:00.000Z'),
                        createdBy: 'user-bramble',
                    },
                ]
            );
            expect(
                notificationService.createDefaultsManyInTx
            ).toHaveBeenCalledWith(tx, ['user-bramble'], 'user-bramble');
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                mfaService.createManyInTx
            );
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                passwordHistoryService.createManyInTx
            );
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                notificationService.createDefaultsManyInTx
            );
            expect(mfaService.createManyInTx).toHaveBeenCalledBefore(
                workspaceService.createOwnedForUsersInTx
            );
        });

        it("runs createManyInTx on each attempt's tx after a slug collision", async () => {
            const retryTx = {} as IDatabaseTransactionClient;
            databaseService.withTransaction
                .mockImplementationOnce(async fn => {
                    await fn(tx);
                    throw new WorkspaceSlugAlreadyExistsException();
                })
                .mockImplementationOnce(async fn => fn(retryTx) as never);

            await useCase['createSignUpUser'](
                requestContext,
                apiKeyContext,
                input,
                emailVerification,
                termPolicyRefs
            );

            expect(userService.createManyInTx).toHaveBeenNthCalledWith(1, tx, [
                input,
            ]);
            expect(userService.createManyInTx).toHaveBeenNthCalledWith(
                2,
                retryTx,
                [input]
            );
        });

        it('accepts the published term policy after the owned workspace is created', async () => {
            await useCase['createSignUpUser'](
                requestContext,
                apiKeyContext,
                input,
                emailVerification,
                termPolicyRefs
            );

            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenCalledBefore(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            );
        });

        it('accepts the term policy alone, then creates the project membership, and adds no effect when it fails', async () => {
            const acceptance = buildDeferred<void>();
            const membership = buildDeferred<never>();
            termPolicyAcceptanceService.acceptPublishedManyInTx.mockReturnValue(
                acceptance.promise
            );
            projectMemberService.createInTx.mockReturnValue(membership.promise);

            const running = useCase['createSignUpUser'](
                requestContext,
                apiKeyContext,
                inviteInput,
                emailVerification,
                termPolicyRefs
            );
            await setImmediate();

            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).toHaveBeenCalledWith(tx, termPolicyRefs, [acceptanceEntry]);
            expect(projectMemberService.createInTx).not.toHaveBeenCalled();

            acceptance.resolve();
            await setImmediate();

            expect(projectMemberService.createInTx).toHaveBeenCalledTimes(1);

            membership.reject(new Error('membership failed'));

            await expect(running).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
            });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('creates the project membership only when the invite carries a project and role', async () => {
            await useCase['createSignUpUser'](
                requestContext,
                apiKeyContext,
                {
                    ...inviteInput,
                    workspaceContext: {
                        ...inviteContext,
                        projectId: null,
                        projectMemberRole: null,
                    },
                },
                emailVerification,
                termPolicyRefs
            );

            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledTimes(1);
            expect(projectMemberService.createInTx).not.toHaveBeenCalled();
        });

        it('accepts no invite for a personal input', async () => {
            await useCase['createSignUpUser'](
                requestContext,
                apiKeyContext,
                input,
                emailVerification,
                termPolicyRefs
            );

            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).not.toHaveBeenCalled();
        });

        it('retries with the next slug candidate after a slug collision and commits', async () => {
            const collision = new WorkspaceSlugAlreadyExistsException();
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx) as never);

            await expect(
                useCase['createSignUpUser'](
                    requestContext,
                    apiKeyContext,
                    input,
                    emailVerification,
                    termPolicyRefs
                )
            ).resolves.toBeUndefined();

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenLastCalledWith(tx, [
                {
                    userId: 'user-bramble',
                    workspaceId: 'workspace-bramble',
                    name: "bramble2fox's Workspace",
                    slug: 'w-bramble-b',
                },
            ]);
        });

        it('throws AppUnknownException carrying the last collision when every slug candidate collides', async () => {
            const collision = new WorkspaceSlugAlreadyExistsException();
            databaseService.withTransaction.mockRejectedValue(collision);

            await expect(
                useCase['createSignUpUser'](
                    requestContext,
                    apiKeyContext,
                    input,
                    emailVerification,
                    termPolicyRefs
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: collision,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
        });

        it('passes a rejected UserEmailExistException through untouched', async () => {
            const collision = new UserEmailExistException();
            databaseService.withTransaction.mockRejectedValue(collision);

            await expect(
                useCase['createSignUpUser'](
                    requestContext,
                    apiKeyContext,
                    input,
                    emailVerification,
                    termPolicyRefs
                )
            ).rejects.toBe(collision);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('passes a rejected WorkspaceInviteAlreadyProcessedException through untouched', async () => {
            const processed = new WorkspaceInviteAlreadyProcessedException();
            databaseService.withTransaction.mockRejectedValue(processed);

            await expect(
                useCase['createSignUpUser'](
                    requestContext,
                    apiKeyContext,
                    inviteInput,
                    emailVerification,
                    termPolicyRefs
                )
            ).rejects.toBe(processed);
        });

        it('wraps a raw write conflict in the unknown exception', async () => {
            const conflict = new Error('write conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);

            await expect(
                useCase['createSignUpUser'](
                    requestContext,
                    apiKeyContext,
                    input,
                    emailVerification,
                    termPolicyRefs
                )
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: conflict,
            });
        });

        it('wraps an untyped error in the unknown exception', async () => {
            const otherError = new Error('unexpected');
            databaseService.withTransaction.mockRejectedValue(otherError);

            await expect(
                useCase['createSignUpUser'](
                    requestContext,
                    apiKeyContext,
                    input,
                    emailVerification,
                    termPolicyRefs
                )
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: otherError,
            });
        });
    });
});
