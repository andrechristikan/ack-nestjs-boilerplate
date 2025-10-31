import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { VerificationVerifyEmailRequestDto } from '@modules/verification/dtos/request/verification.verify-email.request.dto';

export interface IVerificationService {
    verifyEmail(
        data: VerificationVerifyEmailRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
}
