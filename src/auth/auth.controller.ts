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
import { Response } from 'src/response/response.decorator';
import { ConfigService } from '@nestjs/config';
import { UserDocumentFull } from 'src/user/user.interface';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';
import { MessageService } from 'src/message/message.service';
import { Message } from 'src/message/message.decorator';

@Controller('/auth')
export class AuthController {
    constructor(
        @Message() private readonly messageService: MessageService,
        @Logger() private readonly logger: LoggerService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly configService: ConfigService
    ) {}

    @Post('/login')
    @Response('auth.login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() data: ILogin): Promise<Record<string, any>> {
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
                this.messageService.get('auth.error.emailNotFound')
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
                this.messageService.get('auth.error.passwordNotMatch')
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

        return {
            accessToken,
            expiredIn: this.configService.get<string>('auth.jwtExpirationTime')
        };
    }
}
