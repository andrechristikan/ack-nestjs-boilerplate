import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    BadRequestException
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { ILogin } from 'src/auth/auth.interface';
import { UserService } from 'src/user/user.service';
import { ResponseService } from 'src/response/response.service';
import { Response, ResponseJson } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { ConfigService } from '@nestjs/config';
import { UserDocumentFull } from 'src/user/user.interface';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';

@Controller('/auth')
export class AuthController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Logger() private readonly logger: LoggerService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly configService: ConfigService
    ) {}

    @HttpCode(HttpStatus.OK)
    @ResponseJson()
    @Post('/login')
    async login(@Body() data: ILogin): Promise<IResponse> {
        const user: UserDocumentFull = await this.userService.findOne<UserDocumentFull>(
            {
                email:
                    data[this.configService.get<string>('auth.defaultUsername')]
            },
            true
        );

        if (!user) {
            this.logger.error('Authorized error user not found', {
                class: 'AuthController',
                function: 'login'
            });

            throw new BadRequestException(
                this.responseService.error('auth.error.emailNotFound')
            );
        }

        const validate: boolean = await this.authService.validateUser(
            data.password,
            user.password
        );

        if (!validate) {
            this.logger.error('Authorized error', {
                class: 'AuthController',
                function: 'login'
            });

            throw new BadRequestException(
                this.responseService.error('auth.error.passwordNotMatch')
            );
        }

        const { _id, email, firstName, lastName, role } = user;

        const accessToken: string = await this.authService.createAccessToken({
            _id,
            email,
            firstName,
            lastName,
            role: user.role.name
        });

        return this.responseService.success('auth.login', {
            accessToken,
            expiredIn: this.configService.get<string>('auth.jwtExpirationTime')
        });
    }
}
