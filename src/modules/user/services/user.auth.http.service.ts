import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumUserLoginWith } from '@generated/prisma-client';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserLoginResponseDto } from '@modules/user/dtos/response/user.login.response.dto';
import { IUserAuthHttpService } from '@modules/user/interfaces/user.auth.http.service.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserAuthHttpService implements IUserAuthHttpService {
    constructor(private readonly userAuthService: UserAuthService) {}

    async loginCredential({
        email,
        password,
        from,
        device,
    }: UserLoginRequestDto): Promise<IResponseReturn<UserLoginResponseDto>> {
        const outcome = await this.userAuthService.loginCredential({
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
            workspaceInviteToken,
            name,
            countryId,
            cookies,
            marketing,
        }: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<UserLoginResponseDto>> {
        const outcome = await this.userAuthService.loginWithSocial(
            email,
            loginWith,
            {
                from,
                device,
                username,
                workspaceInviteToken,
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
    ): Promise<IResponseReturn<AuthTokenResponseDto>> {
        const tokens = await this.userAuthService.refresh(user, refreshToken);

        return { data: tokens };
    }

    async signUp({
        countryId,
        email,
        username,
        password,
        workspaceInviteToken,
        name,
        from,
        cookies,
        marketing,
    }: UserSignUpRequestDto): Promise<void> {
        await this.userAuthService.signUp({
            countryId,
            email,
            username,
            password,
            workspaceInviteToken,
            name,
            from,
            cookies,
            marketing,
        });
    }

    async logout(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string
    ): Promise<void> {
        await this.userAuthService.logout(userId, sessionId, deviceOwnershipId);
    }
}
