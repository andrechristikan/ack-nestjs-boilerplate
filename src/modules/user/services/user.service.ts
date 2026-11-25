import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
import { AwsSesService } from '@common/aws/services/aws.ses.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationCursorReturn,
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import type {
    IAuthJwtAccessContext,
    IAuthPassword,
    IAuthPasswordTemporary,
} from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
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
    IUserList,
    IUserProfile,
    IUserRecipient,
} from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerificationEntry } from '@modules/user/interfaces/user.create.interface';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { UserUsernameRegex } from '@modules/user/constants/user.constant';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
    private readonly deleteSelfEmailPattern: string;
    private readonly deleteSelfUsernamePattern: string;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly userVerificationService: UserVerificationService,
        private readonly userUtil: UserUtil,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly awsSesService: AwsSesService,
        private readonly authPasswordService: AuthPasswordService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.deleteSelfEmailPattern = this.configService.get<string>(
            'user.deleteSelfEmailPattern'
        )!;
        this.deleteSelfUsernamePattern = this.configService.get<string>(
            'user.deleteSelfUsernamePattern'
        )!;
    }

    private createDeletedIdentity(id: string): IUserDeletedIdentity {
        const deletedEmail = this.deleteSelfEmailPattern.replace(
            '{id}',
            () => id
        );
        const deletedUsername = this.deleteSelfUsernamePattern.replace(
            '{id}',
            () => id
        );

        return { email: deletedEmail, username: deletedUsername };
    }

    private buildVerificationEntries({
        userId,
        createdBy,
        verification,
    }: IUserCreateWithWorkspaceInput): IUserCreateVerificationEntry[] {
        return verification ? [{ userId, createdBy, ...verification }] : [];
    }

    private isUsernamePatternInvalid(username: string): boolean {
        return !!username.search(UserUsernameRegex);
    }

    private isDeleteSelfRefused({ role }: IUser): boolean {
        return (
            role.type === EnumRoleType.admin ||
            role.type === EnumRoleType.superAdmin
        );
    }

    private gatesPasswordExpiryOn(loginWith: EnumUserLoginWith): boolean {
        return loginWith === EnumUserLoginWith.credential;
    }

    assertEmailDeliverable(): void {
        const isSesInitialized = this.awsSesService.isInitialized();
        if (!isSesInitialized) {
            throw new AwsSesNotConfiguredException();
        }
    }

    async validateUserGuard(
        authContext: IAuthJwtAccessContext,
        requiredVerified: boolean
    ): Promise<IUser> {
        const user = await this.userRepository.findOneWithRoleById(
            authContext.userId
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
            const isPasswordExpired: boolean = this.userUtil.isPasswordExpired(
                user.passwordExpired
            );
            if (isPasswordExpired) {
                throw new UserPasswordExpiredException();
            }
        }

        if (requiredVerified === true && user.isVerified !== true) {
            throw new UserEmailNotVerifiedException();
        }

        return user;
    }

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams,
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePaginationReturn<IUserList>> {
        return this.userRepository.findWithPaginationOffset(
            pagination,
            status ?? null,
            roleId ?? null,
            countryId ?? null
        );
    }

    async getOneActive(userId: string): Promise<User | null> {
        return this.userRepository.findOneActiveById(userId);
    }

    async getOneActiveByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOneActiveByEmail(email);
    }

    async createManyInTx(
        tx: IDatabaseTransactionClient,
        inputs: IUserCreateWithWorkspaceInput[]
    ): Promise<void> {
        const verifications = inputs.flatMap(input =>
            this.buildVerificationEntries(input)
        );
        // Sequential by design: a statement whose failure is the answer, awaited before an unrelated write
        await this.userRepository.createManyInTx(tx, inputs);
        if (verifications.length > 0) {
            await this.userVerificationService.createManyInTx(
                tx,
                verifications
            );
        }
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        input: IUserCreateWithWorkspaceInput
    ): Promise<IUser> {
        const verifications = this.buildVerificationEntries(input);
        // Sequential by design: a statement whose failure is the answer, awaited before an unrelated write
        const user = await this.userRepository.createInTx(tx, input);
        if (verifications.length > 0) {
            await this.userVerificationService.createManyInTx(
                tx,
                verifications
            );
        }

        return user;
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
        loginAt: Date,
        isPasswordAttemptReset: boolean
    ): Promise<User> {
        return this.userRepository.updateLoginInTx(
            tx,
            userId,
            loginFrom,
            loginWith,
            ipAddress,
            loginAt,
            isPasswordAttemptReset
        );
    }

    async touchUpdatedByInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        isPasswordChecked: boolean
    ): Promise<void> {
        await this.userRepository.touchUpdatedByInTx(
            tx,
            userId,
            isPasswordChecked
        );
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

    async getOne(id: string): Promise<IUserProfile> {
        const user = await this.userRepository.findOneProfileById(id);
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
        const passwordString = this.authPasswordService.createRandom();
        const password: IAuthPasswordTemporary =
            await this.authPasswordService.create(passwordString, {
                temporary: true,
            });
        const workspaceContexts =
            this.userCreateUtil.buildPersonalWorkspaceContexts([username]);
        const workspaceContext = workspaceContexts[0]!;
        const verification = this.userVerificationUtil.createVerified(email);
        const createdAt = this.helperDateService.now();

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
                acceptedTermPolicyTypes: [],
                password,
                passwordHistoryType:
                    UserCreateContract.admin.passwordHistoryType,
                verification,
                login: null,
                workspaceContext,
                createdAt,
                createdBy,
            },
            password,
            passwordString,
        };
    }

    async existsByEmail(email: string): Promise<boolean> {
        return this.userRepository.existsByEmail(email);
    }

    /** Counts a soft-deleted user's row as existing; an empty list reads nothing. */
    async assertAllExist(userIds: string[]): Promise<void> {
        if (userIds.length === 0) {
            return;
        }

        const count = await this.userRepository.countByIds(userIds);
        if (count !== userIds.length) {
            throw new UserNotFoundException();
        }
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

    async getOneWithRole(userId: string): Promise<IUser> {
        const user = await this.userRepository.findOneWithRoleById(userId);
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

    assertStatusChangeable(
        { status: currentStatus }: IUser,
        status: EnumUserStatus
    ): void {
        if (currentStatus === status) {
            throw new UserStatusInvalidException();
        }
    }

    /** Writes the status guarded on the target's current one, a status changed first rejecting with UserStatusInvalidException; activating a user resets its password attempt counter and clears its lock. */
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
        return this.userRepository.updateStatusByAdminInTx(
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
    }

    async checkUsername(username: string): Promise<IUserCheckUsername> {
        const isUsernamePatternInvalid =
            this.isUsernamePatternInvalid(username);
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
        userId: string,
        deletedAt: Date
    ): Promise<void> {
        const identity = this.createDeletedIdentity(userId);

        await this.userRepository.deleteSelfInTx(
            tx,
            userId,
            identity,
            deletedAt
        );
    }

    /** Returns the live row of any status, or `null` when the user is deleted or missing. */
    async getOneLive(userId: string): Promise<User | null> {
        return this.userRepository.findOneById(userId);
    }

    revokesSessionsOn(status: EnumUserStatus): boolean {
        return status !== EnumUserStatus.active;
    }

    resetsMfaAttemptOn(status: EnumUserStatus): boolean {
        return status === EnumUserStatus.active;
    }

    resolveStatusActivityLogAction(
        status: EnumUserStatus
    ): EnumActivityLogAction {
        return status === EnumUserStatus.blocked
            ? EnumActivityLogAction.userBlockedByAdmin
            : EnumActivityLogAction.userStatusUpdatedByAdmin;
    }
}
