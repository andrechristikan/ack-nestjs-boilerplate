import {
    BadRequestException,
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    NotFoundException,
    Param,
    Post,
} from '@nestjs/common';
import { ClientSession } from 'mongoose';
import { UserService } from 'src/modules/user/services/user.service';
import { ApiTags } from '@nestjs/swagger';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import {
    ResetPasswordPublicGetDoc,
    ResetPasswordPublicRequestDoc,
    ResetPasswordPublicResetDoc,
    ResetPasswordPublicVerifyDoc,
} from 'src/modules/reset-password/docs/reset-password.public.doc';
import { ResetPasswordCreateRequestDto } from 'src/modules/reset-password/dtos/request/reset-password.create.request.dto';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { ResetPasswordService } from 'src/modules/reset-password/services/reset-password.service';
import { ResetPasswordCreteResponseDto } from 'src/modules/reset-password/dtos/response/reset-password.create.response.dto';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { IResetPasswordRequest } from 'src/modules/reset-password/interfaces/reset-password.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { ENUM_SEND_EMAIL_PROCESS } from 'src/modules/email/enums/email.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { ENUM_WORKER_QUEUES } from 'src/worker/enums/worker.enum';
import { Queue } from 'bullmq';
import { PasswordHistoryService } from 'src/modules/password-history/services/password-history.service';
import { ResetPasswordParseByTokenPipe } from 'src/modules/reset-password/pipes/reset-password.parse.pipe';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { ResetPasswordActivePipe } from 'src/modules/reset-password/pipes/reset-password.active.pipe';
import { ResetPasswordExpiredPipe } from 'src/modules/reset-password/pipes/reset-password.expired.pipe';
import { ResetPasswordDoc } from 'src/modules/reset-password/repository/entities/reset-password.entity';
import { ENUM_RESET_PASSWORD_STATUS_CODE_ERROR } from 'src/modules/reset-password/enums/reset-password.status-code.enum';
import { ResetPasswordResetRequestDto } from 'src/modules/reset-password/dtos/request/reset-password.reset.request.dto';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { IAuthPassword } from 'src/modules/auth/interfaces/auth.interface';
import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';
import { ResetPasswordVerifyRequestDto } from 'src/modules/reset-password/dtos/request/reset-password.verify.request.dto';
import { DatabaseService } from 'src/common/database/services/database.service';

@ApiTags('modules.public.resetPassword')
@Controller({
    version: '1',
    path: '/reset-password',
})
export class ResetPasswordPublicController {
    constructor(
        private readonly databaseService: DatabaseService,
        @InjectQueue(ENUM_WORKER_QUEUES.EMAIL_QUEUE)
        private readonly emailQueue: Queue,
        private readonly userService: UserService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly authService: AuthService,
        private readonly resetPasswordService: ResetPasswordService
    ) {}

    @ResetPasswordPublicRequestDoc()
    @Response('resetPassword.request')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/request')
    async request(
        @Body() { email }: ResetPasswordCreateRequestDto
    ): Promise<IResponse<ResetPasswordCreteResponseDto>> {
        const user: IUserDoc =
            await this.userService.findOneActiveByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        const checkLatest: IResetPasswordRequest =
            await this.resetPasswordService.checkActiveLatestEmailByUser(
                user._id
            );
        if (checkLatest) {
            return {
                data: checkLatest.created,
            };
        }

        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            await this.resetPasswordService.inactiveEmailManyByUser(user._id, {
                session,
            });

            const resetPassword =
                await this.resetPasswordService.requestEmailByUser(
                    user._id,
                    {
                        email,
                    },
                    { session }
                );

            this.emailQueue.add(
                ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD,
                {
                    send: { email, name: user.name },
                    data: resetPassword.created,
                },
                {
                    debounce: {
                        id: `${ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD}-${user._id}`,
                        ttl: 1000,
                    },
                }
            );

            await this.databaseService.commitTransaction(session);

            return {
                data: resetPassword.created,
            };
        } catch (err: unknown) {
            await this.databaseService.abortTransaction(session);

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @ResetPasswordPublicGetDoc()
    @Response('resetPassword.get')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/get/:token')
    async get(
        @Param(
            'token',
            RequestRequiredPipe,
            ResetPasswordParseByTokenPipe,
            ResetPasswordActivePipe,
            ResetPasswordExpiredPipe
        )
        resetPassword: ResetPasswordDoc
    ): Promise<IResponse<ResetPasswordCreteResponseDto>> {
        const user = await this.userService.findOneById(resetPassword.user);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        const mapped = this.resetPasswordService.mapResetPasswordResponse(
            resetPassword,
            {
                email: user.email,
            }
        );

        return {
            data: mapped,
        };
    }

    @ResetPasswordPublicVerifyDoc()
    @Response('resetPassword.verify')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/verify/:token')
    async verify(
        @Param(
            'token',
            RequestRequiredPipe,
            ResetPasswordParseByTokenPipe,
            ResetPasswordActivePipe,
            ResetPasswordExpiredPipe
        )
        resetPassword: ResetPasswordDoc,
        @Body()
        { otp }: ResetPasswordVerifyRequestDto
    ): Promise<void> {
        const user = await this.userService.findOneById(resetPassword.user);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        const check: boolean = this.resetPasswordService.checkOtp(
            resetPassword.otp,
            otp
        );
        if (!check) {
            throw new BadRequestException({
                statusCode: ENUM_RESET_PASSWORD_STATUS_CODE_ERROR.OTP_NOT_MATCH,
                message: 'resetPassword.error.otpNotMatch',
            });
        }

        await this.resetPasswordService.verify(resetPassword);

        return;
    }

    @ResetPasswordPublicResetDoc()
    @Response('resetPassword.reset')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/reset/:token')
    async reset(
        @Param(
            'token',
            RequestRequiredPipe,
            ResetPasswordParseByTokenPipe,
            ResetPasswordActivePipe,
            ResetPasswordExpiredPipe
        )
        resetPassword: ResetPasswordDoc,
        @Body()
        { newPassword }: ResetPasswordResetRequestDto
    ): Promise<void> {
        let user = await this.userService.findOneById(resetPassword.user);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            const password: IAuthPassword =
                this.authService.createPassword(newPassword);

            user = await this.userService.updatePassword(user, password, {
                session,
            });
            await this.resetPasswordService.reset(resetPassword, {
                session,
            });
            await this.passwordHistoryService.createByUser(user, {
                type: ENUM_PASSWORD_HISTORY_TYPE.FORGOT,
            });

            this.emailQueue.add(
                ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
                {
                    send: { email: user.email, name: user.name },
                },
                {
                    debounce: {
                        id: `${ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD}-${user._id}`,
                        ttl: 1000,
                    },
                }
            );

            await this.databaseService.commitTransaction(session);

            return;
        } catch (err: unknown) {
            await this.databaseService.abortTransaction(session);

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
