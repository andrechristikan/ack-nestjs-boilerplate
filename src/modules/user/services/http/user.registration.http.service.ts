import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { DatabaseIdResponseDto } from '@common/database/dtos/response/database.id.response.dto';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStageInput } from '@modules/activity-log/interfaces/activity-log.interface';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import type { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import type { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserSignUp,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Owns the transactions that create accounts: sign-up, admin create, and admin import. */
@Injectable()
export class UserRegistrationHttpService {
    private readonly userRoleName: string;
    private readonly userCountryName: string;
    private readonly createTimeoutInMs: number;
    private readonly createBulkTimeoutInMs: number;

    constructor(
        private readonly userAuthDomain: UserAuthDomain,
        private readonly userDomain: UserDomain,
        private readonly userImportDomain: UserImportDomain,
        private readonly passwordHistoryDomain: PasswordHistoryDomain,
        private readonly notificationDomain: NotificationDomain,
        private readonly termPolicyAcceptanceDomain: TermPolicyAcceptanceDomain,
        private readonly workspaceDomain: WorkspaceDomain,
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly roleDomain: RoleDomain,
        private readonly countryDomain: CountryDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly notificationQueue: NotificationQueue,
        private readonly notificationUtil: NotificationUtil,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.userRoleName =
            this.configService.get<string>('user.default.role')!;
        this.userCountryName = this.configService.get<string>(
            'user.default.country'
        )!;
        this.createTimeoutInMs = this.configService.get<number>(
            'user.create.timeoutInMs'
        )!;
        this.createBulkTimeoutInMs = this.configService.get<number>(
            'user.create.bulkTimeoutInMs'
        )!;
    }

    private stageActivities(
        stages: IActivityLogStageInput<EnumActivityLogAction>[]
    ): void {
        const activityLogs = stages.map(stage =>
            this.activityLogDomain.prepare(stage)
        );

        this.activityLogDomain.stagePrepared(activityLogs);
    }

    /** Writes the sign-up account, its personal or invited workspace, and its term-policy acceptance on one transaction, retrying the personal-workspace slug candidates in turn. */
    private async createSignUpUser(
        input: IUserCreateWithWorkspaceInput
    ): Promise<IUser> {
        const inputs = [input];
        const attempts = this.workspaceUtil.countSlugAttempts(inputs);
        const passwordHistories =
            this.userCreateUtil.buildPasswordHistoryEntries(inputs);
        const termPolicyAcceptances =
            this.userCreateUtil.buildTermPolicyAcceptanceEntries(inputs);
        const userIds = this.userCreateUtil.buildUserIds(inputs);
        const workspaceContext = input.workspaceContext;

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                const users = await this.databaseService.withTransaction(
                    async tx => {
                        // Sequential by design: gate before the work it guards
                        await this.termPolicyAcceptanceDomain.assertRequiredPublishedInTx(
                            tx,
                            UserTermPolicyContract.requiredTypes
                        );

                        const created = await this.userDomain.createManyInTx(
                            tx,
                            inputs
                        );
                        await this.passwordHistoryDomain.createManyInTx(
                            tx,
                            passwordHistories
                        );
                        await this.notificationDomain.createDefaultsManyInTx(
                            tx,
                            userIds
                        );

                        const ownedUsers = this.workspaceUtil.buildOwnedUsers(
                            inputs,
                            attempt
                        );
                        await this.workspaceDomain.createOwnedForUsersInTx(
                            tx,
                            ownedUsers
                        );

                        if (
                            workspaceContext.type ===
                            EnumUserSignUpWorkspaceContextType.invite
                        ) {
                            await this.workspaceInviteDomain.acceptOnSignUpInTx(
                                tx,
                                input.userId,
                                workspaceContext
                            );
                            if (
                                workspaceContext.projectId &&
                                workspaceContext.projectMemberRole
                            ) {
                                await this.projectMemberDomain.createInTx(
                                    tx,
                                    workspaceContext.projectId,
                                    input.userId,
                                    workspaceContext.projectMemberRole,
                                    input.userId
                                );
                            }
                        }

                        await this.termPolicyAcceptanceDomain.acceptPublishedManyInTx(
                            tx,
                            termPolicyAcceptances
                        );

                        return created;
                    },
                    { timeout: this.createTimeoutInMs }
                );

                return users[0]!;
            } catch (error: unknown) {
                const isSlugCollision = this.databaseUtil.isUniqueCollision(
                    error,
                    'slug'
                );
                if (isSlugCollision) {
                    continue;
                }

                const mapped = this.userCreateUtil.mapCreateCollision(error);
                if (mapped instanceof AppBaseException) {
                    throw mapped;
                }

                throw new AppUnknownException(mapped);
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    /** Writes the accounts an admin creates or imports, with their personal workspaces, on one transaction, retrying the personal-workspace slug candidates in turn. */
    private async createAdminUsers(
        inputs: IUserCreateWithWorkspaceInput[],
        timeoutInMs: number
    ): Promise<IUser[]> {
        const attempts = this.workspaceUtil.countSlugAttempts(inputs);
        const passwordHistories =
            this.userCreateUtil.buildPasswordHistoryEntries(inputs);
        const termPolicyAcceptances =
            this.userCreateUtil.buildTermPolicyAcceptanceEntries(inputs);
        const userIds = this.userCreateUtil.buildUserIds(inputs);

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                return await this.databaseService.withTransaction(
                    async tx => {
                        const users = await this.userDomain.createManyInTx(
                            tx,
                            inputs
                        );
                        await this.passwordHistoryDomain.createManyInTx(
                            tx,
                            passwordHistories
                        );
                        await this.notificationDomain.createDefaultsManyInTx(
                            tx,
                            userIds
                        );

                        const ownedUsers = this.workspaceUtil.buildOwnedUsers(
                            inputs,
                            attempt
                        );
                        await this.workspaceDomain.createOwnedForUsersInTx(
                            tx,
                            ownedUsers
                        );
                        await this.termPolicyAcceptanceDomain.acceptPublishedManyInTx(
                            tx,
                            termPolicyAcceptances
                        );

                        return users;
                    },
                    { timeout: timeoutInMs }
                );
            } catch (error: unknown) {
                const isSlugCollision = this.databaseUtil.isUniqueCollision(
                    error,
                    'slug'
                );
                if (isSlugCollision) {
                    continue;
                }

                const mapped = this.userCreateUtil.mapCreateCollision(error);
                if (mapped instanceof AppBaseException) {
                    throw mapped;
                }

                throw new AppUnknownException(mapped);
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    async signUp({
        countryId,
        email,
        username,
        password,
        inviteToken,
        name,
        from,
        cookies,
        marketing,
    }: UserSignUpRequestDto): Promise<IResponseReturn<void>> {
        const signUp: IUserSignUp = {
            countryId,
            email,
            username,
            password,
            inviteToken: inviteToken ?? null,
            name: name ?? null,
            from,
            cookies,
            marketing,
        };
        // Sequential by design: gate before the work it guards
        const invite = await this.workspaceInviteDomain.getSignUpInvite(
            signUp.inviteToken,
            signUp.email
        );
        const workspaceContext =
            this.userCreateUtil.buildSignUpWorkspaceContext(
                invite,
                signUp.username
            );
        const [role, emailExist, usernameCheck] = await Promise.all([
            this.roleDomain.getByName(this.userRoleName),
            this.userDomain.existsByEmail(signUp.email),
            this.userDomain.checkUsername(signUp.username),
            this.countryDomain.getOne(signUp.countryId),
        ]);
        this.userDomain.assertEmailAvailable(emailExist);
        this.userDomain.assertUsernameAvailable(usernameCheck);

        const { input, emailVerification } =
            await this.userAuthDomain.prepareSignUp(signUp, {
                roleId: role.id,
                workspaceContext,
            });
        const created = await this.createSignUpUser(input);
        const stages = this.userCreateUtil.buildStages(
            UserCreateContract.signUp,
            [input],
            [created]
        );
        this.stageActivities(stages);

        const recipient = this.notificationUtil.mapRecipient(
            created,
            EnumNotificationKind.welcome,
            [],
            []
        );
        const expiredAt = this.helperDateService.formatToIso(
            emailVerification.expiredAt
        );
        await this.notificationQueue.sendWelcome(recipient, {
            expiredAt,
            reference: emailVerification.reference,
            link: emailVerification.link,
            expiredInMinutes: emailVerification.expiredInMinutes,
        });

        return {};
    }

    async createByAdmin(
        { countryId, email, name, roleId, username }: UserCreateRequestDto,
        actor: IUser
    ): Promise<IResponseReturn<DatabaseIdResponseDto>> {
        // Sequential by design: gate before the work it guards
        const role = await this.roleDomain.getById(roleId);
        this.roleDomain.assertActorOutranks(actor.role.type, role.type);

        const [emailExist, usernameCheck] = await Promise.all([
            this.userDomain.existsByEmail(email),
            this.userDomain.checkUsername(username),
            this.countryDomain.getOne(countryId),
        ]);
        this.userDomain.assertEmailAvailable(emailExist);
        this.userDomain.assertUsernameAvailable(usernameCheck);

        const { input, passwordString } =
            await this.userDomain.prepareCreateByAdmin(
                { countryId, email, name: name ?? null, roleId, username },
                actor.id,
                role
            );
        const users = await this.createAdminUsers(
            [input],
            this.createTimeoutInMs
        );
        const created = users[0]!;

        const stages = this.userCreateUtil.buildCreateByAdminStages(
            input,
            created
        );
        this.stageActivities(stages);

        if (input.password) {
            const passwordCreatedAt = this.helperDateService.formatToIso(
                input.password.passwordCreated
            );
            const passwordExpiredAt = this.helperDateService.formatToIso(
                input.password.passwordExpired
            );
            const recipient = this.notificationUtil.mapRecipient(
                created,
                EnumNotificationKind.welcomeByAdmin,
                [],
                []
            );
            await this.notificationQueue.sendWelcomeByAdmin(
                recipient,
                {
                    password: passwordString,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
                actor.id
            );
        }

        return { data: { id: created.id } };
    }

    async importByAdmin(
        data: UserImportRequestDto[],
        createdBy: string
    ): Promise<IResponseReturn<void>> {
        const rows = data.map(({ email, name, username }) => ({
            email,
            name: name ?? null,
            username,
        }));
        const emails = rows.map(item => item.email);
        const usernames = rows.map(item => item.username);
        const [existingEmails, usernameChecks] = await Promise.all([
            this.userImportDomain.getExistingEmails(emails),
            this.userImportDomain.getUsernameChecks(usernames),
        ]);
        this.userImportDomain.assertEmailsAvailable(existingEmails);

        // Sequential by design: gate before the work it guards
        const role = await this.roleDomain.getByName(this.userRoleName);
        // Sequential by design: gate before the work it guards
        const countryId = await this.countryDomain.getIdByAlpha2Code(
            this.userCountryName
        );

        const { inputs, passwordHasheds, passwordStrings } =
            await this.userImportDomain.prepareImportByAdmin(
                rows,
                createdBy,
                role,
                countryId,
                usernameChecks
            );
        const users = await this.createAdminUsers(
            inputs,
            this.createBulkTimeoutInMs
        );
        const stages = this.userCreateUtil.buildImportByAdminStages(
            inputs,
            users
        );
        this.stageActivities(stages);

        const items = users.map((created, index) => {
            const passwordCreatedAt = this.helperDateService.formatToIso(
                passwordHasheds[index]!.passwordCreated
            );
            const passwordExpiredAt = this.helperDateService.formatToIso(
                passwordHasheds[index]!.passwordExpired
            );
            const recipient = this.notificationUtil.mapRecipient(
                created,
                EnumNotificationKind.welcomeByAdmin,
                [],
                []
            );

            return {
                recipient,
                data: {
                    password: passwordStrings[index]!,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
            };
        });

        await this.notificationQueue.sendWelcomeByAdminBulk(items, createdBy);

        return {};
    }
}
