import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    Prisma,
    User,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleDomain } from '@modules/role/domains/role.domain';
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
    IUserCreateWithWorkspaceInput,
    IUserOnboardingVerificationRow,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { IWorkspaceInviteInviter } from '@modules/workspace/interfaces/workspace.interface';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserDomain {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly roleDomain: RoleDomain,
        private readonly countryDomain: CountryDomain,
        private readonly userUtil: UserUtil,
        private readonly userVerificationDomain: UserVerificationDomain,
        private readonly helperHashService: HelperHashService,
        private readonly userOnboardingDomain: UserOnboardingDomain,
        private readonly userLoginDomain: UserLoginDomain,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly helperDateService: HelperDateService,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService
    ) {}

    /** Builds the used-and-verified email verification an admin-created account is verified by. */
    private buildVerifiedVerificationRow(
        email: string
    ): IUserOnboardingVerificationRow {
        const token = this.userVerificationDomain.verificationCreateToken();

        return {
            reference:
                this.userVerificationDomain.verificationCreateReference(),
            token: this.helperHashService.sha256Hash(token),
            type: EnumVerificationType.email,
            to: email,
            expiredAt: this.userVerificationDomain.verificationSetExpiredDate(),
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
            this.authPasswordUtil.checkPasswordExpired(user.passwordExpired);
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

    async getOneActiveByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOneActiveByEmail(email);
    }

    async getNameById(userId: string): Promise<IWorkspaceInviteInviter | null> {
        return this.userRepository.findNameById(userId);
    }

    async setLastWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        workspaceId: string
    ): Promise<void> {
        await this.userRepository.setLastWorkspaceInTx(tx, userId, workspaceId);
    }

    async acceptTermPolicyInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        type: EnumTermPolicyType
    ): Promise<void> {
        await this.userRepository.acceptTermPolicyInTx(tx, userId, type);
    }

    async resetTermPolicyForActiveUsersInTx(
        tx: IDatabaseTransactionClient,
        type: EnumTermPolicyType
    ): Promise<void> {
        await this.userRepository.resetTermPolicyForActiveUsersInTx(tx, type);
    }

    async increasePasswordAttempt(userId: string): Promise<User> {
        return this.userRepository.increasePasswordAttempt(userId);
    }

    async resetPasswordAttempt(userId: string): Promise<User> {
        return this.userRepository.resetPasswordAttempt(userId);
    }

    async deactivateForMaxPasswordAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<User> {
        return this.userRepository.deactivateForMaxPasswordAttemptInTx(
            tx,
            userId
        );
    }

    async updatePasswordInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        password: IAuthPassword,
        updatedBy: string
    ): Promise<User> {
        return this.userRepository.updatePasswordInTx(
            tx,
            userId,
            password,
            updatedBy
        );
    }

    async markVerifiedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        verifiedAt: Date
    ): Promise<User> {
        return this.userRepository.markVerifiedInTx(tx, userId, verifiedAt);
    }

    async updateLoginInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        ipAddress: string | null,
        loginAt: Date
    ): Promise<User> {
        return this.userRepository.updateLoginInTx(
            tx,
            userId,
            loginFrom,
            loginWith,
            ipAddress,
            loginAt
        );
    }

    async touchUpdatedByInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.userRepository.touchUpdatedByInTx(tx, userId);
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

    async prepareCreateByAdmin(
        { countryId, email, name, roleId, username }: IUserCreateByAdmin,
        createdBy: string
    ): Promise<IUserCreateWithWorkspaceInput> {
        const [checkRole, emailExist, checkCountry] = await Promise.all([
            this.roleDomain.getById(roleId),
            this.userRepository.existsByEmail(email),
            this.countryDomain.existsById(countryId),
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
                this.userRepository.existsByUsername(username),
            ]);
        if (checkUsernamePattern) {
            throw new UserUsernameNotAllowedException();
        } else if (checkUsernameBadWord) {
            throw new UserUsernameContainBadWordException();
        } else if (usernameExist) {
            throw new UserUsernameExistException();
        }

        const userId = this.databaseUtil.createId();
        const passwordString = this.authPasswordUtil.createPasswordRandom();
        const password: IAuthPassword = this.authPasswordUtil.createPassword(
            userId,
            passwordString,
            {
                temporary: true,
            }
        );
        const [workspaceContext] =
            this.userOnboardingDomain.buildPersonalWorkspaceContexts([
                username,
            ]);
        const isVerified = checkRole.type !== EnumRoleType.user;

        return {
            userId,
            email,
            name: name ?? null,
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
            workspaceContext,
            createdBy,
        };
    }

    async notifyWelcomeByAdmin(
        userId: string,
        passwordEncrypted: string,
        passwordCreated: Date,
        passwordExpired: Date,
        createdBy: string
    ): Promise<void> {
        await this.notificationQueue.sendWelcomeByAdmin(
            userId,
            {
                password: passwordEncrypted,
                passwordCreatedAt:
                    this.helperDateService.formatToIso(passwordCreated),
                passwordExpiredAt:
                    this.helperDateService.formatToIso(passwordExpired),
            },
            createdBy
        );
    }

    async updateStatusByAdmin(
        userId: string,
        status: EnumUserStatus,
        updatedBy: string
    ): Promise<void> {
        if (userId === updatedBy) {
            throw new UserNotSelfException();
        }

        const user = await this.userRepository.findOneById(userId);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status === EnumUserStatus.blocked) {
            throw new UserBlockedInvalidException();
        }

        const action =
            status === EnumUserStatus.blocked
                ? EnumActivityLogAction.userBlocked
                : EnumActivityLogAction.userUpdateStatus;

        try {
            const updated = await this.databaseService.withTransaction(
                async tx => {
                    return this.userRepository.updateStatusByAdminInTx(
                        tx,
                        userId,
                        { status },
                        updatedBy
                    );
                }
            );

            const metadata = this.userUtil.mapActivityLogMetadata(updated);
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.adminUserUpdateStatus,
                metadata,
            });
            this.activityLogDomain.stage({
                action,
                userId,
                metadata,
            });

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
            this.userRepository.existsByUsername(username),
        ]);

        return {
            badWord: checkBadWord,
            exist: isExist,
            pattern: checkUsername,
        };
    }

    async checkEmail(email: string): Promise<IUserCheckEmail> {
        const [checkBadWord, isExist] = await Promise.all([
            this.userUtil.checkBadWord(email),
            this.userRepository.existsByEmail(email),
        ]);

        return {
            badWord: checkBadWord,
            exist: isExist,
        };
    }

    async deleteSelf(userId: string): Promise<void> {
        try {
            await this.userLoginDomain.revokeAllSessions(userId);
            const deletedAt = this.helperDateService.create();
            await this.databaseService.withTransaction(async tx => {
                await this.userRepository.deleteSelfInTx(tx, userId, deletedAt);
            });
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.userDeleteSelf,
            });

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
