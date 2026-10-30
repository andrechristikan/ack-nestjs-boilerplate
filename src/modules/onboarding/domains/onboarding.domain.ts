import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumUserLoginWith } from '@generated/prisma-client/client';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import type {
    IOnboardingCreateByAdmin,
    IOnboardingCreated,
    IOnboardingImport,
    IOnboardingSignUp,
} from '@modules/onboarding/interfaces/onboarding.interface';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import type {
    IRole,
    IRoleActor,
} from '@modules/role/interfaces/role.interface';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateByAdmin,
    IUserCreateWithWorkspaceInput,
    IUserImport,
    IUserLoginSocial,
    IUserSignUp,
    IUserSignUpResolved,
    IUserSignUpWorkspaceContext,
} from '@modules/user/interfaces/user.interface';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Owns the sign-up transaction: user, password history, notification defaults, verification, two-factor, personal workspace or invite acceptance, and term-policy acceptance on one transaction. */
@Injectable()
export class OnboardingDomain {
    private readonly userRoleName: string;
    private readonly userCountryName: string;
    private readonly onboardingCreateTimeoutInMs: number;
    private readonly onboardingCreateBulkTimeoutInMs: number;

    constructor(
        private readonly userAuthDomain: UserAuthDomain,
        private readonly userDomain: UserDomain,
        private readonly userImportDomain: UserImportDomain,
        private readonly userOnboardingUtil: UserOnboardingUtil,
        private readonly userVerificationDomain: UserVerificationDomain,
        private readonly userTwoFactorDomain: UserTwoFactorDomain,
        private readonly passwordHistoryDomain: PasswordHistoryDomain,
        private readonly notificationDomain: NotificationDomain,
        private readonly termPolicyAcceptanceDomain: TermPolicyAcceptanceDomain,
        private readonly workspaceDomain: WorkspaceDomain,
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly roleDomain: RoleDomain,
        private readonly countryDomain: CountryDomain,
        private readonly featureFlagDomain: FeatureFlagDomain,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService
    ) {
        this.userRoleName =
            this.configService.get<string>('user.default.role')!;
        this.userCountryName = this.configService.get<string>(
            'user.default.country'
        )!;
        this.onboardingCreateTimeoutInMs = this.configService.get<number>(
            'user.onboarding.createTimeoutInMs'
        )!;
        this.onboardingCreateBulkTimeoutInMs = this.configService.get<number>(
            'user.onboarding.createBulkTimeoutInMs'
        )!;
    }

    private async resolveWorkspaceContext(
        inviteToken: string | null,
        email: string,
        username: string
    ): Promise<IUserSignUpWorkspaceContext> {
        if (!inviteToken) {
            const personalContexts =
                this.userOnboardingUtil.buildPersonalWorkspaceContexts([
                    username,
                ]);

            return personalContexts[0]!;
        }

        // Sequential by design: gate before the work it guards
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            'workspace',
            'invitationAllowed'
        );
        const invite = await this.workspaceInviteDomain.validateInviteForEmail(
            inviteToken,
            email
        );

