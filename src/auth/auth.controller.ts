import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { ILogin, IPayload, IPayloadBasicToken } from 'src/auth/auth.interface';
import { UserService } from 'src/user/user.service';
import { ResponseService } from 'src/response/response.service';
import { Response } from 'src/response/response.decorator';
import { IResponseSuccess } from 'src/response/response.interface';
import { AppSuccessStatusCode } from 'src/status-code/status-code.success.constant';
import { AuthBasic, AuthLocal } from 'src/auth/auth.decorator';
import { ConfigService } from '@nestjs/config';
import { AUTH_JWT_EXPIRATION_TIME } from 'src/auth/auth.constant';
import { IUser } from 'src/user/user.interface';

@Controller('/auth')
export class AuthController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly configService: ConfigService
    ) {}

    @AuthLocal()
    @Post('/login')
    async login(@Body() data: ILogin): Promise<IResponseSuccess> {
        // Env Variable
        const expiredIn: number | string =
            this.configService.get('auth.jwtExpirationTime') ||
            AUTH_JWT_EXPIRATION_TIME;

        const user: IUser = await this.userService.findOneByEmail(data.email);
        const {
            id,
            email,
            firstName,
            lastName
        } = await this.userService.transformer(user);
        const payload: IPayload = {
            id,
            email,
            firstName,
            lastName
        };

        const accessToken: string = await this.authService.createAccessToken(
            payload
        );
        return this.responseService.success(AppSuccessStatusCode.LOGIN, {
            ...payload,
            accessToken,
            expiredIn
        });
    }

    @AuthBasic()
    @Post('/login-basic')
    async loginBasicToken(
        @Headers('Authorization') authorization: string
    ): Promise<IResponseSuccess> {
        // Env Variable
        const expiredIn: number | string =
            this.configService.get('auth.jwtExpirationTime') ||
            AUTH_JWT_EXPIRATION_TIME;

        const clientBasicToken: string = authorization.replace('Basic ', '');
        const payload: IPayloadBasicToken = {
            clientBasicToken
        };

        const accessToken: string = await this.authService.createAccessToken(
            payload
        );
        return this.responseService.success(AppSuccessStatusCode.LOGIN, {
            accessToken,
            expiredIn
        });
    }
}
