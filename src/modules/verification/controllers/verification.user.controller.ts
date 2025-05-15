import { ENUM_SEND_SMS_PROCESS } from '@app/modules/sms/enums/sms.enum';
import { InjectQueue } from '@nestjs/bullmq';
import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    NotFoundException,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import { ClientSession } from 'mongoose';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { DatabaseService } from 'src/common/database/services/database.service';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { IAuthJwtAccessTokenPayload } from 'src/modules/auth/interfaces/auth.interface';
import { ENUM_SEND_EMAIL_PROCESS } from 'src/modules/email/enums/email.enum';
import { PolicyRoleProtected } from 'src/modules/policy/decorators/policy.decorator';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';
import {
    VerificationUserGetEmailDoc,
    VerificationUserGetMobileNumberDoc,
    VerificationUserResendEmailDoc,
    VerificationUserResendMobileNumberDoc,
    VerificationUserVerifyEmailDoc,
    VerificationUserVerifyMobileNumberDoc,
} from 'src/modules/verification/docs/verification.user.doc';
import { VerificationVerifyRequestDto } from 'src/modules/verification/dtos/request/verification.verify.request.dto';
import { VerificationResponse } from 'src/modules/verification/dtos/response/verification.response';
import { ENUM_VERIFICATION_STATUS_CODE_ERROR } from 'src/modules/verification/enums/verification.status-code.constant';
import {
    VerificationUserEmailNotVerifiedYetPipe,
    VerificationUserMobileNumberNotVerifiedYetPipe,
} from 'src/modules/verification/pipes/verification.user-not-verified-yet.pipe';
import { VerificationDoc } from 'src/modules/verification/repository/entity/verification.entity';
import { VerificationService } from 'src/modules/verification/services/verification.service';
import { ENUM_WORKER_QUEUES } from 'src/worker/enums/worker.enum';

@ApiTags('modules.user.verification')
@Controller({
    version: '1',
    path: '/verification',
})
export class VerificationUserController {
    constructor(
        private readonly databaseService: DatabaseService,
        @InjectQueue(ENUM_WORKER_QUEUES.EMAIL_QUEUE)
        private readonly emailQueue: Queue,
        @InjectQueue(ENUM_WORKER_QUEUES.SMS_QUEUE)
        private readonly smsQueue: Queue,
        private readonly verificationService: VerificationService,
        private readonly userService: UserService
    ) {}

