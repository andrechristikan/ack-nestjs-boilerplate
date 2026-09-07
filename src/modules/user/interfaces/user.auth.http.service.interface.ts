import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumUserLoginWith } from '@generated/prisma-client';
import { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import {
    IUser,
    IUserLoginOutcome,
} from '@modules/user/interfaces/user.interface';

export interface IUserAuthHttpService {
    loginCredential({
        email,
        password,
        from,
        device,
    }: UserLoginRequestDto): Promise<IResponseReturn<IUserLoginOutcome>>;
    loginWithSocial(
        email: string,
        loginWith: EnumUserLoginWith,
        { from, device, ...others }: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<IUserLoginOutcome>>;
    refresh(
        user: IUser,
        refreshToken: string
    ): Promise<IResponseReturn<IAuthToken>>;
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
