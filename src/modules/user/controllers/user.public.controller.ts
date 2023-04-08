import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    ForbiddenException,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    NotFoundException,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from 'src/common/auth/services/auth.service';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/common/role/constants/role.status-code.constant';
import { RoleDoc } from 'src/common/role/repository/entities/role.entity';
import { RoleService } from 'src/common/role/services/role.service';
import { SettingService } from 'src/common/setting/services/setting.service';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import {
    UserPublicLoginDoc,
    UserPublicSignUpDoc,
} from 'src/modules/user/docs/user.public.doc';
import { UserLoginDto } from 'src/modules/user/dtos/user.login.dto';
import { UserSignUpDto } from 'src/modules/user/dtos/user.sign-up.dto';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserLoginSerialization } from 'src/modules/user/serializations/user.login.serialization';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.public.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserPublicController {
    constructor(
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly roleService: RoleService,
        private readonly settingService: SettingService
    ) {}

    @UserPublicLoginDoc()
    @Response('user.login', {
        serialization: UserLoginSerialization,
    })
    @HttpCode(HttpStatus.OK)
    @Post('/login')
    async login(
        @Body() { username, password }: UserLoginDto
    ): Promise<IResponse> {
        const user: UserDoc = await this.userService.findOneByUsername(
            username
        );
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound',
            });
        }

        const passwordAttempt: boolean =
            await this.settingService.getPasswordAttempt();
        const maxPasswordAttempt: number =
            await this.settingService.getMaxPasswordAttempt();
        if (passwordAttempt && user.passwordAttempt >= maxPasswordAttempt) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_ATTEMPT_MAX_ERROR,
                message: 'user.error.passwordAttemptMax',
            });
        }

        const validate: boolean = await this.authService.validateUser(
            password,
            user.password
        );
        if (!validate) {
            try {
                await this.userService.increasePasswordAttempt(user);
            } catch (err: any) {
                throw new InternalServerErrorException({
                    statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                    message: 'http.serverError.internalServerError',
                    _error: err.message,
                });
            }

            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_NOT_MATCH_ERROR,
                message: 'user.error.passwordNotMatch',
            });
        } else if (user.blocked) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_BLOCKED_ERROR,
                message: 'user.error.blocked',
            });
        } else if (user.inactivePermanent) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_INACTIVE_PERMANENT_ERROR,
                message: 'user.error.inactivePermanent',
            });
        } else if (!user.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_INACTIVE_ERROR,
                message: 'user.error.inactive',
            });
        }

        const userWithRole: IUserDoc = await this.userService.joinWithRole(
            user
        );
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_INACTIVE_ERROR,
                message: 'role.error.inactive',
            });
        }

        try {
            await this.userService.resetPasswordAttempt(user);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        const payload: UserPayloadSerialization =
            await this.userService.payloadSerialization(userWithRole);
        const tokenType: string = await this.authService.getTokenType();
        const expiresIn: number =
            await this.authService.getAccessTokenExpirationTime();
        const payloadAccessToken: Record<string, any> =
            await this.authService.createPayloadAccessToken(payload);
        const payloadRefreshToken: Record<string, any> =
            await this.authService.createPayloadRefreshToken(payload._id, {
                loginDate: payloadAccessToken.loginDate,
            });

        const payloadEncryption = await this.authService.getPayloadEncryption();
        let payloadHashedAccessToken: Record<string, any> | string =
            payloadAccessToken;
        let payloadHashedRefreshToken: Record<string, any> | string =
            payloadRefreshToken;

        if (payloadEncryption) {
            payloadHashedAccessToken =
                await this.authService.encryptAccessToken(payloadAccessToken);
            payloadHashedRefreshToken =
                await this.authService.encryptRefreshToken(payloadRefreshToken);
        }

        const accessToken: string = await this.authService.createAccessToken(
            payloadHashedAccessToken
        );

        const refreshToken: string = await this.authService.createRefreshToken(
            payloadHashedRefreshToken
        );

        const checkPasswordExpired: boolean =
            await this.authService.checkPasswordExpired(user.passwordExpired);

        if (checkPasswordExpired) {
            return {
                _metadata: {
                    customProperty: {
                        // override status code and message
                        statusCode:
                            ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_EXPIRED_ERROR,
                        message: 'user.error.passwordExpired',
                    },
                },
                data: { tokenType, expiresIn, accessToken, refreshToken },
            };
        }

        return {
            data: {
                tokenType,
                expiresIn,
                accessToken,
                refreshToken,
            },
        };
    }

    @UserPublicSignUpDoc()
    @Response('user.signUp')
    @Post('/sign-up')
    async signUp(
        @Body()
        { email, mobileNumber, username, ...body }: UserSignUpDto
    ): Promise<void> {
        const role: RoleDoc = await this.roleService.findOneByName('user');

        const usernameExist: boolean = await this.userService.existByUsername(
            username
        );
        if (usernameExist) {
            throw new ConflictException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_USERNAME_EXISTS_ERROR,
                message: 'user.error.usernameExist',
            });
        }

        const emailExist: boolean = await this.userService.existByEmail(email);
        if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        }

        if (mobileNumber) {
            const mobileNumberExist: boolean =
                await this.userService.existByMobileNumber(mobileNumber);
            if (mobileNumberExist) {
                throw new ConflictException({
                    statusCode:
                        ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR,
                    message: 'user.error.mobileNumberExist',
                });
            }
        }

        try {
            const password = await this.authService.createPassword(
                body.password
            );

            await this.userService.create(
                { email, mobileNumber, username, ...body, role: role._id },
                password
            );

            return;
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }
    }
}
