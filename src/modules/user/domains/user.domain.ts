import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import type {
    IAuthJwtAccessTokenPayloadUser,
    IAuthPassword,
} from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserBlockedForbiddenException } from '@modules/user/exceptions/user.blocked-forbidden.exception';
import { UserBlockedInvalidException } from '@modules/user/exceptions/user.blocked-invalid.exception';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserAccountNotFoundException } from '@modules/user/exceptions/user.account-not-found.exception';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
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
    IUserList,
    IUserProfile,
    IUserRecipient,
} from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserRepository } from '@modules/user/repositories/user.repository';
import type { IWorkspaceInviteInviter } from '@modules/workspace/interfaces/workspace.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserDomain {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userVerificationDomain: UserVerificationDomain,
        private readonly userTwoFactorDomain: UserTwoFactorDomain,
        private readonly userUtil: UserUtil,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async validateUserGuard(
        payload: IAuthJwtAccessTokenPayloadUser,
        requiredVerified: boolean
    ): Promise<IUser> {
        if (!payload.userId) {
            throw new RequestContextMissingException('request.user.userId');
        }

        const user = await this.userRepository.findOneWithRoleById(
            payload.userId
        );
        if (!user) {
            throw new UserAccountNotFoundException();
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

    async getManyActiveByIds(userIds: string[]): Promise<IUserRecipient[]> {
        return this.userRepository.findManyActiveByIds(userIds);
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

    async createManyInTx(
        tx: IDatabaseTransactionClient,
        inputs: IUserCreateWithWorkspaceInput[]
    ): Promise<IUser[]> {
        const users = await this.userRepository.createManyInTx(tx, inputs);
        const rows: IUser[] = [];

        for (const [index, input] of inputs.entries()) {
            if (input.verification) {
                await this.userVerificationDomain.createInTx(
                    tx,
                    input.userId,
                    input.verification,
                    input.createdBy
                );
            }

            const twoFactor = await this.userTwoFactorDomain.createDisabledInTx(
                tx,
                input.userId,
                input.createdBy
            );
            rows.push({ ...users[index]!, twoFactor });
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

    async resetPasswordAttempt(userId: string): Promise<User> {
        return this.userRepository.resetPasswordAttempt(userId);
    }

    async deactivateForMaxPasswordAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        const isDeactivated =
            await this.userRepository.deactivateForMaxPasswordAttemptInTx(
                tx,
                userId
            );
        if (!isDeactivated) {
            throw new UserPasswordAttemptMaxException();
        }
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
        take: number,
        createdBefore: Date
    ): Promise<IUserRecipient[]> {
        return this.userRepository.findActiveRecipientsCursor(
            cursor,
            take,
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
        const passwordString = this.authPasswordUtil.createPasswordRandom();
        const password: IAuthPassword =
            await this.authPasswordUtil.createPassword(passwordString, {
                temporary: true,
            });
        const workspaceContexts =
            this.userCreateUtil.buildPersonalWorkspaceContexts([username]);
        const workspaceContext = workspaceContexts[0]!;
        const isVerified = role.type !== EnumRoleType.user;
        let verification: IUserCreateVerification | null;
        if (isVerified) {
            verification = this.userVerificationUtil.createVerified(email);
        } else {
            verification = null;
        }

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
                isVerified,
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

    /** Reads a user with its role for an admin write. */
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

    /** Writes the status; activating a user resets its password attempt counter. */
    async updateStatusByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        status: EnumUserStatus,
        passwordAttempt: number | null
    ): Promise<User> {
        return this.userRepository.updateStatusByAdminInTx(tx, userId, {
            status,
            passwordAttempt:
                status === EnumUserStatus.active ? 0 : passwordAttempt,
        });
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

    async deleteSelfInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deletedAt: Date
    ): Promise<User> {
        return this.userRepository.deleteSelfInTx(tx, userId, deletedAt);
    }
}
