import {
    BadRequestException,
    Body,
    Controller,
    InternalServerErrorException,
    NotFoundException,
    Post,
} from '@nestjs/common';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/role/role.constant';
import { RoleDocument } from 'src/role/schema/role.schema';
import { RoleService } from 'src/role/service/role.service';
import { UserService } from 'src/user/service/user.service';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/user/user.constant';
import { IUserCheckExist, IUserDocument } from 'src/user/user.interface';
import { ENUM_STATUS_CODE_ERROR } from 'src/utils/error/error.constant';
import { RequestValidationPipe } from 'src/utils/request/pipe/request.validation.pipe';
import { Response } from 'src/utils/response/response.decorator';
import { IResponse } from 'src/utils/response/response.interface';
import { AuthService } from '../service/auth.service';
import { AuthLoginTransformer } from '../transformer/auth.login.transformer';
import { AuthSignUpValidation } from '../validation/auth.sign-up.validation';

@Controller({
    version: '1',
})
export class AuthPublicController {
    constructor(
        private readonly debuggerService: DebuggerService,
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly roleService: RoleService
    ) {}

    @Response('auth.signUp')
    @Post('/sign-up')
    async signUp(
        @Body(RequestValidationPipe)
        { email, mobileNumber, ...body }: AuthSignUpValidation
    ): Promise<IResponse> {
        const role: RoleDocument = await this.roleService.findOne<RoleDocument>(
            {
                name: 'user',
            }
        );
        if (!role) {
            this.debuggerService.error(
                'Role not found',
                'AuthController',
                'signUp'
            );

            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR,
                message: 'role.error.notFound',
            });
        }

        const checkExist: IUserCheckExist = await this.userService.checkExist(
            email,
            mobileNumber
        );

        if (checkExist.email && checkExist.mobileNumber) {
            this.debuggerService.error(
                'create user exist',
                'UserController',
                'create'
            );

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS_ERROR,
                message: 'user.error.exist',
            });
        } else if (checkExist.email) {
            this.debuggerService.error(
                'create user exist',
                'UserController',
                'create'
            );

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        } else if (checkExist.mobileNumber) {
            this.debuggerService.error(
                'create user exist',
                'UserController',
                'create'
            );

            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR,
                message: 'user.error.mobileNumberExist',
            });
        }

        try {
            const password = await this.authService.createPassword(
                body.password
            );

            const create = await this.userService.create({
                firstName: body.firstName,
                lastName: body.lastName,
                email,
                mobileNumber,
                role: role._id,
                password: password.passwordHash,
                passwordExpiredDate: password.passwordExpiredDate,
                salt: password.salt,
            });

            const user: IUserDocument =
                await this.userService.findOneById<IUserDocument>(create._id, {
                    populate: {
                        role: true,
                        permission: true,
                    },
                });
            const safe: AuthLoginTransformer = await this.authService.mapLogin(
                user
            );

            const payloadAccessToken: Record<string, any> =
                await this.authService.createPayloadAccessToken(safe, false);
            const payloadRefreshToken: Record<string, any> =
                await this.authService.createPayloadRefreshToken(safe, false, {
                    loginDate: payloadAccessToken.loginDate,
                    loginExpiredDate: payloadAccessToken.loginExpiredDate,
                });

            const accessToken: string =
                await this.authService.createAccessToken(payloadAccessToken);

            const refreshToken: string =
                await this.authService.createRefreshToken(
                    payloadRefreshToken,
                    false
                );

            return {
                accessToken,
                refreshToken,
            };
        } catch (err: any) {
            this.debuggerService.error(
                'Signup try catch',
                'AuthController',
                'signUp',
                err
            );

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }
    }
}
