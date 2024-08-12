import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { PolicyRoleProtected } from 'src/modules/policy/decorators/policy.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { UserService } from 'src/modules/user/services/user.service';
import {
    UserUserDeleteDoc,
    UserUserUpdateMobileNumberDoc,
    UserUserUpdateUsernameDoc,
} from 'src/modules/user/docs/user.user.doc';
import { UserUpdateMobileNumberRequestDto } from 'src/modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserUpdateClaimUsernameRequestDto } from 'src/modules/user/dtos/request/user.update-claim-username.dto';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';

@ApiTags('modules.user.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserUserController {
    constructor(private readonly userService: UserService) {}

    @UserUserDeleteDoc()
    @Response('user.delete')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete')
    async delete(
        @AuthJwtPayload('_id', UserParsePipe) user: UserDoc
    ): Promise<void> {
        await this.userService.delete(user, { deletedBy: user._id });

        return;
    }

    @UserUserUpdateMobileNumberDoc()
    @Response('user.updateMobileNumber')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/mobile-number')
    async updateMobileNumber(
        @AuthJwtPayload('_id', UserParsePipe) user: UserDoc,
        @Body()
        body: UserUpdateMobileNumberRequestDto
    ): Promise<void> {
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
        @AuthJwtPayload('_id', UserParsePipe) user: UserDoc,
        @Body()
        { username }: UserUpdateClaimUsernameRequestDto
    ): Promise<void> {
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
