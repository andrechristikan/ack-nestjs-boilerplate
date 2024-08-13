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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClientSession, Connection } from 'mongoose';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
    AuthJwtRefreshProtected,
    AuthJwtToken,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { AuthJwtRefreshPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.refresh-payload.dto';
import { IAuthPassword } from 'src/modules/auth/interfaces/auth.interface';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserService } from 'src/modules/user/services/user.service';
import { AuthRefreshResponseDto } from 'src/modules/auth/dtos/response/auth.refresh.response.dto';
import { AuthChangePasswordRequestDto } from 'src/modules/auth/dtos/request/auth.change-password.request.dto';
import {
    AuthSharedChangePasswordDoc,
    AuthSharedRefreshDoc,
} from 'src/modules/auth/docs/auth.shared.doc';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { WorkerQueue } from 'src/worker/decorators/worker.decorator';
import { ENUM_WORKER_QUEUES } from 'src/worker/enums/worker.enum';
import { Queue } from 'bullmq';
import { ENUM_EMAIL } from 'src/modules/email/enums/email.enum';

@ApiTags('modules.shared.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthSharedController {
    constructor(
        @DatabaseConnection() private readonly databaseConnection: Connection,
        @WorkerQueue(ENUM_WORKER_QUEUES.EMAIL_QUEUE)
        private readonly emailQueue: Queue,
        private readonly userService: UserService,
        private readonly authService: AuthService
    ) {}

    @AuthSharedRefreshDoc()
    @Response('auth.refresh')
    @AuthJwtRefreshProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async refresh(
        @AuthJwtToken() refreshToken: string,
        @AuthJwtPayload<AuthJwtRefreshPayloadDto>()
        { _id, loginFrom }: AuthJwtRefreshPayloadDto
    ): Promise<IResponse<AuthRefreshResponseDto>> {
        const user = await this.userService.findOneActiveById(_id);

        const roleType = user.role.type;
        const tokenType: string = await this.authService.getTokenType();

        const expiresInAccessToken: number =
            await this.authService.getAccessTokenExpirationTime();
        const payloadAccessToken: AuthJwtAccessPayloadDto =
            await this.authService.createPayloadAccessToken(user, loginFrom);
        const accessToken: string = await this.authService.createAccessToken(
            user.email,
            payloadAccessToken
        );

        return {
            data: {
                tokenType,
                roleType,
                expiresIn: expiresInAccessToken,
                accessToken,
                refreshToken,
            },
        };
    }

    @AuthSharedChangePasswordDoc()
    @Response('auth.changePassword')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/change-password')
    async changePassword(
        @Body() body: AuthChangePasswordRequestDto,
        @AuthJwtPayload<AuthJwtAccessPayloadDto>()
        { _id }: AuthJwtAccessPayloadDto
    ): Promise<void> {
        let user = await this.userService.findOneById(_id);

        const passwordAttempt: boolean =
            await this.authService.getPasswordAttempt();
        const passwordMaxAttempt: number =
            await this.authService.getPasswordMaxAttempt();
        if (passwordAttempt && user.passwordAttempt >= passwordMaxAttempt) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                message: 'auth.error.passwordAttemptMax',
            });
        }

        const matchPassword: boolean = await this.authService.validateUser(
            body.oldPassword,
            user.password
        );
        if (!matchPassword) {
            await this.userService.increasePasswordAttempt(user);

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.passwordNotMatch',
            });
        }

        const password: IAuthPassword = await this.authService.createPassword(
            body.newPassword
        );

        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            user = await this.userService.resetPasswordAttempt(user, {
                session,
            });
            user = await this.userService.updatePassword(user, password, {
                session,
            });

            this.emailQueue.add(
                ENUM_EMAIL.CHANGE_PASSWORD,
                {
                    email: user.email,
                    name: user.name,
                },
                {
                    debounce: {
                        id: `${ENUM_EMAIL.CHANGE_PASSWORD}-${user._id}`,
                        ttl: 1000,
                    },
                }
            );

            await session.commitTransaction();
            await session.endSession();
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }
    }
}
