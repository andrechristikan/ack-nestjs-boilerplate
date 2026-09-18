import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { faker } from '@faker-js/faker';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import {
    MigrationUserData,
    MigrationUserSuperAdminId,
} from '@migration/data/migration.user.data';
import type { IMigrationUserData } from '@migration/interfaces/migration.interface';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumActivityLogAction,
    EnumNotificationChannel,
    EnumNotificationType,
    EnumPasswordHistoryType,
    EnumTermPolicyStatus,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import { Command } from 'nest-commander';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestUtil } from '@common/request/utils/request.util';

/**
 * Seeds default users with password, verification, acceptances, and activity logs. Requires roles, countries, and term policies to already be seeded, and aborts otherwise.
 */
@Command({
    name: 'user',
    description: 'Seed/Remove Users',
    allowUnknownOptions: false,
})
export class MigrationUserSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationUserSeed.name);

    private readonly env: EnumAppEnvironment;
    private readonly users: IMigrationUserData[] = [];
    private readonly seedTransactionTimeoutInMs: number;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly userVerificationDomain: UserVerificationDomain,
        private readonly helperArrayService: HelperArrayService,
        private readonly helperDateService: HelperDateService,
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly requestUtil: RequestUtil
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.users = MigrationUserData[this.env];
        this.seedTransactionTimeoutInMs = this.configService.get<number>(
            'database.seedTransactionTimeoutInMs'
        )!;
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Users...');
        this.logger.log(`Found ${this.users.length} Users to seed.`);

        const roleNames = this.users.map(user => user.role);
        const uniqueRoles = this.helperArrayService.unique(roleNames);
        const countryCodes = this.users.map(user => user.country);
        const uniqueCountries = this.helperArrayService.unique(countryCodes);
        const emails = this.users.map(user => user.email.toLowerCase());

        const [roles, countries, termPolicies, existingUsers] =
            await Promise.all([
                this.databaseService.client.role.findMany({
                    where: { name: { in: uniqueRoles } },
                    select: { id: true, name: true },
                }),
                this.databaseService.client.country.findMany({
                    where: { alpha2Code: { in: uniqueCountries } },
                    select: { id: true, alpha2Code: true },
                }),
                this.databaseService.client.termPolicy.findMany({
                    where: {
                        type: { in: [...UserTermPolicyContract.requiredTypes] },
                        status: EnumTermPolicyStatus.published,
                    },
                    select: { id: true, type: true },
                }),
                this.databaseService.client.user.findMany({
                    where: { email: { in: emails } },
                    select: { id: true, email: true },
                }),
            ]);

        if (roles.length !== uniqueRoles.length) {
            this.logger.warn('Roles not found for users, cannot seed.');
            return;
        }

        if (countries.length !== uniqueCountries.length) {
            this.logger.error('Countries not found for users, cannot seed.');
            return;
        }

        const requiredTermPolicyCount =
            UserTermPolicyContract.requiredTypes.length;
        if (termPolicies.length !== requiredTermPolicyCount) {
            this.logger.error('TermPolicies not found for users, cannot seed.');
            return;
        }

        const superAdminEmails = this.users
            .filter(user => user.id === MigrationUserSuperAdminId)
            .map(user => user.email.toLowerCase());
        const legacySuperAdmin = existingUsers.find(
            user =>
                superAdminEmails.includes(user.email) &&
                user.id !== MigrationUserSuperAdminId
        );
        if (legacySuperAdmin) {
            this.logger.error(
                `Superadmin ${legacySuperAdmin.email} exists with id ${legacySuperAdmin.id}, expected ${MigrationUserSuperAdminId}. Run pnpm migration:remove, then pnpm migration:seed.`
            );
            return;
        }

        const existingEmails = new Set(existingUsers.map(user => user.email));

        try {
            const today = this.helperDateService.create();

            const userAgent = this.requestUtil.parseUserAgent(
                faker.internet.userAgent()
            );
            const ip = faker.internet.ip();
            const requestLog: IRequestLog = {
                userAgent,
                ipAddress: ip,
                geoLocation: null,
            };

            const rows = this.users.map(user => {
                const email = user.email.toLowerCase();
                const generatedUserId = this.databaseUtil.createId();
                const userId = user.id ?? generatedUserId;

                let createdActivity: Prisma.ActivityLogCreateManyUserInput;
                if (userId === MigrationUserSuperAdminId) {
                    createdActivity =
                        this.activityLogUtil.buildCreateManyUserData(
                            MigrationUserSuperAdminId,
                            null,
                            EnumActivityLogAction.userCreated,
                            requestLog,
                            {}
                        );
                } else {
                    createdActivity =
                        this.activityLogUtil.buildCreateManyUserData(
                            MigrationUserSuperAdminId,
                            null,
                            EnumActivityLogAction.userCreatedByAdmin,
                            requestLog,
                            {
                                actorUserId: MigrationUserSuperAdminId,
                                timestamp: today,
                            }
                        );
                }

                const password = this.authPasswordUtil.createPassword(
                    user.password
                );
                const verification =
                    this.userVerificationDomain.verificationCreateVerification(
                        EnumVerificationType.email
                    );

                return {
                    user,
                    email,
                    userId,
                    countryId: countries.find(
                        country => country.alpha2Code === user.country
                    )!.id,
                    roleId: roles.find(role => role.name === user.role)!.id,
                    password,
                    verification,
                    activityLogs: [
                        createdActivity,
                        this.activityLogUtil.buildCreateManyUserData(
                            MigrationUserSuperAdminId,
                            null,
                            EnumActivityLogAction.userVerifiedEmail,
                            requestLog,
                            {}
                        ),
                        ...termPolicies.map(() =>
                            this.activityLogUtil.buildCreateManyUserData(
                                userId,
                                null,
                                EnumActivityLogAction.userAcceptTermPolicy,
                                requestLog,
                                {}
                            )
                        ),
                    ],
                    isNew: !existingEmails.has(email),
                };
            });
            const adminCreateRows: Prisma.ActivityLogCreateManyInput[] = rows
                .filter(
                    row => row.isNew && row.userId !== MigrationUserSuperAdminId
                )
                .map(row => {
                    const adminCreateData =
                        this.activityLogUtil.buildCreateManyUserData(
                            MigrationUserSuperAdminId,
                            null,
                            EnumActivityLogAction.adminUserCreate,
                            requestLog,
                            {
                                targetUserId: row.userId,
                                targetUsername: row.user.username,
                                timestamp: today,
                            }
                        );

                    return {
                        userId: MigrationUserSuperAdminId,
                        ...adminCreateData,
                    };
                });

            await this.databaseService.withTransaction(
                async tx => {
                    for (const row of rows) {
                        const {
                            passwordCreated,
                            passwordExpired,
                            passwordHash,
                        } = row.password;
                        const { reference, hashedToken, type } =
                            row.verification;

                        await tx.user.upsert({
                            where: {
                                email: row.email,
                            },
                            create: {
                                id: row.userId,
                                email: row.email,
                                name: row.user.name,
                                countryId: row.countryId,
                                roleId: row.roleId,
                                password: passwordHash,
                                passwordCreated,
                                passwordExpired,
                                passwordAttempt: 0,
                                signUpAt: today,
                                isVerified: true,
                                signUpWith: EnumUserSignUpWith.credential,
                                signUpFrom: EnumUserSignUpFrom.system,
                                status: EnumUserStatus.active,
                                termPolicy: {
                                    ...UserTermPolicyContract.defaults,
                                },
                                username: row.user.username,
                                deletedAt: null,
                                createdBy: MigrationUserSuperAdminId,
                                updatedBy: MigrationUserSuperAdminId,
                                passwordHistories: {
                                    create: {
                                        password: passwordHash,
                                        type: EnumPasswordHistoryType.admin,
                                        expiredAt: passwordExpired,
                                        createdAt: passwordCreated,
                                        createdBy: MigrationUserSuperAdminId,
                                    },
                                },
                                verifications: {
                                    create: {
                                        expiredAt: today,
                                        verifiedAt: today,
                                        reference,
                                        token: hashedToken,
                                        type,
                                        createdBy: MigrationUserSuperAdminId,
                                        to: row.user.email,
                                        isUsed: true,
                                    },
                                },
                                activityLogs: {
                                    createMany: {
                                        data: row.activityLogs,
                                    },
                                },
                                acceptances: {
                                    createMany: {
                                        data: termPolicies.map(termPolicy => ({
                                            termPolicyId: termPolicy.id,
                                            createdBy:
                                                MigrationUserSuperAdminId,
                                        })),
                                    },
                                },
                                notificationSettings: {
                                    createMany: {
                                        data: Object.values(
                                            EnumNotificationChannel
                                        )
                                            .map(channel =>
                                                Object.values(
                                                    EnumNotificationType
                                                ).map(notificationType => ({
                                                    channel,
                                                    type: notificationType,
                                                    isActive: true,
                                                    createdBy:
                                                        MigrationUserSuperAdminId,
                                                    updatedBy:
                                                        MigrationUserSuperAdminId,
                                                }))
                                            )
                                            .flat(),
                                    },
                                },
                                twoFactor: {
                                    create: {
                                        enabled: false,
                                        createdBy: MigrationUserSuperAdminId,
                                        updatedBy: MigrationUserSuperAdminId,
                                    },
                                },
                            },
                            update: {
                                updatedBy: MigrationUserSuperAdminId,
                            },
                        });
                    }

                    if (adminCreateRows.length > 0) {
                        await tx.activityLog.createMany({
                            data: adminCreateRows,
                        });
                    }
                },
                { timeout: this.seedTransactionTimeoutInMs }
            );
        } catch (error: unknown) {
            this.logger.error(error, 'Error seeding users');
            throw error;
        }

        this.logger.log('Users seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Users...');

        try {
            await this.databaseService.withTransaction(
                async tx => {
                    await tx.twoFactor.deleteMany({});
                    await tx.session.deleteMany({});
                    await tx.userMobileNumber.deleteMany({});
                    await tx.verification.deleteMany({});
                    await tx.passwordHistory.deleteMany({});
                    await tx.forgotPassword.deleteMany({});
                    await tx.activityLog.deleteMany({});
                    await tx.termPolicyUserAcceptance.deleteMany({});
                    await tx.notificationUserSetting.deleteMany({});
                    await tx.user.deleteMany({});
                },
                { timeout: this.seedTransactionTimeoutInMs }
            );
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing users');
            throw error;
        }

        this.logger.log('Users removed completed.');

        return;
    }
}
