import {
    Body,
    ConflictException,
    Controller,
    InternalServerErrorException,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from 'src/common/auth/services/auth.service';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { Response } from 'src/common/response/decorators/response.decorator';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { UserSignUpDoc } from 'src/modules/user/docs/user.public.doc';
import { UserSignUpDto } from 'src/modules/user/dtos/user.sign-up.dto';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';
import { UserUseCase } from 'src/modules/user/use-cases/user.use-case';

@ApiTags('modules.public.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserPublicController {
    constructor(
        private readonly userService: UserService,
        private readonly userUseCase: UserUseCase,
        private readonly authService: AuthService,
        private readonly roleService: RoleService
    ) {}

    @UserSignUpDoc()
    @Response('user.signUp')
    @Post('/sign-up')
    async signUp(
        @Body()
        { email, mobileNumber, username, ...body }: UserSignUpDto
    ): Promise<void> {
        const role: RoleEntity = await this.roleService.findOne<RoleEntity>({
            name: 'user',
        });

        const usernameExist: boolean = await this.userService.existUsername(
            username
        );
        if (usernameExist) {
            throw new ConflictException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_USERNAME_EXISTS_ERROR,
                message: 'user.error.usernameExist',
            });
        }

        const emailExist: boolean = await this.userService.existEmail(email);
        if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        }

        if (mobileNumber) {
            const mobileNumberExist: boolean =
                await this.userService.existMobileNumber(mobileNumber);
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

            const data: UserEntity = await this.userUseCase.create(
                { email, mobileNumber, username, ...body, role: role._id },
                password
            );
            await this.userService.create(data);

            return;
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }
    }
}
