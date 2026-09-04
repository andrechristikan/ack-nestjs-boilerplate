import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumUserLoginWith } from '@generated/prisma-client';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserLoginResponseDto } from '@modules/user/dtos/response/user.login.response.dto';
import { IUser } from '@modules/user/interfaces/user.interface';

export interface IUserAuthHttpService {
    loginCredential({
        email,
        password,
        from,
        device,
    }: UserLoginRequestDto): Promise<IResponseReturn<UserLoginResponseDto>>;
    loginWithSocial(
        email: string,
        loginWith: EnumUserLoginWith,
        { from, device, ...others }: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<UserLoginResponseDto>>;
    refresh(
        user: IUser,
        refreshToken: string
    ): Promise<IResponseReturn<AuthTokenResponseDto>>;
    signUp({
        countryId,
        email,
        password,
        ...others
    }: UserSignUpRequestDto): Promise<void>;
    logout(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string
    ): Promise<void>;
}
