import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationEqual,
    IPaginationIn,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
} from '@generated/prisma-client';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryRepository } from '@modules/country/repositories/country.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { UserCreateModeRules } from '@modules/user/constants/user.create-mode.constant';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import { UserImportEmailExistException } from '@modules/user/exceptions/user.import-email-exist.exception';
import { UserImportUsernameExistException } from '@modules/user/exceptions/user.import-username-exist.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import { IUserImportService } from '@modules/user/interfaces/user.import.service.interface';
import {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserImportRow,
} from '@modules/user/interfaces/user.interface';
import { UserImportRepository } from '@modules/user/repositories/user.import.repository';
import { UserOnboardingRepository } from '@modules/user/repositories/user.onboarding.repository';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserImportService implements IUserImportService {
    private readonly userRoleName: string;
    private readonly userCountryName: string;

    constructor(
        private readonly userImportRepository: UserImportRepository,
        private readonly userOnboardingRepository: UserOnboardingRepository,
        private readonly roleRepository: RoleRepository,
        private readonly countryRepository: CountryRepository,
        private readonly userUtil: UserUtil,
        private readonly userOnboardingUtil: UserOnboardingUtil,
        private readonly authUtil: AuthUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationUtil: NotificationUtil,
        private readonly helperDateService: HelperDateService,
        private readonly requestStoreService: RequestStoreService,
        private readonly configService: ConfigService
    ) {
        this.userRoleName =
            this.configService.get<string>('user.default.role')!;
        this.userCountryName = this.configService.get<string>(
            'user.default.country'
        )!;
    }

    async importByAdmin(
        data: IUserImportRow[],
        createdBy: string
    ): Promise<void> {
        // TODO: Optimize by doing
        // - in background job with bullmq, also before create check username uniqueness
        // - when upload file, upload using presign
        // - load data from s3, and not process all in one time
        // - think about how to show progress status to user with bullmq

        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const emails = data.map(item => item.email);
        const usernames = data.map(item => item.username);

        const [
            checkRole,
            checkCountry,
            existingUsersByEmail,
            existingUsersByUsername,
            badWordChecks,
        ] = await Promise.all([
            this.roleRepository.existByName(this.userRoleName),
            this.countryRepository.existByAlpha2Code(this.userCountryName),
            this.userImportRepository.findByEmails(emails),
            this.userImportRepository.findByUsernames(usernames),
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
        } else if (!checkCountry) {
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

        try {
            const totalData = data.length;
            const userIds = Array(totalData)
                .fill(0)
                .map(() => this.databaseUtil.createId());
            const passwords = Array(totalData)
                .fill(0)
                .map(() => this.authUtil.createPasswordRandom());
            const passwordHasheds = userIds.map((e, i) =>
                this.authUtil.createPassword(e, passwords[i])
            );

            const workspaceContexts =
                this.userOnboardingUtil.buildPersonalWorkspaceContexts(
                    usernames
                );
            const isVerified = checkRole.type !== EnumRoleType.user;
            const inputs: IUserCreateWithWorkspaceInput[] = data.map(
                ({ email, name }, index) => ({
                    userId: userIds[index],
                    email,
                    name,
                    username: usernames[index],
                    countryId: checkCountry.id,
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
                    activityLogs:
                        this.userOnboardingUtil.buildOnboardingActivityLogs(
                            EnumUserCreateMode.admin,
                            workspaceContexts[index],
                            requestLog,
                            createdBy
                        ),
                    workspaceContext: workspaceContexts[index],
                    workspaceRows: this.userOnboardingUtil.buildWorkspaceRows(
                        userIds[index],
                        workspaceContexts[index],
                        createdBy
                    ),
                    createdBy,
                })
            );
            let newUsers: IUser[];
            try {
                newUsers =
                    await this.userOnboardingRepository.createManyWithWorkspace(
                        inputs
                    );
            } catch (error: unknown) {
                throw this.userOnboardingUtil.mapCreateCollision(error);
            }

            const sendEmailPromises = [];
            for (const [index, newUser] of newUsers.entries()) {
                sendEmailPromises.push(
                    this.notificationUtil.sendWelcomeByAdmin(
                        newUser.id,
                        {
                            password: passwordHasheds[index].passwordEncrypted,
                            passwordCreatedAt:
                                this.helperDateService.formatToIso(
                                    passwordHasheds[index].passwordCreated
                                ),
                            passwordExpiredAt:
                                this.helperDateService.formatToIso(
                                    passwordHasheds[index].passwordExpired
                                ),
                        },
                        createdBy
                    )
                );
            }

            await Promise.all(sendEmailPromises);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async exportByAdmin(
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IUser[]> {
        // TODO: Optimize by doing
        // - in background job with bullmq
        // - return aws s3 link
        // - think about how to show progress status to user with bullmq

        return this.userImportRepository.findExport(status, roleId, countryId);
    }
}
