import {
    Controller,
    Delete,
    InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClientSession } from 'mongoose';
import { Connection } from 'mongoose';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/constants/app.status-code.constant';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/common/auth/decorators/auth.jwt.decorator';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { ENUM_POLICY_ROLE_TYPE } from 'src/common/policy/constants/policy.enum.constant';
import { PolicyRoleProtected } from 'src/common/policy/decorators/policy.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import {
    User,
    UserProtected,
} from 'src/modules/user/decorators/user.decorator';
import { UserUserDeleteSelfDoc } from 'src/modules/user/docs/user.user.doc';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserHistoryService } from 'src/modules/user/services/user-history.service';
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
        private readonly userHistoryService: UserHistoryService
    ) {}

    @UserUserDeleteSelfDoc()
    @Response('user.deleteSelf')
    @UserProtected()
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Delete('/delete')
    async deleteSelf(
        @User() user: UserDoc,
        @AuthJwtPayload('_id') _id: string
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.selfDelete(user, {
                session,
            });
            await this.userHistoryService.createBlockedByUser(user, _id, {
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
