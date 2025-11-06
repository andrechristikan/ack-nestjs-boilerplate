import { Command } from 'nestjs-command';
import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from '@modules/auth/services/auth.service';
import { HelperService } from '@common/helper/services/helper.service';
import { DatabaseService } from '@common/database/services/database.service';
import {
    ENUM_ACTIVITY_LOG_ACTION,
    ENUM_PASSWORD_HISTORY_TYPE,
    ENUM_TERM_POLICY_STATUS,
    ENUM_TERM_POLICY_TYPE,
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_SIGN_UP_WITH,
    ENUM_USER_STATUS,
} from '@prisma/client';
import { UserUtil } from '@modules/user/utils/user.util';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { faker } from '@faker-js/faker';
import { UAParser } from 'ua-parser-js';

@Injectable()
export class MigrationUserSeed {
    private readonly logger = new Logger(MigrationUserSeed.name);

    private readonly password = 'aaAA@123';
    private readonly users: {
        country: string;
        email: string;
        name: string;
        role: string;
        id?: string;
    }[] = [
        {
            country: 'ID',
            email: 'superadmin@mail.com',
            name: 'Super Admin',
            role: 'superadmin',
        },
        {
            country: 'ID',
            email: 'admin@mail.com',
            name: 'Admin',
            role: 'admin',
        },
        {
            country: 'ID',
            email: 'user@mail.com',
            name: 'User',
            role: 'user',
        },
    ];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly authService: AuthService,
        private readonly userUtil: UserUtil,
        private readonly helperService: HelperService
    ) {}

    @Command({
        command: 'seed:user',
        describe: 'seeds users',
    })
    async seeds(): Promise<void> {
        this.logger.log('Seeding Users...');

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
            this.logger.log('Users already exist, skipping seed.');
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
            this.logger.error('Roles not found for users, cannot seed.');
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
                        ENUM_TERM_POLICY_TYPE.TERMS_OF_SERVICE,
                        ENUM_TERM_POLICY_TYPE.PRIVACY,
                    ],
                },
                status: ENUM_TERM_POLICY_STATUS.PUBLISHED,
            },
            select: {
                id: true,
            },
        });
        if (termPolicies.length < 2) {
            this.logger.error('TermPolicies not found for users, cannot seed.');
            return;
        }

        const today = this.helperService.dateCreate();
        const { passwordCreated, passwordExpired, passwordHash, salt } =
            this.authService.createPassword(this.password);

        const userAgent = UAParser(faker.internet.userAgent());
        const ip = faker.internet.ip();

        await this.databaseService.$transaction([
            ...this.users.flatMap(user => {
                const userId = this.databaseUtil.createId();
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
                            signUpWith: ENUM_USER_SIGN_UP_WITH.CREDENTIAL,
                            signUpFrom: ENUM_USER_SIGN_UP_FROM.SYSTEM,
                            status: ENUM_USER_STATUS.ACTIVE,
                            termPolicy: {
                                [ENUM_TERM_POLICY_TYPE.COOKIE]: false,
                                [ENUM_TERM_POLICY_TYPE.MARKETING]: false,
                                [ENUM_TERM_POLICY_TYPE.PRIVACY]: true,
                                [ENUM_TERM_POLICY_TYPE.TERMS_OF_SERVICE]: true,
                            },
                            username: this.userUtil.createRandomUsername(),
                            deletedAt: null,
                            passwordHistories: {
                                create: {
                                    password: passwordHash,
                                    salt,
                                    type: ENUM_PASSWORD_HISTORY_TYPE.ADMIN,
                                    expiredAt: passwordExpired,
                                    createdAt: passwordCreated,
                                    createdBy: userId,
                                },
                            },
                            activityLogs: {
                                create: {
                                    action: ENUM_ACTIVITY_LOG_ACTION.USER_CREATED,
                                    ipAddress: ip,
                                    userAgent:
                                        this.databaseService.toPlainObject(
                                            userAgent
                                        ),
                                    createdBy: userId,
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

    @Command({
        command: 'remove:user',
        describe: 'remove users',
    })
    async remove(): Promise<void> {
        this.logger.log('Removing Users...');

        await this.databaseService.$transaction([
            this.databaseService.session.deleteMany(),
            this.databaseService.userMobileNumber.deleteMany(),
            this.databaseService.verification.deleteMany(),
            this.databaseService.passwordHistory.deleteMany(),
            this.databaseService.activityLog.deleteMany(),
            this.databaseService.termPolicyUserAcceptance.deleteMany(),
            this.databaseService.user.deleteMany(),
        ]);

        this.logger.log('Users removed successfully.');

        return;
    }
}
