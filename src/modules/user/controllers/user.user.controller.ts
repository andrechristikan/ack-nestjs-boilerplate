import { Body, ConflictException, Controller, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { PolicyRoleProtected } from 'src/modules/policy/decorators/policy.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { UserService } from 'src/modules/user/services/user.service';
import {
    UserUserUpdateMobileNumberDoc,
    UserUserUpdateUsernameDoc,
} from 'src/modules/user/docs/user.user.doc';
import { UserUpdateMobileNumberRequestDto } from 'src/modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserUpdateClaimUsernameRequestDto } from 'src/modules/user/dtos/request/user.update-claim-username.dto';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';

@ApiTags('modules.user.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserUserController {
    constructor(private readonly userService: UserService) {}

    // TODO: DELETE SELF

    @UserUserUpdateMobileNumberDoc()
    @Response('user.updateMobileNumber')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/mobile-number')
    async updateMobileNumber(
        @AuthJwtPayload<AuthJwtAccessPayloadDto>()
        { _id }: AuthJwtAccessPayloadDto,
        @Body()
        body: UserUpdateMobileNumberRequestDto
    ): Promise<void> {
        const user = await this.userService.findOneById(_id);

        await this.userService.updateMobileNumber(user, body);

        return;
    }

    @UserUserUpdateUsernameDoc()
    @Response('user.updateClaimUsername')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/claim-username')
    async updateUsername(
        @AuthJwtPayload<AuthJwtAccessPayloadDto>()
        { _id }: AuthJwtAccessPayloadDto,
        @Body()
        { username }: UserUpdateClaimUsernameRequestDto
    ): Promise<void> {
        const user = await this.userService.findOneById(_id);
        const checkUsername = await this.userService.existByUsername(username);
        if (checkUsername) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USERNAME_EXIST,
                message: 'user.error.usernameExist',
            });
        }

        await this.userService.updateClaimUsername(user, { username });

        return;
    }
}
