import {
    BadRequestException,
    Body,
    Controller,
    InternalServerErrorException,
    NotFoundException,
    Post,
} from '@nestjs/common';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/role/role.constant';
import { RoleDocument } from 'src/role/schema/role.schema';
import { RoleService } from 'src/role/service/role.service';
import { UserService } from 'src/user/service/user.service';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/user/user.constant';
import { IUserCheckExist, IUserDocument } from 'src/user/user.interface';
import { ENUM_STATUS_CODE_ERROR } from 'src/utils/error/error.constant';
import { Response } from 'src/utils/response/response.decorator';
import { IResponse } from 'src/utils/response/response.interface';
import { AuthSignUpDto } from '../dto/auth.sign-up.dto';
import { AuthLoginSerialization } from '../serialization/auth.login.serialization';
import { AuthService } from '../service/auth.service';

@Controller({
    version: '1',
    path: '/auth',
})
export class AuthPublicController {
    constructor(
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly roleService: RoleService
    ) {}

    @Response('auth.signUp')
    @Post('/sign-up')
    async signUp(
        @Body()
        { email, mobileNumber, ...body }: AuthSignUpDto
    ): Promise<IResponse> {
        const role: RoleDocument = await this.roleService.findOne<RoleDocument>(
            {
                name: 'user',
            }
        );
        if (!role) {
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
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS_ERROR,
                message: 'user.error.exist',
            });
        } else if (checkExist.email) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        } else if (checkExist.mobileNumber) {
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
                passwordExpired: password.passwordExpired,
                salt: password.salt,
            });

            const user: IUserDocument =
                await this.userService.findOneById<IUserDocument>(create._id, {
                    populate: {
                        role: true,
                        permission: true,
                    },
                });
            const safe: AuthLoginSerialization =
                await this.authService.serializationLogin(user);

            const payloadAccessToken: Record<string, any> =
                await this.authService.createPayloadAccessToken(safe, false);
            const payloadRefreshToken: Record<string, any> =
                await this.authService.createPayloadRefreshToken(safe, false, {
                    loginDate: payloadAccessToken.loginDate,
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
            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
                cause: err.message,
            });
        }
    }
}
