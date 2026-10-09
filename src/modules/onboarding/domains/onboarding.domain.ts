import {
    EnumActivityLogAction,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import type {
    IUserCreateByAdmin,
    IUserImport,
    IUserLoginOutcome,
    IUserLoginSocial,
    IUserSignUp,
} from '@modules/user/interfaces/user.interface';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { Injectable } from '@nestjs/common';

/** Sequences the sign-up and user-creation flows that span the user and workspace modules. */
@Injectable()
export class OnboardingDomain {
    constructor(
        private readonly userAuthDomain: UserAuthDomain,
        private readonly userDomain: UserDomain,
        private readonly userImportDomain: UserImportDomain,
        private readonly userOnboardingDomain: UserOnboardingDomain,
        private readonly workspaceDomain: WorkspaceDomain,
        private readonly workspaceInviteDomain: WorkspaceInviteDomain
    ) {}

    async signUp(signUp: IUserSignUp): Promise<void> {
        const workspaceContext =
            await this.workspaceInviteDomain.resolveForSignUp(
                signUp.inviteToken,
                signUp.email,
                signUp.username
            );
        const { input, emailVerification } =
            await this.userAuthDomain.prepareSignUp(signUp, workspaceContext);
        const createTimeoutInMs =
            this.userOnboardingDomain.getCreateTimeoutInMs();
        const createdUsers = await this.workspaceDomain.commitOnboarding(
            [input],
            EnumUserCreateMode.signUp,
            createTimeoutInMs
        );
        const created = createdUsers[0]!;
        await this.userAuthDomain.notifyWelcome(created.id, emailVerification);
    }

    async loginWithSocial(
        email: string,
        loginWith: EnumUserLoginWith,
        loginSocial: IUserLoginSocial
    ): Promise<IUserLoginOutcome> {
        const workspaceContext =
            await this.workspaceInviteDomain.resolveForSignUp(
                loginSocial.inviteToken,
                email,
                loginSocial.username
            );
        const prepared = await this.userAuthDomain.prepareSocialCreate(
            email,
            loginWith,
            loginSocial,
            workspaceContext
        );
        let createdUserId: string | null = null;
        if (prepared) {
            const createTimeoutInMs =
                this.userOnboardingDomain.getCreateTimeoutInMs();
            const createdUsers = await this.workspaceDomain.commitOnboarding(
                [prepared],
                EnumUserCreateMode.social,
                createTimeoutInMs
            );
            createdUserId = createdUsers[0]!.id;
        }

        const outcome = await this.userAuthDomain.loginWithSocial(
            email,
            loginWith,
            loginSocial
        );

        // Sequential by design: write must not run if an earlier step throws
        if (createdUserId !== null) {
            await this.userAuthDomain.notifyWelcomeSocial(createdUserId);
        }

        return outcome;
    }

    async createByAdmin(
        create: IUserCreateByAdmin,
        createdBy: string
    ): Promise<string> {
        const { input, passwordString } =
            await this.userDomain.prepareCreateByAdmin(create, createdBy);
        const createTimeoutInMs =
            this.userOnboardingDomain.getCreateTimeoutInMs();
        const createdUsers = await this.workspaceDomain.commitOnboarding(
            [input],
            EnumUserCreateMode.admin,
            createTimeoutInMs,
            EnumActivityLogAction.adminUserCreate
        );
        const created = createdUsers[0]!;
        if (input.password) {
            await this.userDomain.notifyWelcomeByAdmin(
                created.id,
                passwordString,
                input.password.passwordCreated,
                input.password.passwordExpired,
                createdBy
            );
        }

        return created.id;
    }

    async importByAdmin(data: IUserImport[], createdBy: string): Promise<void> {
        const { inputs, passwordHasheds, passwordStrings } =
            await this.userImportDomain.prepareImportByAdmin(data, createdBy);
        const createBulkTimeoutInMs =
            this.userOnboardingDomain.getCreateBulkTimeoutInMs();
        const users = await this.workspaceDomain.commitOnboarding(
            inputs,
            EnumUserCreateMode.admin,
            createBulkTimeoutInMs,
            EnumActivityLogAction.adminUserImport
        );
        await this.userImportDomain.notifyImported(
            users,
            passwordHasheds,
            passwordStrings,
            createdBy
        );
    }
}
