import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { faker } from '@faker-js/faker';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { migrationUserData } from '@migration/data/migration.user.data';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    ENUM_ACTIVITY_LOG_ACTION,
    ENUM_PASSWORD_HISTORY_TYPE,
    ENUM_TERM_POLICY_STATUS,
    ENUM_TERM_POLICY_TYPE,
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_SIGN_UP_WITH,
    ENUM_USER_STATUS,
    ENUM_VERIFICATION_TYPE,
    Prisma,
} from '@prisma/client';
import { Command } from 'nest-commander';
import { UAParser } from 'ua-parser-js';

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

    private readonly env: ENUM_APP_ENVIRONMENT;
    private readonly users: {
        country: string;
        email: string;
        name: string;
        role: string;
        password: string;
    }[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly authUtil: AuthUtil,
        private readonly userUtil: UserUtil,
        private readonly helperService: HelperService
    ) {
        super();

        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
        this.users = migrationUserData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Users...');
        this.logger.log(`Found ${this.users.length} Users to seed.`);

        const existingUsers = await this.databaseService.user.findMany({
            where: {
                email: {
                    in: this.users.map(user => user.email),
                },
            },
            select: {
                id: true,
            },
        });
        if (existingUsers.length > 0) {
            this.logger.warn('Users already exist, skipping seed.');
            return;
        }

        const uniqueRoles = this.helperService.arrayUnique(
            this.users.map(user => user.role)
        );
        const roles = await this.databaseService.role.findMany({
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

        const uniqueCountries = this.helperService.arrayUnique(
            this.users.map(user => user.country)
        );
        const countries = await this.databaseService.country.findMany({
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

        const termPolicies = await this.databaseService.termPolicy.findMany({
            where: {
                type: {
                    in: [
                        ENUM_TERM_POLICY_TYPE.termsOfService,
                        ENUM_TERM_POLICY_TYPE.privacy,
                    ],
                },
                status: ENUM_TERM_POLICY_STATUS.published,
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

        const today = this.helperService.dateCreate();

        const userAgent = UAParser(faker.internet.userAgent());
        const ip = faker.internet.ip();

        await this.databaseService.$transaction([
            ...this.users.flatMap(user => {
                const userId = this.databaseUtil.createId();
                const { passwordCreated, passwordExpired, passwordHash, salt } =
                    this.authUtil.createPassword(user.password);
                const { reference, token, type } =
                    this.userUtil.verificationCreateVerification(
                        ENUM_VERIFICATION_TYPE.email
                    );

                return [
                    this.databaseService.user.create({
                        data: {
                            id: userId,
                            email: user.email.toLowerCase(),
                            name: user.name,
                            countryId: countries.find(
                                country => country.alpha2Code === user.country
                            ).id,
                            roleId: roles.find(role => role.name === user.role)
                                .id,
                            salt,
                            password: passwordHash,
                            passwordCreated,
                            passwordExpired,
                            passwordAttempt: 0,
                            signUpAt: today,
                            isVerified: true,
                            signUpWith: ENUM_USER_SIGN_UP_WITH.credential,
                            signUpFrom: ENUM_USER_SIGN_UP_FROM.system,
                            status: ENUM_USER_STATUS.active,
                            termPolicy: {
                                [ENUM_TERM_POLICY_TYPE.cookie]: false,
                                [ENUM_TERM_POLICY_TYPE.marketing]: false,
                                [ENUM_TERM_POLICY_TYPE.privacy]: true,
                                [ENUM_TERM_POLICY_TYPE.termsOfService]: true,
                            },
                            username: this.userUtil.createRandomUsername(),
                            deletedAt: null,
                            passwordHistories: {
                                create: {
                                    password: passwordHash,
                                    salt,
                                    type: ENUM_PASSWORD_HISTORY_TYPE.admin,
                                    expiredAt: passwordExpired,
                                    createdAt: passwordCreated,
                                    createdBy: userId,
                                },
                            },
                            verifications: {
                                create: {
                                    expiredAt: this.helperService.dateCreate(),
                                    verifiedAt: this.helperService.dateCreate(),
                                    reference,
                                    token,
                                    type,
                                    createdBy: userId,
                                    to: user.email,
                                    isUsed: true,
                                },
                            },
                            activityLogs: {
                                createMany: {
                                    data: [
                                        {
                                            action: ENUM_ACTIVITY_LOG_ACTION.userCreated,
                                            ipAddress: ip,
                                            userAgent:
                                                this.databaseUtil.toPlainObject(
                                                    userAgent
                                                ),
                                            createdBy: userId,
                                        },
                                        {
                                            action: ENUM_ACTIVITY_LOG_ACTION.userVerifiedEmail,
                                            ipAddress: ip,
                                            userAgent:
                                                this.databaseUtil.toPlainObject(
                                                    userAgent
                                                ),
                                            createdBy: userId,
                                        },
                                        ...termPolicies.map(termPolicy => ({
                                            action: ENUM_ACTIVITY_LOG_ACTION.userAcceptTermPolicy,
                                            metadata: {
                                                termPolicyType: termPolicy.type,
                                                termPolicyId: termPolicy.id,
                                            },
                                            ipAddress: ip,
                                            userAgent:
                                                this.databaseUtil.toPlainObject(
                                                    userAgent
                                                ),
                                            createdBy: userId,
                                        })),
                                    ],
                                },
                            },
                        },
                    }),
                    ...termPolicies.map(termPolicy =>
                        this.databaseService.termPolicyUserAcceptance.create({
                            data: {
                                userId: userId,
                                termPolicyId: termPolicy.id,
                                createdBy: userId,
                            },
                        })
                    ),
                ];
            }),
        ]);

        this.logger.log('Users seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Users...');
        this.logger.log(`Found ${this.users.length} Users to remove.`);

        const existingUsers = await this.databaseService.user.findMany({
            where: {
                email: {
                    in: this.users.map(user => user.email),
                },
            },
            select: {
                id: true,
            },
        });
        if (existingUsers.length === 0) {
            this.logger.warn('Users do not exist, skipping remove.');
            return;
        }

        const transaction: Prisma.PrismaPromise<unknown>[] = [];
        const postTransaction: Prisma.PrismaPromise<unknown>[] = [];

        for (const user of existingUsers) {
            postTransaction.push(
                this.databaseService.user.deleteMany({
                    where: { id: user.id },
                })
            );
            transaction.push(
                this.databaseService.session.deleteMany({
                    where: { userId: user.id },
                }),
                this.databaseService.userMobileNumber.deleteMany({
                    where: { userId: user.id },
                }),
                this.databaseService.verification.deleteMany({
                    where: { userId: user.id },
                }),
                this.databaseService.passwordHistory.deleteMany({
                    where: { userId: user.id },
                }),
                this.databaseService.activityLog.deleteMany({
                    where: { userId: user.id },
                }),
                this.databaseService.termPolicyUserAcceptance.deleteMany({
                    where: { userId: user.id },
                })
            );
        }

        await this.databaseService.$transaction(transaction);
        await this.databaseService.$transaction(postTransaction);

        this.logger.log('Users removed completed.');

        return;
    }
}
