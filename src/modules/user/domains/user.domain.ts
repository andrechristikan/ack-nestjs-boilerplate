import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
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
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
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
import type {
    IUser,
    IUserCheckEmail,
    IUserCheckUsername,
    IUserContact,
    IUserCreateByAdmin,
    IUserCreateByAdminPrepared,
    IUserList,
    IUserOnboardingVerification,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import type { IWorkspaceInviteInviter } from '@modules/workspace/interfaces/workspace.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
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
        private readonly deviceDomain: DeviceDomain,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly helperDateService: HelperDateService,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly sessionDomain: SessionDomain
    ) {}

    /** Builds the used-and-verified email verification an admin-created account is verified by. */
    private buildVerifiedVerification(
        email: string
    ): IUserOnboardingVerification {
        const token = this.userVerificationDomain.verificationCreateToken();
        const reference =
            this.userVerificationDomain.verificationCreateReference();
        const hashedToken = this.helperHashService.sha256Hash(token);
        const expiredAt =
            this.userVerificationDomain.verificationSetExpiredDate();
        const verifiedAt = this.helperDateService.create();

        return {
            reference,
            token: hashedToken,
            type: EnumVerificationType.email,
            to: email,
            expiredAt,
            verifiedAt,
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
    ): Promise<IResponsePagingReturn<IUserList>> {
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

    async setLastWorkspace(userId: string, workspaceId: string): Promise<void> {
        await this.userRepository.setLastWorkspace(userId, workspaceId);
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
    ): Promise<void> {
        await this.userRepository.deactivateForMaxPasswordAttemptInTx(
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
    ): Promise<IUserCreateByAdminPrepared> {
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
        let verification: IUserOnboardingVerification | null;
        if (isVerified) {
            verification = this.buildVerifiedVerification(email);
        } else {
            verification = null;
        }

        return {
            input: {
                userId,
                email,
                name: name ?? null,
                username,
                countryId,
                roleId: checkRole.id,
                signUpFrom: EnumUserSignUpFrom.admin,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified,
                termPolicy: { ...UserTermPolicyContract.defaults },
                acceptedTermPolicyTypes: [
                    ...UserTermPolicyContract.requiredTypes,
                ],
                password,
                passwordHistoryType:
                    UserCreateContract[EnumUserCreateMode.admin]
                        .passwordHistoryType,
                verification,
                workspaceContext,
                createdBy,
            },
            passwordString,
        };
    }

    async notifyWelcomeByAdmin(
        userId: string,
        passwordString: string,
        passwordCreated: Date,
        passwordExpired: Date,
        createdBy: string
    ): Promise<void> {
        const passwordCreatedAt =
            this.helperDateService.formatToIso(passwordCreated);
        const passwordExpiredAt =
            this.helperDateService.formatToIso(passwordExpired);
        await this.notificationQueue.sendWelcomeByAdmin(
            userId,
            {
                password: passwordString,
                passwordCreatedAt,
                passwordExpiredAt,
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
        const revokesAccess = status !== EnumUserStatus.active;
        const now = this.helperDateService.create();

        try {
            const { statusEvents, revokeAllEvents } =
                await this.databaseService.withTransaction(async tx => {
                    const row =
                        await this.userRepository.updateStatusByAdminInTx(
                            tx,
                            userId,
                            { status }
                        );
                    const actorMetadata =
                        this.userUtil.mapActivityLogActorMetadata(row);
                    const targetMetadata =
                        this.userUtil.mapActivityLogTargetMetadata(
                            row,
                            updatedBy
                        );
                    const prepared = [
                        this.activityLogDomain.prepare({
                            action: EnumActivityLogAction.adminUserUpdateStatus,
                            metadata: actorMetadata,
                        }),
                        this.activityLogDomain.prepare({
                            action,
                            userId,
                            createdBy: updatedBy,
                            metadata: targetMetadata,
                        }),
                    ];
                    let revokeAll: IActivityLogStagedEvent[] = [];
                    if (revokesAccess) {
                        const sessions =
                            await this.sessionDomain.revokeActiveByUserInTx(
                                tx,
                                userId,
                                updatedBy,
                                now
                            );
                        revokeAll = this.sessionDomain.prepareRevokeAllByAdmin(
                            userId,
                            updatedBy,
                            sessions.length
                        );
                    }

                    return {
                        statusEvents: prepared,
                        revokeAllEvents: revokeAll,
                    };
                });
            if (revokesAccess) {
                await this.sessionDomain.finalizeRevokeAll(
                    userId,
                    revokeAllEvents
                );
            }

            this.activityLogDomain.stagePrepared(statusEvents);

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
            const revokeAllEvents = this.sessionDomain.prepareRevokeAllSelf(
                userId,
                false
            );
            const deleteSelfEvents = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userDeleteSelf,
                }),
            ];
            const now = this.helperDateService.create();
            await this.databaseService.withTransaction(async tx => {
                await this.userRepository.deleteSelfInTx(tx, userId, now);
                await this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    userId,
                    userId,
                    now
                );
                await this.deviceDomain.revokeAllByUserInTx(
                    tx,
                    userId,
                    userId,
                    now
                );
            });
            await this.sessionDomain.finalizeRevokeAll(userId, revokeAllEvents);

            this.activityLogDomain.stagePrepared(deleteSelfEvents);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
