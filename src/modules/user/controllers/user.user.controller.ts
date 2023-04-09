import {
    Controller,
    Delete,
    InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthJwtUserAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { Response } from 'src/common/response/decorators/response.decorator';
import {
    GetUser,
    UserProtected,
} from 'src/modules/user/decorators/user.decorator';
import { UserUserDeleteSelfDoc } from 'src/modules/user/docs/user.user.doc';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.user.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserUserController {
    constructor(private readonly userService: UserService) {}

    @UserUserDeleteSelfDoc()
    @Response('user.deleteSelf')
    @UserProtected()
    @AuthJwtUserAccessProtected()
    @Delete('/delete')
    async deleteSelf(@GetUser() user: UserDoc): Promise<void> {
        try {
            await this.userService.inactivePermanent(user);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return;
    }
}
