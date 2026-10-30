import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    EnumTermPolicyType,
    EnumUserLoginWith,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { UserPasswordNotSetException } from '@modules/user/exceptions/user.password-not-set.exception';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserCredentialAttempt,
    IUserLoginSocial,
    IUserSignUp,
    IUserSignUpResolved,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserAuthDomain {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userPasswordDomain: UserPasswordDomain,
        private readonly userVerificationDomain: UserVerificationDomain,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    /** Resolves the active credential user of an email and counts one password attempt against its budget. */
    async incrementCredentialAttempt(
        email: string
    ): Promise<IUserCredentialAttempt> {
        const user = await this.userRepository.findOneWithRoleByEmail(email);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        } else if (!user.password) {
            throw new UserPasswordNotSetException();
        }

        const isAttemptCounted =
            await this.userPasswordDomain.incrementPasswordAttempt(user.id);

        return { user, hashedPassword: user.password, isAttemptCounted };
    }

    /** Checks the password of a counted attempt and resets the counter on a match; false on a mismatch, so the caller records the failure before asserting it. */
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

    /** Reads the live user of an email; null when none. */
    async getOneByEmail(email: string): Promise<IUser | null> {
        return this.userRepository.findOneWithRoleByEmail(email);
    }

    prepareSocialCreate(
        email: string,
        loginWith: EnumUserLoginWith,
        {
            from,
            username,
            name,
            countryId,
            cookies,
            marketing,
        }: IUserLoginSocial,
        { roleId, workspaceContext }: IUserSignUpResolved
    ): IUserCreateWithWorkspaceInput {
        const userId = this.databaseUtil.createId();

        return {
            userId,
            email,
            name,
            username,
            countryId,
            roleId,
            signUpFrom: from,
            signUpWith:
                loginWith === EnumUserLoginWith.socialApple
                    ? EnumUserSignUpWith.socialApple
                    : EnumUserSignUpWith.socialGoogle,
            isVerified: true,
            acceptedTermPolicyTypes: [
                ...UserTermPolicyContract.requiredTypes,
                ...(cookies ? [EnumTermPolicyType.cookies] : []),
                ...(marketing ? [EnumTermPolicyType.marketing] : []),
            ],
            password: null,
            passwordHistoryType: UserCreateContract.social.passwordHistoryType,
            verification: null,
            workspaceContext,
            createdBy: userId,
        };
    }

    async getOneForSocialLogin(email: string): Promise<IUser> {
        const user = await this.userRepository.findOneWithRoleByEmail(email);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        }

        return user;
    }

    /** A social provider vouches for the email: marks the user verified. */
    async verifyEmailBySocial(user: IUser): Promise<IUser> {
        await this.userVerificationDomain.markVerified(user.id);

        return { ...user, isVerified: true };
    }

    /** Creates a fresh email verification for an unverified user trying to log in and stores it replacing the active one. */
    async persistLoginVerification(
        user: IUser
    ): Promise<IUserVerificationEmailCreate> {
        const emailVerification = this.userVerificationUtil.createEmail();
        await this.userVerificationDomain.persistVerificationEmail(
            user.id,
            user.email,
            emailVerification
        );

        return emailVerification;
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
                acceptedTermPolicyTypes: [
                    ...UserTermPolicyContract.requiredTypes,
                    ...(cookies ? [EnumTermPolicyType.cookies] : []),
                    ...(marketing ? [EnumTermPolicyType.marketing] : []),
                ],
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
