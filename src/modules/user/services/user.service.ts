import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IPaginationCursorReturn,
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumRoleScope,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Prisma, User } from '@generated/prisma-client/client';
import type {
    IAuthJwtAccessContext,
    IAuthPassword,
    IAuthPasswordTemporary,
} from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import type { IUserImportByAdminEffect } from '@modules/user/interfaces/user.interface';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import { UserBlockedForbiddenException } from '@modules/user/exceptions/user.blocked-forbidden.exception';
import { UserBlockedInvalidException } from '@modules/user/exceptions/user.blocked-invalid.exception';
import { UserDeleteSelfForbiddenException } from '@modules/user/exceptions/user.delete-self-forbidden.exception';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserStatusInvalidException } from '@modules/user/exceptions/user.status-invalid.exception';
import { UserAccountNotFoundException } from '@modules/user/exceptions/user.account-not-found.exception';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { UserUsernameNotAllowedException } from '@modules/user/exceptions/user.username-not-allowed.exception';
import type {
    IUser,
    IUserCheckEmail,
    IUserCheckUsername,
    IUserCreateByAdmin,
    IUserCreateByAdminPrepared,
    IUserCreateRole,
    IUserCreateWithWorkspaceInput,
    IUserDeletedIdentity,
    IUserImport,
    IUserList,
    IUserName,
    IUserProfile,
    IUserRecipient,
} from '@modules/user/interfaces/user.interface';
import { RoleService } from '@modules/role/services/role.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserService {
    private readonly deleteSelfEmailPattern: string;
    private readonly deleteSelfUsernamePattern: string;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly userVerificationService: UserVerificationService,
        private readonly mfaService: MfaService,
        private readonly userUtil: UserUtil,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly roleService: RoleService,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.deleteSelfEmailPattern = this.configService.get<string>(
            'user.deleteSelf.emailPattern'
        )!;
        this.deleteSelfUsernamePattern = this.configService.get<string>(
            'user.deleteSelf.usernamePattern'
        )!;
    }

    private createDeletedIdentity({ id }: IUser): IUserDeletedIdentity {
        const deletedEmail = this.helperStringService.fillPattern(
            this.deleteSelfEmailPattern,
            { id }
        );
        const deletedUsername = this.helperStringService.fillPattern(
            this.deleteSelfUsernamePattern,
            { id }
        );

        return { email: deletedEmail, username: deletedUsername };
    }

    private isDeleteSelfRefused({ role }: IUser): boolean {
        return (
            role.scope === EnumRoleScope.platform &&
            (role.key === EnumRolePlatformKey.admin ||
                role.key === EnumRolePlatformKey.superAdmin)
        );
    }

    private gatesPasswordExpiryOn(loginWith: EnumUserLoginWith): boolean {
        return loginWith === EnumUserLoginWith.credential;
    }

    async validateUserGuard(
        authContext: IAuthJwtAccessContext,
        requiredVerified: boolean
    ): Promise<IUser> {
        const user = await this.userRepository.findOneWithRoleById(
            authContext.userId,
            null
        );
        if (!user) {
            throw new UserAccountNotFoundException();
        } else if (user.status === EnumUserStatus.blocked) {
            throw new UserBlockedForbiddenException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        }

        const gatesPasswordExpiry = this.gatesPasswordExpiryOn(
            authContext.loginWith
        );
        if (gatesPasswordExpiry) {
            const isPasswordExpired: boolean =
                this.authPasswordUtil.isPasswordExpired(user.passwordExpired);
            if (isPasswordExpired) {
                throw new UserPasswordExpiredException();
            }
        }

        if (requiredVerified === true && user.isVerified !== true) {
            throw new UserEmailNotVerifiedException();
        }

        this.roleService.assertScope(user.role, EnumRoleScope.platform);

        return user;
    }

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams,
        status: Record<string, IPaginationIn> | null,
        roleId: Record<string, IPaginationEqual> | null,
        countryId: Record<string, IPaginationEqual> | null,
        additionalWhere: Prisma.UserWhereInput | null
    ): Promise<IResponsePaginationReturn<IUserList>> {
        return this.userRepository.findWithPaginationOffset(
            pagination,
            status,
            roleId,
            countryId,
            additionalWhere
        );
    }

    async getOneActive(userId: string): Promise<User | null> {
        return this.userRepository.findOneActiveById(userId);
    }

    async getOneActiveByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOneActiveByEmail(email);
    }

    async getNameById(userId: string): Promise<IUserName | null> {
        return this.userRepository.findNameById(userId);
    }

    async createManyInTx(
        tx: IDatabaseTransactionClient,
        inputs: IUserCreateWithWorkspaceInput[]
    ): Promise<IUser[]> {
        const users = await this.userRepository.createManyInTx(tx, inputs);
        const rows: IUser[] = [];

        for (const [index, input] of inputs.entries()) {
            if (input.verification) {
                await this.userVerificationService.createInTx(
                    tx,
                    input.userId,
                    input.verification,
                    input.createdBy
                );
            }

            await this.mfaService.createInTx(tx, input.userId, input.createdBy);
            rows.push(users[index]!);
        }

        return rows;
    }

    async setLastWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        workspaceId: string
    ): Promise<void> {
        await this.userRepository.setLastWorkspaceInTx(tx, userId, workspaceId);
    }

    async clearLastWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        workspaceId: string
    ): Promise<void> {
        await this.userRepository.clearLastWorkspaceInTx(
            tx,
            userId,
            workspaceId
        );
    }

    async getEmailByIdInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<string | null> {
        return this.userRepository.findEmailByIdInTx(tx, userId);
    }

    async resetPasswordAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.userRepository.resetPasswordAttemptInTx(tx, userId);
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

    async getListActiveRecipientCursor(
        cursor: string | null,
        limit: number,
        createdBefore: Date
    ): Promise<IPaginationCursorReturn<IUserRecipient>> {
        return this.userRepository.findActiveRecipientsCursor(
            cursor,
            limit,
            createdBefore
        );
    }

    async getManyActiveRecipientsByIds(
        ids: string[],
        createdBefore: Date
    ): Promise<IUserRecipient[]> {
        return this.userRepository.findActiveRecipientsByIds(
            ids,
            createdBefore
        );
    }

    async getOne(
        id: string,
        additionalWhere: Prisma.UserWhereInput | null
    ): Promise<IUserProfile> {
        const user = await this.userRepository.findOneProfileById(
            id,
            additionalWhere
        );
        if (!user) {
            throw new UserNotFoundException();
        }

        return user;
    }

    async prepareCreateByAdmin(
        { countryId, email, name, username }: IUserCreateByAdmin,
        createdBy: string,
        role: IUserCreateRole
    ): Promise<IUserCreateByAdminPrepared> {
        const userId = this.databaseUtil.createId();
        const passwordString = this.authPasswordUtil.createPasswordRandom();
        const password: IAuthPasswordTemporary =
            await this.authPasswordUtil.createPassword(passwordString, {
                temporary: true,
            });
        const workspaceContexts =
            this.userCreateUtil.buildPersonalWorkspaceContexts([username]);
        const workspaceContext = workspaceContexts[0]!;
        const verification = this.userVerificationUtil.createVerified(email);

        return {
            input: {
                userId,
                email,
                name,
                username,
                countryId,
                roleId: role.id,
                signUpFrom: EnumUserSignUpFrom.admin,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified: true,
                verifiedAt: verification.verifiedAt,
                acceptedTermPolicyTypes: [
                    ...UserTermPolicyContract.requiredTypes,
                ],
                password,
                passwordHistoryType:
                    UserCreateContract.admin.passwordHistoryType,
                verification,
                workspaceContext,
                createdBy,
            },
            password,
            passwordString,
        };
    }

    async existsByEmail(email: string): Promise<boolean> {
        return this.userRepository.existsByEmail(email);
    }

    assertEmailAvailable(emailExist: boolean): void {
        if (emailExist) {
            throw new UserEmailExistException();
        }
    }

    assertUsernameAvailable({
        pattern,
        badWord,
        exist,
    }: IUserCheckUsername): void {
        if (pattern) {
            throw new UserUsernameNotAllowedException();
        } else if (badWord) {
            throw new UserUsernameContainBadWordException();
        } else if (exist) {
            throw new UserUsernameExistException();
        }
    }

    assertNotSelf(userId: string, actorId: string): void {
        if (userId === actorId) {
            throw new UserNotSelfException();
        }
    }

    assertSelfDeletable(user: IUser): void {
        const isRefused = this.isDeleteSelfRefused(user);
        if (isRefused) {
            throw new UserDeleteSelfForbiddenException();
        }
    }

    async getOneWithRole(
        userId: string,
        additionalWhere: Prisma.UserWhereInput | null
    ): Promise<IUser> {
        const user = await this.userRepository.findOneWithRoleById(
            userId,
            additionalWhere
        );
        if (!user) {
            throw new UserNotFoundException();
        }

        return user;
    }

    assertUnblocked({ status }: IUser): void {
        if (status === EnumUserStatus.blocked) {
            throw new UserBlockedInvalidException();
        }
    }

    /** Writes the status guarded on the target's current one; activating a user resets its password and MFA attempt counters and clears both locks. */
    async updateStatusByAdminInTx(
        tx: IDatabaseTransactionClient,
        {
            id,
            status: currentStatus,
            passwordAttempt,
            passwordLockedUntil,
        }: IUser,
        status: EnumUserStatus
    ): Promise<User> {
        if (currentStatus === status) {
            throw new UserStatusInvalidException();
        }

        const row = await this.userRepository.updateStatusByAdminInTx(
            tx,
            id,
            currentStatus,
            {
                status,
                passwordAttempt:
                    status === EnumUserStatus.active ? 0 : passwordAttempt,
                passwordLockedUntil:
                    status === EnumUserStatus.active
                        ? null
                        : passwordLockedUntil,
            }
        );
        if (!row) {
            throw new UserStatusInvalidException();
        }

        if (status === EnumUserStatus.active) {
            await this.mfaService.resetAttemptInTx(tx, id);
        }

        return row;
    }

    async checkUsername(username: string): Promise<IUserCheckUsername> {
        const isUsernamePatternInvalid =
            this.userUtil.isUsernamePatternInvalid(username);
        const hasBadWord = this.userUtil.hasBadWord(username);
        const isExist = await this.userRepository.existsByUsername(username);

        return {
            badWord: hasBadWord,
            exist: isExist,
            pattern: isUsernamePatternInvalid,
        };
    }

    async checkEmail(email: string): Promise<IUserCheckEmail> {
        const hasBadWord = this.userUtil.hasBadWord(email);
        const isExist = await this.userRepository.existsByEmail(email);

        return {
            badWord: hasBadWord,
            exist: isExist,
        };
    }

    async deleteSelfInTx(
        tx: IDatabaseTransactionClient,
        user: IUser,
        deletedAt: Date
    ): Promise<void> {
        const identity = this.createDeletedIdentity(user);

        await this.userRepository.deleteSelfInTx(
            tx,
            user.id,
            identity,
            deletedAt
        );
    }

    revokesSessionsOn(status: EnumUserStatus): boolean {
        return status !== EnumUserStatus.active;
    }

    resolveStatusActivityLogAction(
        status: EnumUserStatus
    ): EnumActivityLogAction {
        return status === EnumUserStatus.blocked
            ? EnumActivityLogAction.userBlocked
            : EnumActivityLogAction.userUpdateStatus;
    }

    importByAdminEffect(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        rows: IUserImport[]
    ): IUserImportByAdminEffect {
        const activityLog = this.activityLogUtil.toPayload(
            requestContext,
            apiKeyContext,
            authContext,
            null
        );

        return {
            queue: EnumUserQueue.user,
            name: EnumUserProcess.importByAdmin,
            data: { rows, activityLog, created: null },
            priority: EnumQueuePriority.medium,
            idempotencyKey: null,
        };
    }
}
