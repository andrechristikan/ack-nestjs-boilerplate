import { EnumAppEnvironment } from '@app/enums/app.enum';
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
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
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

    private readonly env: EnumAppEnvironment;
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

        this.env = this.configService.get<EnumAppEnvironment>('app.env');
        this.users = migrationUserData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Users...');
        this.logger.log(`Found ${this.users.length} Users to seed.`);

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

        const today = this.helperService.dateCreate();

        const userAgent = UAParser(faker.internet.userAgent());
        const ip = faker.internet.ip();

        await this.databaseService.$transaction(
            this.users.map(user => {
                const userId = this.databaseUtil.createId();
                const { passwordCreated, passwordExpired, passwordHash } =
                    this.authUtil.createPassword(user.password);
                const { reference, token, type } =
                    this.userUtil.verificationCreateVerification(
                        EnumVerificationType.email
                    );

                return this.databaseService.user.upsert({
                    where: {
                        email: user.email.toLowerCase(),
                    },
                    create: {
                        id: userId,
                        email: user.email.toLowerCase(),
                        name: user.name,
                        countryId: countries.find(
                            country => country.alpha2Code === user.country
                        ).id,
                        roleId: roles.find(role => role.name === user.role).id,
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
                        username: this.userUtil.createRandomUsername(),
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
                                        action: EnumActivityLogAction.userCreated,
                                        ipAddress: ip,
                                        userAgent:
                                            this.databaseUtil.toPlainObject(
                                                userAgent
                                            ),
                                        createdBy: userId,
                                    },
                                    {
                                        action: EnumActivityLogAction.userVerifiedEmail,
                                        ipAddress: ip,
                                        userAgent:
                                            this.databaseUtil.toPlainObject(
                                                userAgent
                                            ),
                                        createdBy: userId,
                                    },
                                    ...termPolicies.map(termPolicy => ({
                                        action: EnumActivityLogAction.userAcceptTermPolicy,
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
                        acceptances: {
                            createMany: {
                                data: termPolicies.map(termPolicy => ({
                                    termPolicyId: termPolicy.id,
                                    createdBy: userId,
                                })),
                            },
                        },
                    },
                    update: {},
                });
            })
        );

        this.logger.log('Users seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Users...');

        await this.databaseService.$transaction([
            this.databaseService.session.deleteMany({}),
            this.databaseService.userMobileNumber.deleteMany({}),
            this.databaseService.verification.deleteMany({}),
            this.databaseService.passwordHistory.deleteMany({}),
            this.databaseService.forgotPassword.deleteMany({}),
            this.databaseService.activityLog.deleteMany({}),
            this.databaseService.termPolicyUserAcceptance.deleteMany({}),
            this.databaseService.user.deleteMany({}),
        ]);

        this.logger.log('Users removed completed.');

        return;
    }
}
