import {
    Body,
    Controller,
    Delete,
    InternalServerErrorException,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClientSession, Connection } from 'mongoose';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/constants/app.status-code.constant';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { ENUM_POLICY_ROLE_TYPE } from 'src/common/policy/constants/policy.enum.constant';
import { PolicyRoleProtected } from 'src/common/policy/decorators/policy.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import {
    User,
    UserProtected,
} from 'src/modules/user/decorators/user.decorator';
import {
    UserAuthUpdateMobileNumberDoc,
    UserUserDeleteSelfDoc,
} from 'src/modules/user/docs/user.user.doc';
import { UserUpdateMobileNumberRequestDto } from 'src/modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserStateHistoryService } from 'src/modules/user/services/user-state-history.service';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.user.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserUserController {
    constructor(
        @DatabaseConnection() private readonly databaseConnection: Connection,
        private readonly userService: UserService,
        private readonly userStateHistoryService: UserStateHistoryService
    ) {}

    @UserAuthUpdateMobileNumberDoc()
    @Response('user.updateMobileNumber')
    @UserProtected()
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Put('/update/mobile-number')
    async updateMobileNumber(
        @User() user: UserDoc,
        @Body()
        body: UserUpdateMobileNumberRequestDto
    ): Promise<void> {
        await this.userService.updateMobileNumber(user, body);

        return;
    }

    @UserUserDeleteSelfDoc()
    @Response('user.deleteSelf')
    @UserProtected()
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Delete('/delete')
    async deleteSelf(@User() user: UserDoc): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.selfDelete(user, {
                session,
            });
            await this.userStateHistoryService.createBlocked(user, user._id, {
                session,
            });

            await session.commitTransaction();
            await session.endSession();

            return;
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }
    }
}