        return this.userOnboardingUtil.buildInviteWorkspaceContext(invite);
    }

    private resolveSignUp(
        role: IRole | null,
        countryExists: boolean,
        workspaceContext: IUserSignUpWorkspaceContext
    ): IUserSignUpResolved {
        if (!role) {
            throw new RoleNotFoundException();
        } else if (!countryExists) {
            throw new CountryNotFoundException();
        }

        return { roleId: role.id, workspaceContext };
    }

    async signUp(signUp: IUserSignUp): Promise<IOnboardingSignUp> {
        const workspaceContext = await this.resolveWorkspaceContext(
            signUp.inviteToken,
            signUp.email,
            signUp.username
        );
        const [role, countryExists, emailExist, usernameCheck] =
            await Promise.all([
                this.roleDomain.getByName(this.userRoleName),
                this.countryDomain.existsById(signUp.countryId),
                this.userDomain.existsByEmail(signUp.email),
                this.userDomain.checkUsername(signUp.username),
            ]);
        const resolved = this.resolveSignUp(
            role,
            countryExists,
            workspaceContext
        );
        this.userDomain.assertEmailAvailable(emailExist);
        this.userDomain.assertUsernameAvailable(usernameCheck);

        const { input, emailVerification } =
            await this.userAuthDomain.prepareSignUp(signUp, resolved);
        const users = await this.commit(
            [input],
            EnumUserCreateMode.signUp,
            this.onboardingCreateTimeoutInMs
        );

        return { inputs: [input], users, emailVerification };
    }

    /** Creates the user a social sign-in introduces; null when the user already exists or sign-up is closed. */
    async signUpWithSocial(
        email: string,
        loginWith: EnumUserLoginWith,
        loginSocial: IUserLoginSocial
    ): Promise<IOnboardingCreated | null> {
        const workspaceContext = await this.resolveWorkspaceContext(
            loginSocial.inviteToken,
            email,
            loginSocial.username
        );
        const [featureFlag, existing] = await Promise.all([
            this.featureFlagDomain.getMetadataByKey<{
                signUpAllowed: boolean;
            }>(
                loginWith === EnumUserLoginWith.socialGoogle
                    ? 'loginWithGoogle'
                    : 'loginWithApple'
            ),
            this.userAuthDomain.getOneByEmail(email),
        ]);
        // Sequential by design: gate before the work it guards
        if (existing || !featureFlag?.signUpAllowed) {
            return null;
        }

        const [role, countryExists, usernameCheck] = await Promise.all([
            this.roleDomain.getByName(this.userRoleName),
            this.countryDomain.existsById(loginSocial.countryId),
            this.userDomain.checkUsername(loginSocial.username),
        ]);
        const resolved = this.resolveSignUp(
            role,
            countryExists,
            workspaceContext
        );
        this.userDomain.assertUsernameAvailable(usernameCheck);

        const input = this.userAuthDomain.prepareSocialCreate(
            email,
            loginWith,
            loginSocial,
            resolved
        );
        const users = await this.commit(
            [input],
            EnumUserCreateMode.social,
            this.onboardingCreateTimeoutInMs
        );

        return { inputs: [input], users };
    }

    async createByAdmin(
        create: IUserCreateByAdmin,
        createdBy: string,
        actor: IRoleActor
    ): Promise<IOnboardingCreateByAdmin> {
        const [role, countryExists, emailExist, usernameCheck] =
            await Promise.all([
                this.roleDomain.getById(create.roleId),
                this.countryDomain.existsById(create.countryId),
                this.userDomain.existsByEmail(create.email),
                this.userDomain.checkUsername(create.username),
            ]);
        if (!role) {
            throw new RoleNotFoundException();
        }

        this.roleDomain.assertActorOutranks(actor.roleType, role.type);

        if (!countryExists) {
            throw new CountryNotFoundException();
        }

        this.userDomain.assertEmailAvailable(emailExist);
        this.userDomain.assertUsernameAvailable(usernameCheck);

        const { input, passwordString } =
            await this.userDomain.prepareCreateByAdmin(create, createdBy, role);
        const users = await this.commit(
            [input],
            EnumUserCreateMode.admin,
            this.onboardingCreateTimeoutInMs
        );

        return { inputs: [input], users, passwordString };
    }

    async importByAdmin(
        data: IUserImport[],
        createdBy: string
    ): Promise<IOnboardingImport> {
        const emails = data.map(item => item.email);
        const usernames = data.map(item => item.username);
        const [existingEmails, role, countryId, usernameChecks] =
            await Promise.all([
                this.userImportDomain.getExistingEmails(emails),
                this.roleDomain.getByName(this.userRoleName),
                this.countryDomain.getIdByAlpha2Code(this.userCountryName),
                this.userImportDomain.getUsernameChecks(usernames),
            ]);
        this.userImportDomain.assertEmailsAvailable(existingEmails);
        if (!role) {
            throw new RoleNotFoundException();
        } else if (countryId === null) {
            throw new CountryNotFoundException();
        }

        const { inputs, passwordHasheds, passwordStrings } =
            await this.userImportDomain.prepareImportByAdmin(
                data,
                createdBy,
                role,
                countryId,
                usernameChecks
            );
        const users = await this.commit(
            inputs,
            EnumUserCreateMode.admin,
            this.onboardingCreateBulkTimeoutInMs
        );

        return { inputs, users, passwordHasheds, passwordStrings };
    }

    /** Writes every new account on one transaction, retrying the personal-workspace slug candidates in turn. */
    async commit(
        inputs: IUserCreateWithWorkspaceInput[],
        mode: EnumUserCreateMode,
        timeoutInMs: number
    ): Promise<IUser[]> {
        const attempts = this.workspaceUtil.countSlugAttempts(inputs);

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                return await this.databaseService.withTransaction(
                    async tx => {
                        if (
                            mode === EnumUserCreateMode.signUp ||
                            mode === EnumUserCreateMode.social
                        ) {
                            // Sequential by design: gate before the work it guards
                            await this.termPolicyAcceptanceDomain.assertRequiredPublishedInTx(
                                tx,
                                UserTermPolicyContract.requiredTypes
                            );
                        }

                        const users = await this.userDomain.createManyInTx(
                            tx,
                            inputs
                        );
                        const rows: IUser[] = [];

                        for (const [index, input] of inputs.entries()) {
                            if (input.password && input.passwordHistoryType) {
                                await this.passwordHistoryDomain.createInTx(
                                    tx,
                                    input.userId,
                                    input.password.passwordHash,
                                    input.passwordHistoryType,
                                    input.password.passwordPeriodExpired,
                                    input.password.passwordCreated,
                                    input.createdBy
                                );
                            }

                            await this.notificationDomain.createDefaultsInTx(
                                tx,
                                input.userId
                            );

                            if (input.verification) {
                                await this.userVerificationDomain.createFromOnboardingInTx(
                                    tx,
                                    input.userId,
                                    input.verification,
                                    input.createdBy
                                );
                            }

                            const twoFactor =
                                await this.userTwoFactorDomain.createDisabledInTx(
                                    tx,
                                    input.userId,
                                    input.createdBy
                                );
                            rows.push({ ...users[index]!, twoFactor });
                        }

                        const ownedUsers = this.workspaceUtil.buildOwnedUsers(
                            inputs,
                            attempt
                        );
                        await this.workspaceDomain.createOwnedForUsersInTx(
                            tx,
                            ownedUsers
                        );

                        for (const input of inputs) {
                            const context = input.workspaceContext;
                            if (
                                context.type ===
                                EnumUserSignUpWorkspaceContextType.invite
                            ) {
                                await this.workspaceInviteDomain.acceptOnSignUpInTx(
                                    tx,
                                    input.userId,
                                    context
                                );
                                if (
                                    context.projectId &&
                                    context.projectMemberRole
                                ) {
                                    await this.projectMemberDomain.createInTx(
                                        tx,
                                        context.projectId,
                                        input.userId,
                                        context.projectMemberRole,
                                        input.userId
                                    );
                                }
                            }

                            await this.termPolicyAcceptanceDomain.acceptPublishedInTx(
                                tx,
                                input.userId,
                                input.acceptedTermPolicyTypes,
                                input.createdBy
                            );
                        }

                        return rows;
                    },
                    { timeout: timeoutInMs }
                );
            } catch (error: unknown) {
                const isSlugCollision = this.databaseUtil.isUniqueCollision(
                    error,
                    'slug'
                );
                if (isSlugCollision) {
                    continue;
                }

                const mapped =
                    this.userOnboardingUtil.mapCreateCollision(error);
                if (mapped instanceof AppBaseException) {
                    throw mapped;
                }

                throw new AppUnknownException(mapped);
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }
}
