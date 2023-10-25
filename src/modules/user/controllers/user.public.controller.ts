import { Body, ConflictException, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import { AuthService } from 'src/common/auth/services/auth.service';
import { Response } from 'src/common/response/decorators/response.decorator';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_USER_SIGN_UP_FROM } from 'src/modules/user/constants/user.enum.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { UserPublicSignUpDoc } from 'src/modules/user/docs/user.public.doc';
import { UserSignUpDto } from 'src/modules/user/dtos/user.sign-up.dto';
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
        private readonly roleService: RoleService
    ) {}

    @UserPublicSignUpDoc()
    @Response('user.signUp')
    @ApiKeyPublicProtected()
    @Post('/sign-up')
    async signUp(
        @Body()
        { email, mobileNumber, ...body }: UserSignUpDto
    ): Promise<void> {
        const promises: Promise<any>[] = [
            this.roleService.findOneByName('user'),
            this.userService.existByEmail(email),
        ];

        if (mobileNumber) {
            promises.push(this.userService.existByMobileNumber(mobileNumber));
        }

        const [role, emailExist, mobileNumberExist] =
            await Promise.all(promises);

        if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        } else if (mobileNumberExist) {
            throw new ConflictException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR,
                message: 'user.error.mobileNumberExist',
            });
        }

        const password = await this.authService.createPassword(body.password);

        await this.userService.create(
            {
                email,
                mobileNumber,
                signUpFrom: ENUM_USER_SIGN_UP_FROM.PUBLIC,
                role: role._id,
                ...body,
            },
            password
        );

        return;
    }
}
