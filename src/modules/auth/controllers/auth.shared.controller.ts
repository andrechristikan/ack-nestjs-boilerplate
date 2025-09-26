import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    Patch,
    Post,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClientSession } from 'mongoose';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
    AuthJwtRefreshProtected,
    AuthJwtToken,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { AuthService } from '@modules/auth/services/auth.service';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponse } from '@common/response/interfaces/response.interface';
import { ENUM_USER_STATUS_CODE_ERROR } from '@modules/user/enums/user.status-code.enum';
import { UserService } from '@modules/user/services/user.service';
import { AuthRefreshResponseDto } from '@modules/auth/dtos/response/auth.refresh.response.dto';
import { AuthChangePasswordRequestDto } from '@modules/auth/dtos/request/auth.change-password.request.dto';
import {
    AuthSharedChangePasswordDoc,
    AuthSharedRefreshDoc,
} from '@modules/auth/docs/auth.shared.doc';
import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import { ENUM_WORKER_QUEUES } from '@workers/enums/worker.enum';
import { Queue } from 'bullmq';
import { ENUM_PASSWORD_HISTORY_TYPE } from '@modules/password-history/enums/password-history.enum';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { SessionService } from '@modules/session/services/session.service';
import { ENUM_SESSION_STATUS_CODE_ERROR } from '@modules/session/enums/session.status-code.enum';
import { ActivityService } from '@modules/activity/services/activity.service';
import { MessageService } from '@common/message/services/message.service';
import { ENUM_SEND_EMAIL_PROCESS } from '@modules/email/enums/email.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { IUserDoc } from '@modules/user/interfaces/user.interface';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { DatabaseService } from '@common/database/services/database.service';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';

@ApiTags('modules.shared.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthSharedController {
    constructor(
        private readonly databaseService: DatabaseService,
        @InjectQueue(ENUM_WORKER_QUEUES.EMAIL_QUEUE)
        private readonly emailQueue: Queue,
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly sessionService: SessionService,
        private readonly activityService: ActivityService,
        private readonly messageService: MessageService
    ) {}

    @AuthSharedRefreshDoc()
    @Response('auth.refresh')
    @UserProtected()
    @AuthJwtRefreshProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async refresh(
        @AuthJwtToken() refreshToken: string,
        @AuthJwtPayload<IAuthJwtRefreshTokenPayload>()
        { user: userFromPayload, session }: IAuthJwtRefreshTokenPayload
    ): Promise<IResponse<AuthRefreshResponseDto>> {
        const checkActive = await this.sessionService.findLoginSession(session);
        if (!checkActive) {
            throw new UnauthorizedException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'session.error.notFound',
            });
        }

        const user: IUserDoc =
            await this.userService.findOneActiveById(userFromPayload);
        const token = this.authService.refreshToken(user, refreshToken);

        return {
            data: token,
        };
    }
}
