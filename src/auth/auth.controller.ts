import {
    Controller,
    Post,
    Body,
    HttpStatus,
    HttpCode,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
    ForbiddenException,
    InternalServerErrorException
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { IUserCheckExist, IUserDocument } from 'src/user/user.interface';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { RequestValidationPipe } from 'src/request/pipe/request.validation.pipe';
import { AuthLoginValidation } from './validation/auth.login.validation';
import { LoggerService } from 'src/logger/logger.service';
import { ENUM_LOGGER_ACTION } from 'src/logger/logger.constant';
import { AuthJwtRefreshGuard, User } from './auth.decorator';
import { Response } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import {
    ENUM_AUTH_STATUS_CODE_ERROR,
    ENUM_AUTH_STATUS_CODE_SUCCESS
} from './auth.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/user/user.constant';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/role/role.constant';
import { AuthSignUpValidation } from './validation/auth.sign-up.validation';
import { RoleDocument } from 'src/role/role.interface';
import { ENUM_STATUS_CODE_ERROR } from 'src/error/error.constant';
import { RoleService } from 'src/role/role.service';
import { AuthLoginTransformer } from './transformer/auth.login.transformer';

@Controller('/auth')
export class AuthController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly loggerService: LoggerService,
        private readonly roleService: RoleService
    ) {}

    @Response('auth.login', ENUM_AUTH_STATUS_CODE_SUCCESS.AUTH_LOGIN_SUCCESS)
    @HttpCode(HttpStatus.OK)
    @Post('/login')
    async login(
        @Body(RequestValidationPipe) data: AuthLoginValidation
    ): Promise<IResponse> {
        const rememberMe: boolean = data.rememberMe ? true : false;
        const user: IUserDocument =
            await this.userService.findOne<IUserDocument>(
                {
                    email: data.email
                },
                {
                    populate: {
                        role: true,
                        permission: true
                    }
                }
            );

        if (!user) {
            this.debuggerService.error('Authorized error user not found', {
                class: 'AuthController',
                function: 'login'
            });

            throw new NotFoundException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound'
            });
        } else if (!user.isActive) {
            this.debuggerService.error('Auth Block', {
                class: 'AuthController',
                function: 'login'
            });

            throw new UnauthorizedException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_IS_INACTIVE_ERROR,
                message: 'user.error.inactive'
            });
        } else if (!user.role.isActive) {
            this.debuggerService.error('Role Block', {
                class: 'AuthController',
                function: 'login'
            });

            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_IS_INACTIVE_ERROR,
                message: 'role.error.inactive'
            });
        }

        const validate: boolean = await this.authService.validateUser(
            data.password,
            user.password
        );

        if (!validate) {
            this.debuggerService.error('Authorized error', {
                class: 'AuthController',
                function: 'login'
            });

            throw new BadRequestException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PASSWORD_NOT_MATCH_ERROR,
                message: 'auth.error.passwordNotMatch'
            });
        }

        const safe: AuthLoginTransformer = await this.authService.mapLogin(
            user
        );

        const payload: Record<string, any> =
            await this.authService.createPayload(safe, rememberMe);
        const accessToken: string = await this.authService.createAccessToken(
            payload
        );

        const refreshToken: string = await this.authService.createRefreshToken(
            payload
        );

        await this.loggerService.info(
            ENUM_LOGGER_ACTION.LOGIN,
            `${user._id} do login`,
            user._id,
            ['login', 'withEmail']
        );

        return {
            accessToken,
            refreshToken
        };
    }

    @Response('auth.refresh')
    @AuthJwtRefreshGuard()
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async refresh(
        @User()
        { _id, rememberMe, loginDate, rememberMeExpired }: Record<string, any>
    ): Promise<IResponse> {
        const today: Date = new Date();
        const rememberMeExpiredDate = new Date(rememberMeExpired);
        if (today > rememberMeExpiredDate) {
            this.debuggerService.error('Auth expired', {
                class: 'AuthController',
                function: 'refresh'
            });

            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_EXPIRED_ERROR,
                message: 'auth.error.expired'
            });
        }

        const user: IUserDocument =
            await this.userService.findOneById<IUserDocument>(_id, {
                populate: {
                    role: true,
                    permission: true
                }
            });

        if (!user.isActive) {
            this.debuggerService.error('Auth Block', {
                class: 'AuthController',
                function: 'refresh'
            });

            throw new UnauthorizedException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_IS_INACTIVE_ERROR,
                message: 'user.error.inactive'
            });
        } else if (!user.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_IS_INACTIVE_ERROR,
                message: 'role.error.inactive'
            });
        }

        const safe: AuthLoginTransformer = await this.authService.mapLogin(
            user
        );
        const payload: Record<string, any> =
            await this.authService.createPayload(
                safe,
                rememberMe,
                loginDate,
                rememberMeExpired
            );

        const accessToken: string = await this.authService.createAccessToken(
            payload
        );

        const refreshToken: string = await this.authService.createRefreshToken(
            payload
        );

        return {
            accessToken,
            refreshToken
        };
    }

    @Response('auth.signUp')
    @Post('/sign-up')
    async signUp(
        @Body(RequestValidationPipe)
        { email, mobileNumber, ...body }: AuthSignUpValidation
    ): Promise<IResponse> {
        const role: RoleDocument = await this.roleService.findOne<RoleDocument>(
            {
                name: 'user'
            }
        );
        if (!role) {
            this.debuggerService.error('Role not found', {
                class: 'UserPublicController',
                function: 'signUp'
            });

            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR,
                message: 'role.error.notFound'
            });
        }

        const checkExist: IUserCheckExist = await this.userService.checkExist(
            email,
            mobileNumber
        );

        if (checkExist.email && checkExist.mobileNumber) {
            this.debuggerService.error('create user exist', {
                class: 'UserController',
                function: 'create'
            });

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS_ERROR,
                message: 'user.error.exist'
            });
        } else if (checkExist.email) {
            this.debuggerService.error('create user exist', {
                class: 'UserController',
                function: 'create'
            });

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist'
            });
        } else if (checkExist.mobileNumber) {
            this.debuggerService.error('create user exist', {
                class: 'UserController',
                function: 'create'
            });

            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR,
                message: 'user.error.mobileNumberExist'
            });
        }

        try {
            const create = await this.userService.create({
                ...body,
                email,
                mobileNumber,
                role: role._id
            });

            const user: IUserDocument =
                await this.userService.findOneById<IUserDocument>(create._id, {
                    populate: {
                        role: true,
                        permission: true
                    }
                });
            const safe: AuthLoginTransformer = await this.authService.mapLogin(
                user
            );
            const payload: Record<string, any> =
                await this.authService.createPayload(safe, false);

            const accessToken: string =
                await this.authService.createAccessToken(payload);

            const refreshToken: string =
                await this.authService.createRefreshToken(payload);

            return {
                accessToken,
                refreshToken
            };
        } catch (err: any) {
            this.debuggerService.error('Signup try catch', {
                class: 'UserPublicController',
                function: 'signUp',
                error: err
            });

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.server.internalServerError'
            });
        }
    }
}
