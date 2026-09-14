import { FileExceedMaxDataExportException } from '@common/file/exceptions/file.exceed-max-data-export.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationEqual,
    IPaginationIn,
} from '@common/pagination/interfaces/pagination.interface';
import {
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
} from '@generated/prisma-client';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { UserCreateModeRules } from '@modules/user/constants/user.create-mode.constant';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import { UserImportEmailExistException } from '@modules/user/exceptions/user.import-email-exist.exception';
import { UserImportUsernameExistException } from '@modules/user/exceptions/user.import-username-exist.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserExport,
    IUserImportPrepared,
    IUserImportRow,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserImportDomain {
    private readonly userRoleName: string;
    private readonly userCountryName: string;
    private readonly maxDataExport: number;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly roleDomain: RoleDomain,
        private readonly countryDomain: CountryDomain,
        private readonly userUtil: UserUtil,
        private readonly userOnboardingDomain: UserOnboardingDomain,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.userRoleName =
            this.configService.get<string>('user.default.role')!;
        this.userCountryName = this.configService.get<string>(
            'user.default.country'
        )!;
        this.maxDataExport =
            this.configService.get<number>('user.maxDataExport')!;
    }

    async prepareImportByAdmin(
        data: IUserImportRow[],
        createdBy: string
    ): Promise<IUserImportPrepared> {
        const emails = data.map(item => item.email);
        const usernames = data.map(item => item.username);

        const [
            checkRole,
            countryId,
            existingUsersByEmail,
            existingUsersByUsername,
            badWordChecks,
        ] = await Promise.all([
            this.roleDomain.getByName(this.userRoleName),
            this.countryDomain.getIdByAlpha2Code(this.userCountryName),
            this.userRepository.findByEmails(emails),
            this.userRepository.findByUsernames(usernames),
            Promise.all(
                usernames.map(username => this.userUtil.checkBadWord(username))
            ),
        ]);

        const duplicateUsernames = usernames.filter(
            (username, index) => usernames.indexOf(username) !== index
        );

        if (existingUsersByEmail.length > 0) {
            throw new UserImportEmailExistException(
                existingUsersByEmail.map(user => user.email).join(', ')
            );
        } else if (!checkRole) {
            throw new RoleNotFoundException();
        } else if (countryId === null) {
            throw new CountryNotFoundException();
        } else if (existingUsersByUsername.length > 0) {
            throw new UserImportUsernameExistException(
                existingUsersByUsername.map(user => user.username).join(', ')
            );
        } else if (duplicateUsernames.length > 0) {
            throw new UserImportUsernameExistException(
                [...new Set(duplicateUsernames)].join(', ')
            );
        } else if (badWordChecks.some(containsBadWord => containsBadWord)) {
            throw new UserUsernameContainBadWordException();
        }

        const totalData = data.length;
        const userIds = Array(totalData)
            .fill(0)
            .map(() => this.databaseUtil.createId());
        const passwords = Array(totalData)
            .fill(0)
            .map(() => this.authPasswordUtil.createPasswordRandom());
        const passwordHasheds = userIds.map((e, i) =>
            this.authPasswordUtil.createPassword(e, passwords[i])
        );
        const workspaceContexts =
            this.userOnboardingDomain.buildPersonalWorkspaceContexts(usernames);
        const isVerified = checkRole.type !== EnumRoleType.user;
        const inputs: IUserCreateWithWorkspaceInput[] = data.map(
            ({ email, name }, index) => ({
                userId: userIds[index],
                email,
                name: name ?? null,
                username: usernames[index],
                countryId,
                roleId: checkRole.id,
                signUpFrom: EnumUserSignUpFrom.admin,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified,
                termPolicy: {
                    [EnumTermPolicyType.cookies]: false,
                    [EnumTermPolicyType.marketing]: false,
                    [EnumTermPolicyType.privacy]: true,
                    [EnumTermPolicyType.termsOfService]: true,
                },
                acceptedTermPolicyTypes: [
                    EnumTermPolicyType.termsOfService,
                    EnumTermPolicyType.privacy,
                ],
                password: passwordHasheds[index],
                passwordHistoryType:
                    UserCreateModeRules[EnumUserCreateMode.admin]
                        .passwordHistoryType,
                verification: null,
                workspaceContext: workspaceContexts[index],
                createdBy,
            })
        );

        return { inputs, passwordHasheds };
    }

    async notifyImported(
        users: IUser[],
        passwordHasheds: IUserImportPrepared['passwordHasheds'],
        createdBy: string
    ): Promise<void> {
        await Promise.all(
            users.map((newUser, index) =>
                this.notificationQueue.sendWelcomeByAdmin(
                    newUser.id,
                    {
                        password: passwordHasheds[index].passwordEncrypted,
                        passwordCreatedAt: this.helperDateService.formatToIso(
                            passwordHasheds[index].passwordCreated
                        ),
                        passwordExpiredAt: this.helperDateService.formatToIso(
                            passwordHasheds[index].passwordExpired
                        ),
                    },
                    createdBy
                )
            )
        );
    }

    async exportByAdmin(
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IUserExport[]> {
        const users = await this.userRepository.findExport(
            status ?? null,
            roleId ?? null,
            countryId ?? null,
            this.maxDataExport + 1
        );

        if (users.length > this.maxDataExport) {
            throw new FileExceedMaxDataExportException();
        }

        return users;
    }
}
