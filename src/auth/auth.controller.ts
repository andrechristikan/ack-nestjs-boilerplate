import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { ILogin } from 'src/auth/auth.interface';
import { UserService } from 'src/user/user.service';
import { ResponseService } from 'src/response/response.service';
import { Response } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { AuthBasic, AuthLocal } from 'src/auth/auth.decorator';
import { ConfigService } from '@nestjs/config';
import { AUTH_JWT_EXPIRATION_TIME } from 'src/auth/auth.constant';
import { IUser, IUserSafe } from 'src/user/user.interface';
import { UserEntity } from 'src/user/user.schema';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';

@Controller('/auth')
export class AuthController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Message() private readonly messageService: MessageService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly configService: ConfigService
    ) {}

    @AuthLocal()
    @Post('/login')
    async login(@Body() data: ILogin): Promise<IResponse> {
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
        } = await this.userService.transformer<IUserSafe, UserEntity>(
            user.toObject()
        );

        const accessToken: string = await this.authService.createAccessToken({
            id,
            email,
            firstName,
            lastName
        });

        return this.responseService.success(
            this.messageService.get('auth.login.success'),
            {
                accessToken,
                expiredIn
            }
        );
    }

    @AuthBasic()
    @HttpCode(200)
    @Post('/basic-token')
    async loginBasicToken(
        @Headers('Authorization') authorization: string
    ): Promise<IResponse> {
        // Env Variable
        const expiredIn: number | string =
            this.configService.get('auth.jwtExpirationTime') ||
            AUTH_JWT_EXPIRATION_TIME;

        const clientBasicToken: string = authorization.replace('Basic ', '');
        const payload: Record<string, any> = {
            clientBasicToken
        };

        const accessToken: string = await this.authService.createAccessToken(
            payload
        );
        return this.responseService.success(
            this.messageService.get('auth.basicToken.success'),
            {
                accessToken,
                expiredIn
            }
        );
    }
}
