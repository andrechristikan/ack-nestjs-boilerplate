import {
    Controller,
    Post,
    Body,
    Headers
} from '@nestjs/common';
import { Error } from 'error/error.decorator';
import { ErrorService } from 'error/error.service';
import { ResponseService } from 'middleware/response/response.service';
import { Response } from 'middleware/response/response.decorator';
import { RequestValidationPipe } from 'pipe/request-validation.pipe';
import { AuthService } from 'auth/auth.service';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'middleware/logger/logger.decorator';
import { AuthLoginValidation } from 'auth/validation/auth.login.validation';
import { ILogin, IPayload } from 'auth/auth.interface';
import { IApiResponseSuccess } from 'middleware/response/response.interface';
import { UserService } from 'user/user.service';
import { User } from 'user/user.schema';
import { LanguageService } from 'language/language.service';
import { Language } from 'language/language.decorator';

@Controller('api/auth')
export class AuthController {
    constructor(
        @Language() private readonly languageService: LanguageService,
        @Response() private readonly responseService: ResponseService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
    ) {}


    @Post('/login')
    async store(
        @Body(RequestValidationPipe(AuthLoginValidation))
        data: ILogin
    ): Promise<IApiResponseSuccess> {

        const user: User = await this.userService.getOneByEmail(data.email);
        const payload: IPayload = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
        };
        const accessToken = await this.authService.createAccessToken(payload);
        return this.responseService.success(
            200, 
            this.languageService.get('auth.login.success'),
            {
                accessToken
            }
        );
    }
}