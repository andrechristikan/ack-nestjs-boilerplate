import {
    Body,
    ConflictException,
    Controller,
    InternalServerErrorException,
    NotFoundException,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClientSession, Connection } from 'mongoose';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/constants/app.status-code.constant';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import { AuthService } from 'src/common/auth/services/auth.service';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from 'src/modules/country/constants/country.status-code.constant';
import { CountryService } from 'src/modules/country/services/country.service';
import { EmailService } from 'src/modules/email/services/email.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_USER_PASSWORD_TYPE } from 'src/modules/user/constants/user.enum.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { UserPublicSignUpDoc } from 'src/modules/user/docs/user.public.doc';
import { UserSignUpRequestDto } from 'src/modules/user/dtos/request/user.sign-up.request.dto';
import { UserPasswordHistoryService } from 'src/modules/user/services/user-password-history.service';
import { UserStateHistoryService } from 'src/modules/user/services/user-state-history.service';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.public.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserPublicController {
    constructor(
        @DatabaseConnection() private readonly databaseConnection: Connection,
        private readonly userService: UserService,
        private readonly userStateHistoryService: UserStateHistoryService,
        private readonly userPasswordHistoryService: UserPasswordHistoryService,
        private readonly authService: AuthService,
        private readonly roleService: RoleService,
        private readonly emailService: EmailService,
        private readonly countryService: CountryService
    ) {}

    @UserPublicSignUpDoc()
    @Response('user.signUp')
    @ApiKeyPublicProtected()
    @Post('/sign-up')
    async signUp(
        @Body()
        { email, name, password: passwordString, country }: UserSignUpRequestDto
    ): Promise<void> {
        const promises: Promise<any>[] = [
            this.roleService.findOneByName('user'),
            this.userService.existByEmail(email),
            this.countryService.findOneActiveById(country),
        ];

        const [role, emailExist, checkCountry] = await Promise.all(promises);

        if (!role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                message: 'role.error.notFound',
            });
        } else if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                message: 'country.error.notFound',
            });
        } else if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        }

        const password = await this.authService.createPassword(passwordString);

        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            const user = await this.userService.signUp(
                role._id,
                {
                    email,
                    name,
                    password: passwordString,
                    country,
                },
                password,
                { session }
            );
            await this.userStateHistoryService.createCreated(user, user._id, {
                session,
            });
            await this.userPasswordHistoryService.createByUser(
                user,
                {
                    type: ENUM_USER_PASSWORD_TYPE.SIGN_UP_PASSWORD,
                },
                {
                    session,
                }
            );

            await this.emailService.sendWelcome({
                email,
                name,
            });

            await session.commitTransaction();
            await session.endSession();
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return;
    }
}
