import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { faker } from '@faker-js/faker';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { migrationUserData } from '@migration/data/migration.user.data';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumActivityLogAction,
    EnumNotificationChannel,
    EnumNotificationType,
    EnumPasswordHistoryType,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client';
import { Command } from 'nest-commander';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { IRequestLog } from '@common/request/interfaces/request.interface';
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
    private readonly users: {
        country: string;
        email: string;
        username: string;
        name: string;
        role: string;
        password: string;
    }[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly authPasswordService: AuthPasswordService,
        private readonly userVerificationService: UserVerificationService,
        private readonly helperArrayService: HelperArrayService,
        private readonly helperDateService: HelperDateService,
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly requestUtil: RequestUtil
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.users = migrationUserData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Users...');
        this.logger.log(`Found ${this.users.length} Users to seed.`);

        const uniqueRoles = this.helperArrayService.unique(
            this.users.map(user => user.role)
        );
        const roles = await this.databaseService.client.role.findMany({
            where: {
                name: {
                    in: uniqueRoles,
                },
            },
            select: {
                id: true,
                name: true,
            },
        });

        if (roles.length !== uniqueRoles.length) {
            this.logger.warn('Roles not found for users, cannot seed.');
            return;
        }

        const uniqueCountries = this.helperArrayService.unique(
            this.users.map(user => user.country)
        );
        const countries = await this.databaseService.client.country.findMany({
            where: {
                alpha2Code: {
                    in: uniqueCountries,
                },
            },
            select: {
                id: true,
                alpha2Code: true,
            },
        });

        if (countries.length !== uniqueCountries.length) {
            this.logger.error('Countries not found for users, cannot seed.');
            return;
        }

        const termPolicies =
            await this.databaseService.client.termPolicy.findMany({
                where: {
                    type: {
                        in: [
                            EnumTermPolicyType.termsOfService,
                            EnumTermPolicyType.privacy,
                        ],
                    },
                    status: EnumTermPolicyStatus.published,
                },
                select: {
                    id: true,
                    type: true,
                },
            });

        if (termPolicies.length !== 2) {
            this.logger.error('TermPolicies not found for users, cannot seed.');
            return;
        }

        try {
            const today = this.helperDateService.create();

            const userAgent = this.requestUtil.parseUserAgent(
                faker.internet.userAgent()
            );
            const ip = faker.internet.ip();
            const requestLog: IRequestLog = {
                userAgent,
                ipAddress: ip,
            };

            await this.databaseService.client.$transaction(
                this.users.map(user => {
                    const userId = this.databaseUtil.createId();
                    const { passwordCreated, passwordExpired, passwordHash } =
                        this.authPasswordService.createPassword(
                            userId,
                            user.password
                        );
                    const { reference, hashedToken, type } =
                        this.userVerificationService.verificationCreateVerification(
                            userId,
                            EnumVerificationType.email
                        );

                    return this.databaseService.client.user.upsert({
                        where: {
                            email: user.email.toLowerCase(),
                        },
                        create: {
                            id: userId,
                            email: user.email.toLowerCase(),
                            name: user.name,
                            countryId: countries.find(
                                country => country.alpha2Code === user.country
                            )!.id,
                            roleId: roles.find(role => role.name === user.role)!
                                .id,
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
                                [EnumTermPolicyType.cookies]: false,
                                [EnumTermPolicyType.marketing]: false,
                                [EnumTermPolicyType.privacy]: true,
                                [EnumTermPolicyType.termsOfService]: true,
                            },
                            username: user.username,
                            deletedAt: null,
                            passwordHistories: {
                                create: {
                                    password: passwordHash,
                                    type: EnumPasswordHistoryType.admin,
                                    expiredAt: passwordExpired,
                                    createdAt: passwordCreated,
                                    createdBy: userId,
                                },
                            },
                            verifications: {
                                create: {
                                    expiredAt: this.helperDateService.create(),
                                    verifiedAt: this.helperDateService.create(),
                                    reference,
                                    token: hashedToken,
                                    type,
                                    createdBy: userId,
                                    to: user.email,
                                    isUsed: true,
                                },
                            },
                            activityLogs: {
                                createMany: {
                                    data: [
                                        this.activityLogUtil.buildCreateManyUserData(
                                            userId,
                                            null,
                                            EnumActivityLogAction.userCreated,
                                            requestLog
                                        ),
                                        this.activityLogUtil.buildCreateManyUserData(
                                            userId,
                                            null,
                                            EnumActivityLogAction.userVerifiedEmail,
                                            requestLog
                                        ),
                                        ...termPolicies.map(termPolicy =>
                                            this.activityLogUtil.buildCreateManyUserData(
                                                userId,
                                                null,
                                                EnumActivityLogAction.userAcceptTermPolicy,
                                                requestLog,
                                                {
                                                    termPolicyType:
                                                        termPolicy.type,
                                                    termPolicyId: termPolicy.id,
                                                }
                                            )
                                        ),
                                    ],
                                },
                            },
                            acceptances: {
                                createMany: {
                                    data: termPolicies.map(termPolicy => ({
                                        termPolicyId: termPolicy.id,
                                        createdBy: userId,
                                    })),
                                },
                            },
                            notificationSettings: {
                                createMany: {
                                    data: Object.values(EnumNotificationChannel)
                                        .map(channel =>
                                            Object.values(
                                                EnumNotificationType
                                            ).map(type => ({
                                                channel,
                                                type,
                                                isActive: true,
                                            }))
                                        )
                                        .flat(),
                                },
                            },
                            twoFactor: {
                                create: {
                                    enabled: false,
                                },
                            },
                        },
                        update: {},
                    });
                })
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
            await this.databaseService.client.$transaction([
                this.databaseService.client.twoFactor.deleteMany({}),
                this.databaseService.client.session.deleteMany({}),
                this.databaseService.client.userMobileNumber.deleteMany({}),
                this.databaseService.client.verification.deleteMany({}),
                this.databaseService.client.passwordHistory.deleteMany({}),
                this.databaseService.client.forgotPassword.deleteMany({}),
                this.databaseService.client.activityLog.deleteMany({}),
                this.databaseService.client.termPolicyUserAcceptance.deleteMany(
                    {}
                ),
                this.databaseService.client.notificationUserSetting.deleteMany(
                    {}
                ),
                this.databaseService.client.user.deleteMany({}),
            ]);
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing users');
            throw error;
        }

        this.logger.log('Users removed completed.');

        return;
    }
}
