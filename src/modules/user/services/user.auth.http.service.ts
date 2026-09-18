import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumUserLoginWith } from '@generated/prisma-client/client';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserLoginOutcome,
} from '@modules/user/interfaces/user.interface';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserAuthHttpService {
    constructor(
        private readonly userAuthDomain: UserAuthDomain,
        private readonly userOnboardingDomain: UserOnboardingDomain,
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly workspaceDomain: WorkspaceDomain
    ) {}

    async loginCredential({
        email,
        password,
        from,
        device,
    }: UserLoginRequestDto): Promise<IResponseReturn<IUserLoginOutcome>> {
        const outcome = await this.userAuthDomain.loginCredential({
            email,
            password,
            from,
            device,
        });

        return { data: outcome };
    }

    async loginWithSocial(
        email: string,
        loginWith: EnumUserLoginWith,
        {
            from,
            device,
            username,
            inviteToken,
            name,
            countryId,
            cookies,
            marketing,
        }: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<IUserLoginOutcome>> {
        const workspaceContext =
            await this.workspaceInviteDomain.resolveForSignUp(
                inviteToken ?? null,
                email,
                username
            );
        const prepared = await this.userAuthDomain.prepareSocialCreate(
            email,
            loginWith,
            {
                from,
                device,
                username,
                inviteToken,
                name,
                countryId,
                cookies,
                marketing,
            },
            workspaceContext
        );
        if (prepared) {
            const createTimeoutInMs =
                this.userOnboardingDomain.getCreateTimeoutInMs();
            await this.workspaceDomain.commitOnboarding(
                [prepared],
                EnumUserCreateMode.social,
                createTimeoutInMs
            );
        }

        const outcome = await this.userAuthDomain.loginWithSocial(
            email,
            loginWith,
            {
                from,
                device,
                username,
                inviteToken,
                name,
                countryId,
                cookies,
                marketing,
            }
        );

        return { data: outcome };
    }

    async refresh(
        user: IUser,
        refreshToken: string
    ): Promise<IResponseReturn<IAuthToken>> {
        const tokens = await this.userAuthDomain.refresh(user, refreshToken);

        return { data: tokens };
    }

    async signUp({
        countryId,
        email,
        username,
        password,
        inviteToken,
        name,
        from,
        cookies,
        marketing,
    }: UserSignUpRequestDto): Promise<void> {
        const workspaceContext =
            await this.workspaceInviteDomain.resolveForSignUp(
                inviteToken ?? null,
                email,
                username
            );
        const { input, emailVerification } =
            await this.userAuthDomain.prepareSignUp(
                {
                    countryId,
                    email,
                    username,
                    password,
                    inviteToken,
                    name,
                    from,
                    cookies,
                    marketing,
                },
                workspaceContext
            );
        const createTimeoutInMs =
            this.userOnboardingDomain.getCreateTimeoutInMs();
        const [created] = await this.workspaceDomain.commitOnboarding(
            [input],
            EnumUserCreateMode.signUp,
            createTimeoutInMs
        );
        await this.userAuthDomain.notifyWelcome(created.id, emailVerification);
    }

    async logout(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string
    ): Promise<void> {
        await this.userAuthDomain.logout(userId, sessionId, deviceOwnershipId);
    }
}
