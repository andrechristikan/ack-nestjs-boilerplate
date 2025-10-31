import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EmailVerifiedDto } from '@modules/email/dtos/email.verified.dto';
import { ENUM_SEND_EMAIL_PROCESS } from '@modules/email/enums/email.enum';
import { VerificationVerifyEmailRequestDto } from '@modules/verification/dtos/request/verification.verify-email.request.dto';
import { ENUM_VERIFICATION_STATUS_CODE_ERROR } from '@modules/verification/enums/verification.status-code.enum';
import { IVerificationService } from '@modules/verification/interfaces/verification.service.interface';
import { VerificationRepository } from '@modules/verification/repositories/verification.repository';
import { InjectQueue } from '@nestjs/bullmq';
import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { ENUM_QUEUE } from 'src/queues/enums/queue.enum';

@Injectable()
export class VerificationService implements IVerificationService {
    constructor(
        @InjectQueue(ENUM_QUEUE.EMAIL)
        private readonly emailQueue: Queue,
        private readonly verificationRepository: VerificationRepository
    ) {}

    async verifyEmail(
        data: VerificationVerifyEmailRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const verification =
            await this.verificationRepository.findOneActiveEmailByToken(data);
        if (!verification) {
            throw new BadRequestException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.TOKEN_INVALID,
                message: 'verification.error.tokenInvalid',
            });
        }

        try {
            await this.verificationRepository.verifyEmail(
                verification.id,
                verification.userId,
                requestLog
            );

            await this.emailQueue.add(
                ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED,
                {
                    send: {
                        email: verification.user.email,
                        username: verification.user.username,
                    },
                    data: {
                        reference: verification.reference,
                    } as EmailVerifiedDto,
                },
                {
                    jobId: `${ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED}-${verification.id}`,
                }
            );
            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
