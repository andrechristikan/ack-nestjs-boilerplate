import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumUserLoginWith } from '@generated/prisma-client/client';
import type { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserLoginOutcome,
    IUserLoginSocial,
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

    private toDeviceIdentity(device: DeviceRequestDto): IDeviceIdentity {
        return {
            fingerprint: device.fingerprint,
            name: device.name ?? null,
            platform: device.platform ?? null,
            notificationToken: device.notificationToken ?? null,
        };
    }

    async loginCredential({
        email,
        password,
        from,
        device,
    }: UserLoginRequestDto): Promise<IResponseReturn<IUserLoginOutcome>> {
        const deviceIdentity = this.toDeviceIdentity(device);
        const outcome = await this.userAuthDomain.loginCredential({
            email,
            password,
            from,
            device: deviceIdentity,
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
        const deviceIdentity = this.toDeviceIdentity(device);
        const loginSocial: IUserLoginSocial = {
            from,
            device: deviceIdentity,
            username,
            inviteToken: inviteToken ?? null,
            name: name ?? null,
            countryId,
            cookies,
            marketing,
        };
        const workspaceContext =
            await this.workspaceInviteDomain.resolveForSignUp(
                loginSocial.inviteToken,
                email,
                username
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
    }: UserSignUpRequestDto): Promise<IResponseReturn<void>> {
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
                    inviteToken: inviteToken ?? null,
                    name: name ?? null,
                    from,
                    cookies,
                    marketing,
                },
                workspaceContext
            );
        const createTimeoutInMs =
            this.userOnboardingDomain.getCreateTimeoutInMs();
        const createdUsers = await this.workspaceDomain.commitOnboarding(
            [input],
            EnumUserCreateMode.signUp,
            createTimeoutInMs
        );
        const created = createdUsers[0]!;
        await this.userAuthDomain.notifyWelcome(created.id, emailVerification);

        return {};
    }

    async logout(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        await this.userAuthDomain.logout(userId, sessionId, deviceOwnershipId);

        return {};
    }
}