    @VerificationUserGetEmailDoc()
    @Response('verification.getEmail')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected([false])
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/email')
    async getEmail(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
        user: UserDoc
    ): Promise<IResponse<VerificationResponse>> {
        const verification: VerificationDoc =
            await this.verificationService.findOneLatestEmailByUser(user._id);
        if (!verification) {
            throw new NotFoundException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'verification.error.notFound',
            });
        }

        const mapped: VerificationResponse =
            this.verificationService.map(verification);

        return {
            data: mapped,
        };
    }

    @VerificationUserGetMobileNumberDoc()
    @Response('verification.getMobileNumber')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/mobile-number')
    async getMobileNumber(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
        user: UserDoc
    ): Promise<IResponse<VerificationResponse>> {
        const verification: VerificationDoc =
            await this.verificationService.findOneLatestMobileNumberByUser(
                user._id
            );
        if (!verification) {
            throw new NotFoundException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'verification.error.notFound',
            });
        }

        const mapped: VerificationResponse =
            this.verificationService.map(verification);

        return {
            data: mapped,
        };
    }

    @VerificationUserResendEmailDoc()
    @Response('verification.resendEmail')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected([false])
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/resend/email')
    async resendEmail(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
        user: UserDoc
    ): Promise<IResponse<VerificationResponse>> {
        const latestVerification: VerificationDoc =
            await this.verificationService.findOneLatestEmailByUser(user._id);
        if (latestVerification) {
            const mapped: VerificationResponse =
                this.verificationService.map(latestVerification);

            return {
                data: mapped,
            };
        }

        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            await this.verificationService.inactiveEmailManyByUser(user._id, {
                session,
            });

            const verification: VerificationDoc =
                await this.verificationService.createEmailByUser(user, {
                    session,
                });

            await this.databaseService.commitTransaction(session);

            await this.emailQueue.add(
                ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
                {
                    send: { email: user.email, name: user.name },
                    data: {
                        otp: verification.otp,
                        expiredAt: verification.expiredDate,
                        reference: verification.reference,
                    },
                },
                {
                    debounce: {
                        id: `${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}-${user._id}`,
                        ttl: 1000,
                    },
                }
            );

            const mapped: VerificationResponse =
                this.verificationService.map(latestVerification);

            return {
                data: mapped,
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

    @VerificationUserResendMobileNumberDoc()
    @Response('verification.resendMobileNumber')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/resend/mobile-number')
    async resendMobileNumber(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
        user: UserDoc
    ): Promise<IResponse<VerificationResponse>> {
        const latestVerification: VerificationDoc =
            await this.verificationService.findOneLatestMobileNumberByUser(
                user._id
            );
        if (latestVerification) {
            const mapped: VerificationResponse =
                this.verificationService.map(latestVerification);

            return {
                data: mapped,
            };
        }

        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            await this.verificationService.inactiveMobileNumberManyByUser(
                user._id,
                {
                    session,
                }
            );

            const verification: VerificationDoc =
                await this.verificationService.createMobileNumberByUser(user, {
                    session,
                });

            await this.databaseService.commitTransaction(session);

            await this.smsQueue.add(
                ENUM_SEND_SMS_PROCESS.VERIFICATION,
                {
                    send: { email: user.email, name: user.name },
                    data: {
                        otp: verification.otp,
                        expiredAt: verification.expiredDate,
                    },
                },
                {
                    debounce: {
                        id: `${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}-${user._id}`,
                        ttl: 1000,
                    },
                }
            );

            const mapped: VerificationResponse =
                this.verificationService.map(latestVerification);

            return {
                data: mapped,
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

    @VerificationUserVerifyEmailDoc()
    @Response('verification.verifyEmail')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected([false])
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/verify/email')
    async verifyEmail(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>(
            'user',
            UserParsePipe,
            VerificationUserEmailNotVerifiedYetPipe
        )
        user: UserDoc,
        @Body() { otp }: VerificationVerifyRequestDto
    ): Promise<void> {
        const verification: VerificationDoc =
            await this.verificationService.findOneLatestEmailByUser(user._id);
        if (!verification) {
            throw new NotFoundException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'verification.error.notFound',
            });
        }

        const check: boolean = this.verificationService.validateOtp(
            verification,
            otp
        );
        if (!check) {
            throw new BadRequestException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.OTP_NOT_MATCH,
                message: 'verification.error.otpNotMatch',
            });
        }

        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            await this.verificationService.verify(verification, {
                session,
            });
            await this.userService.updateVerificationEmail(user, {
                session,
            });

            await this.databaseService.commitTransaction(session);

            await this.emailQueue.add(
                ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED,
                {
                    send: { email: user.email, name: user.name },
                    data: {
                        reference: verification.reference,
                    },
                },
                {
                    debounce: {
                        id: `${ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED}-${user._id}`,
                        ttl: 1000,
                    },
                }
            );

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

    @VerificationUserVerifyMobileNumberDoc()
    @Response('verification.verifyMobileNumber')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/verify/mobile-number')
    async verifyMobileNumber(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>(
            'user',
            UserParsePipe,
            VerificationUserMobileNumberNotVerifiedYetPipe
        )
        user: UserDoc,
        @Body() { otp }: VerificationVerifyRequestDto
    ): Promise<void> {
        const verification: VerificationDoc =
            await this.verificationService.findOneLatestMobileNumberByUser(
                user._id
            );
        if (!verification) {
            throw new NotFoundException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'verification.error.notFound',
            });
        }

        const check: boolean = this.verificationService.validateOtp(
            verification,
            otp
        );
        if (!check) {
            throw new BadRequestException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.OTP_NOT_MATCH,
                message: 'verification.error.otpNotMatch',
            });
        }

        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            await this.verificationService.verify(verification, {
                session,
            });
            await this.userService.updateVerificationMobileNumber(user, {
                session,
            });

            await this.databaseService.commitTransaction(session);

            await this.emailQueue.add(
                ENUM_SEND_EMAIL_PROCESS.MOBILE_NUMBER_VERIFIED,
                {
                    send: { email: user.email, name: user.name },
                    data: {
                        mobileNumber:
                            this.verificationService.map(verification).to,
                        reference: verification.reference,
                    },
                },
                {
                    debounce: {
                        id: `${ENUM_SEND_EMAIL_PROCESS.MOBILE_NUMBER_VERIFIED}-${user._id}`,
                        ttl: 1000,
                    },
                }
            );

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
