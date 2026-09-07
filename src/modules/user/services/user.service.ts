import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    Prisma,
    User,
} from '@generated/prisma-client';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryService } from '@modules/country/services/country.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleService } from '@modules/role/services/role.service';
import { UserCreateModeRules } from '@modules/user/constants/user.create-mode.constant';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import { UserBlockedForbiddenException } from '@modules/user/exceptions/user.blocked-forbidden.exception';
import { UserBlockedInvalidException } from '@modules/user/exceptions/user.blocked-invalid.exception';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotAuthenticatedException } from '@modules/user/exceptions/user.not-authenticated.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserNotFoundForbiddenException } from '@modules/user/exceptions/user.not-found-forbidden.exception';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { UserUsernameNotAllowedException } from '@modules/user/exceptions/user.username-not-allowed.exception';
import {
    IUser,
    IUserCheckEmail,
    IUserCheckUsername,
    IUserContact,
    IUserCreateByAdmin,
    IUserOnboardingVerificationRow,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { IUserService } from '@modules/user/interfaces/user.service.interface';
import { UserOnboardingRepository } from '@modules/user/repositories/user.onboarding.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserLoginService } from '@modules/user/services/user.login.service';
import { UserOnboardingService } from '@modules/user/services/user.onboarding.service';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService implements IUserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userOnboardingRepository: UserOnboardingRepository,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly userUtil: UserUtil,
        private readonly userVerificationService: UserVerificationService,
        private readonly helperHashService: HelperHashService,
        private readonly userOnboardingUtil: UserOnboardingUtil,
        private readonly userOnboardingService: UserOnboardingService,
        private readonly userLoginService: UserLoginService,
        private readonly authPasswordService: AuthPasswordService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly helperDateService: HelperDateService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    /** Builds the used-and-verified email verification an admin-created account is verified by. */
    private buildVerifiedVerificationRow(
        email: string
    ): IUserOnboardingVerificationRow {
        const token = this.userVerificationService.verificationCreateToken();

        return {
            reference:
                this.userVerificationService.verificationCreateReference(),
            token: this.helperHashService.sha256Hash(token),
            type: EnumVerificationType.email,
            to: email,
            expiredAt:
                this.userVerificationService.verificationSetExpiredDate(),
            verifiedAt: this.helperDateService.create(),
            isUsed: true,
        };
    }

    async validateUserGuard(
        userId: string | null,
        requiredVerified: boolean
    ): Promise<IUser> {
        if (!userId) {
            throw new UserNotAuthenticatedException();
        }

        const user = await this.userRepository.findOneWithRoleById(userId);
        if (!user) {
            throw new UserNotFoundForbiddenException();
        } else if (user.status === EnumUserStatus.blocked) {
            throw new UserBlockedForbiddenException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        }

        const checkPasswordExpired: boolean =
            this.authPasswordService.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new UserPasswordExpiredException();
        }

        if (requiredVerified === true && user.isVerified !== true) {
            throw new UserEmailNotVerifiedException();
        }

        return user;
    }

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IUser>> {
        return this.userRepository.findWithPaginationOffset(
            pagination,
            status,
            roleId,
            countryId
        );
    }

    async getOneActive(userId: string): Promise<User | null> {
        return this.userRepository.findOneActiveById(userId);
    }

    async getListActive(): Promise<IUserContact[]> {
        return this.userRepository.findActive();
    }

    async getOne(id: string): Promise<IUserProfile> {
        const user = await this.userRepository.findOneProfileById(id);
        if (!user) {
            throw new UserNotFoundException();
        }

        return user;
    }

    async createByAdmin(
        { countryId, email, name, roleId, username }: IUserCreateByAdmin,
        createdBy: string
    ): Promise<string> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const [checkRole, emailExist, checkCountry] = await Promise.all([
            this.roleService.existById(roleId),
            this.userRepository.existByEmail(email),
            this.countryService.existById(countryId),
        ]);

        if (!checkRole) {
            throw new RoleNotFoundException();
        } else if (!checkCountry) {
            throw new CountryNotFoundException();
        } else if (emailExist) {
            throw new UserEmailExistException();
        }

        const [checkUsernamePattern, checkUsernameBadWord, usernameExist] =
            await Promise.all([
                this.userUtil.checkUsernamePattern(username),
                this.userUtil.checkBadWord(username),
                this.userRepository.existByUsername(username),
            ]);
        if (checkUsernamePattern) {
            throw new UserUsernameNotAllowedException();
        } else if (checkUsernameBadWord) {
            throw new UserUsernameContainBadWordException();
        } else if (usernameExist) {
            throw new UserUsernameExistException();
        }

        try {
            const userId = this.databaseUtil.createId();
            const passwordString =
                this.authPasswordService.createPasswordRandom();
            const password: IAuthPassword =
                this.authPasswordService.createPassword(
                    userId,
                    passwordString,
                    {
                        temporary: true,
                    }
                );
            const [workspaceContext] =
                this.userOnboardingService.buildPersonalWorkspaceContexts([
                    username,
                ]);
            const isVerified = checkRole.type !== EnumRoleType.user;
            let created: IUser;
            try {
                created =
                    await this.userOnboardingRepository.createWithWorkspace({
                        userId,
                        email,
                        name,
                        username,
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
                        password,
                        passwordHistoryType:
                            UserCreateModeRules[EnumUserCreateMode.admin]
                                .passwordHistoryType,
                        verification: isVerified
                            ? this.buildVerifiedVerificationRow(email)
                            : null,
                        activityLogs:
                            this.userOnboardingService.buildOnboardingActivityLogs(
                                EnumUserCreateMode.admin,
                                workspaceContext,
                                requestLog,
                                createdBy
                            ),
                        workspaceContext,
                        workspaceRows:
                            this.userOnboardingService.buildWorkspaceRows(
                                userId,
                                workspaceContext,
                                createdBy
                            ),
                        createdBy,
                    });
            } catch (error: unknown) {
                throw this.userOnboardingUtil.mapCreateCollision(error);
            }

            await this.notificationQueue.sendWelcomeByAdmin(
                created.id,
                {
                    password: password.passwordEncrypted,
                    passwordCreatedAt: this.helperDateService.formatToIso(
                        password.passwordCreated
                    ),
                    passwordExpiredAt: this.helperDateService.formatToIso(
                        password.passwordExpired
                    ),
                },
                createdBy
            );

            this.requestStoreService.merge<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey,
                this.userUtil.mapActivityLogMetadata(created)
            );

            return created.id;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async updateStatusByAdmin(
        userId: string,
        status: EnumUserStatus,
        updatedBy: string
    ): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        if (userId === updatedBy) {
            throw new UserNotSelfException();
        }

        const user = await this.userRepository.findOneById(userId);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status === EnumUserStatus.blocked) {
            throw new UserBlockedInvalidException();
        }

        try {
            const updated = await this.userRepository.updateStatusByAdmin(
                userId,
                { status },
                requestLog,
                updatedBy
            );

            this.requestStoreService.merge<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey,
                this.userUtil.mapActivityLogMetadata(updated)
            );

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async checkUsername(username: string): Promise<IUserCheckUsername> {
        const [checkUsername, checkBadWord, isExist] = await Promise.all([
            this.userUtil.checkUsernamePattern(username),
            this.userUtil.checkBadWord(username),
            this.userRepository.existByUsername(username),
        ]);

        return {
            badWord: checkBadWord,
            exist: !!isExist,
            pattern: checkUsername,
        };
    }

    async checkEmail(email: string): Promise<IUserCheckEmail> {
        const [checkBadWord, isExist] = await Promise.all([
            this.userUtil.checkBadWord(email),
            this.userRepository.existByEmail(email),
        ]);

        return {
            badWord: checkBadWord,
            exist: !!isExist,
        };
    }

    async deleteSelf(userId: string): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        try {
            await this.userLoginService.revokeAllSessions(userId);
            await this.userRepository.deleteSelf(userId, requestLog);
            // TODO: delete device ownership

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
