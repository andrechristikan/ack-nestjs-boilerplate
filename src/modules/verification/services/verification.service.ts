import { Injectable } from '@nestjs/common';

@Injectable()
export class VerificationService {
    // TODO: 1
    // async verifyEmail(
    //     { token }: VerificationVerifyEmailRequestDto,
    //     requestLog: IRequestLog
    // ): Promise<IResponseReturn<void>> {
    //     const verification =
    //         await this.verificationRepository.findOneActiveEmailByToken(token);
    //     if (!verification) {
    //         throw new BadRequestException({
    //             statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.TOKEN_INVALID,
    //             message: 'verification.error.tokenInvalid',
    //         });
    //     }
    //     try {
    //         await this.verificationRepository.verifyEmail(
    //             verification.id,
    //             verification.userId,
    //             requestLog
    //         );
    //         await this.emailQueue.add(
    //             ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED,
    //             {
    //                 send: {
    //                     email: verification.user.email,
    //                     username: verification.user.username,
    //                 },
    //                 data: {
    //                     reference: verification.reference,
    //                 } as EmailVerifiedDto,
    //             },
    //             {
    //                 jobId: `${ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED}-${verification.id}`,
    //             }
    //         );
    //         return;
    //     } catch (err: unknown) {
    //         throw new InternalServerErrorException({
    //             statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
    //             message: 'http.serverError.internalServerError',
    //             _error: err,
    //         });
    //     }
    // }
    // TODO: 5
    // async requestMobileNumber(
    //     userId: string,
    //     mobileNumberId: string
    // ): Promise<IResponseReturn<VerificationMobileNumberResponseDto>> {
    //     const checkExist = await this.userRepository.existMobileNumber(
    //         userId,
    //         mobileNumberId
    //     );
    //     if (!checkExist) {
    //         throw new NotFoundException({
    //             statusCode: ENUM_USER_STATUS_CODE_ERROR.MOBILE_NUMBER_NOT_FOUND,
    //             message: 'user.error.mobileNumberNotFound',
    //         });
    //     } else if (checkExist.isVerified) {
    //         throw new BadRequestException({
    //             statusCode:
    //                 ENUM_VERIFICATION_STATUS_CODE_ERROR.MOBILE_NUMBER_ALREADY_VERIFIED,
    //             message: 'verification.error.mobileNumberAlreadyVerified',
    //         });
    //     }
    //     try {
    //         const verificationMobileNumber =
    //             this.verificationUtil.createVerification(
    //                 ENUM_VERIFICATION_TYPE.MOBILE_NUMBER
    //             );
    //         const verification =
    //             await this.verificationRepository.requestMobileNumber(
    //                 userId,
    //                 mobileNumberId,
    //                 verificationMobileNumber
    //             );
    //         return;
    //     } catch (err: unknown) {
    //         throw new InternalServerErrorException({
    //             statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
    //             message: 'http.serverError.internalServerError',
    //             _error: err,
    //         });
    //     }
    // }
}
