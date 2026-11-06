import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserCredentialInvalidException } from '@modules/user/exceptions/user.credential-invalid.exception';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserCredentialAttempt,
    IUserSignUp,
    IUserSignUpResolved,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserAuthDomain {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userPasswordDomain: UserPasswordDomain,
        private readonly userVerificationDomain: UserVerificationDomain,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    /** Resolves the active credential user of an email and counts one password attempt; isAttemptCounted is false when the budget is spent, and an unknown, inactive, or passwordless account throws the credential error. */
    async incrementCredentialAttempt(
        email: string
    ): Promise<IUserCredentialAttempt> {
        const user = await this.userRepository.findOneWithRoleByEmail(email);
        if (!user || user.status !== EnumUserStatus.active || !user.password) {
            throw new UserCredentialInvalidException();
        }

        const isAttemptCounted =
            await this.userPasswordDomain.incrementPasswordAttempt(user.id);

        return { user, hashedPassword: user.password, isAttemptCounted };
    }

    /** Checks the password of a counted attempt and resets the counter on a match; false on a mismatch, so the caller records the failure before asserting it, and an expired password throws after a match. */
    async verifyCredential(
        { user, hashedPassword }: IUserCredentialAttempt,
        password: string
    ): Promise<boolean> {
        const isPasswordValid = await this.authPasswordUtil.validatePassword(
            password,
            hashedPassword
        );
        if (!isPasswordValid) {
            return false;
        }

        await this.userPasswordDomain.resetPasswordAttempt(user.id);

        const checkPasswordExpired: boolean =
            this.authPasswordUtil.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new UserPasswordExpiredException();
        }

        return true;
    }

    assertPasswordMatched(isMatch: boolean): void {
        if (!isMatch) {
            throw new UserPasswordNotMatchException();
        }
    }

    assertCredentialMatched(isMatch: boolean): void {
        if (!isMatch) {
            throw new UserCredentialInvalidException();
        }
    }

    /** Trims and lowercases the email; null when no undeleted user holds it. */
    async getOneByEmail(email: string): Promise<IUser | null> {
        return this.userRepository.findOneWithRoleByEmail(
            email.trim().toLowerCase()
        );
    }

    async getOneForSocialLogin(email: string): Promise<IUser> {
        const user = await this.userRepository.findOneWithRoleByEmail(
            email.trim().toLowerCase()
        );
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        }

        return user;
    }

    async verifyEmailBySocial(user: IUser): Promise<IUser> {
        await this.userVerificationDomain.markVerified(user.id);

        return { ...user, isVerified: true };
    }

    assertVerified(user: IUser): void {
        if (!user.isVerified) {
            throw new UserEmailNotVerifiedException();
        }
    }

    async prepareSignUp(
        {
            countryId,
            email,
            username,
            password: passwordString,
            name,
            from,
            cookies,
            marketing,
        }: IUserSignUp,
        { roleId, workspaceContext }: IUserSignUpResolved
    ): Promise<{
        input: IUserCreateWithWorkspaceInput;
        emailVerification: IUserVerificationEmailCreate;
    }> {
        const userId = this.databaseUtil.createId();
        const password =
            await this.authPasswordUtil.createPassword(passwordString);
        const emailVerification = this.userVerificationUtil.createEmail();
        const acceptedTermPolicyTypes =
            this.userCreateUtil.buildAcceptedTermPolicyTypes(
                cookies,
                marketing
            );

        return {
            input: {
                userId,
                email,
                name,
                username,
                countryId,
                roleId,
                signUpFrom: from,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified: false,
                acceptedTermPolicyTypes,
                password,
                passwordHistoryType:
                    UserCreateContract.signUp.passwordHistoryType,
                verification: {
                    reference: emailVerification.reference,
                    token: emailVerification.hashedToken,
                    type: EnumVerificationType.email,
                    to: email,
                    expiredAt: emailVerification.expiredAt,
                    verifiedAt: null,
                    isUsed: false,
                },
                workspaceContext,
                createdBy: userId,
            },
            emailVerification,
        };
    }
}
