import { Injectable } from '@nestjs/common';

@Injectable()
export class ResetPasswordService {
    // TODO: 2
    // async forgot(
    //     { email }: ResetPasswordForgotRequestDto,
    //     requestLog: IRequestLog
    // ): Promise<IResponseReturn<void>> {
    //     const user = await this.userRepository.findOneActiveByEmail(email);
    //     if (!user) {
    //         throw new NotFoundException({
    //             statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
    //             message: 'user.error.notFound',
    //         });
    //     }
    //     try {
    //         const resetPassword = this.resetPasswordUtil.createForgotPassword();
    //         await Promise.all([
    //             this.resetPasswordRepository.forgot(
    //                 user.id,
    //                 email,
    //                 resetPassword,
    //                 requestLog
    //             ),
    //             this.emailQueue.add(
    //                 ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD,
    //                 {
    //                     send: {
    //                         email,
    //                         username: user.username,
    //                     },
    //                     data: {
    //                         expiredAt: resetPassword.expiredAt,
    //                         link: resetPassword.link,
    //                         token: resetPassword.token,
    //                         reference: resetPassword.reference,
    //                         expiredInMinutes: resetPassword.expiredInMinutes,
    //                     } as EmailResetPasswordDto,
    //                 },
    //                 {
    //                     deduplication: {
    //                         id: `${ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD}-${user.id}`,
    //                         ttl: resetPassword.resendInMinutes * 60 * 1000,
    //                     },
    //                 }
    //             ),
    //         ]);
    //         return;
    //     } catch (err: unknown) {
    //         throw new InternalServerErrorException({
    //             statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
    //             message: 'http.serverError.internalServerError',
    //             _error: err,
    //         });
    //     }
    // }
    // TODO: 3
    // async reset(
    //     { newPassword, token }: ResetPasswordResetRequestDto,
    //     requestLog: IRequestLog
    // ): Promise<IResponseReturn<void>> {
    //     const resetPassword =
    //         await this.resetPasswordRepository.findOneByToken(token);
    //     if (!resetPassword) {
    //         throw new NotFoundException({
    //             statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
    //             message: 'user.error.notFound',
    //         });
    //     }
    //     const passwordHistories =
    //         await this.passwordHistoryRepository.findAllActiveByUser(
    //             resetPassword.userId
    //         );
    //     const passwordCheck = this.userUtil.checkPasswordPeriod(
    //         passwordHistories,
    //         newPassword
    //     );
    //     if (passwordCheck) {
    //         throw new BadRequestException({
    //             statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_MUST_NEW,
    //             message: 'auth.error.passwordMustNew',
    //             _metadata: {
    //                 customProperty: {
    //                     messageProperties: {
    //                         period: this.helperService.dateFormatToRFC2822(
    //                             passwordCheck.expiredAt
    //                         ),
    //                     },
    //                 },
    //             },
    //         });
    //     }
    //     try {
    //         const sessions = await this.sessionRepository.findAllByUser(
    //             resetPassword.userId
    //         );
    //         const password = this.authUtil.createPassword(newPassword);
    //         const [updated] = await Promise.all([
    //             this.userRepository.changePassword(
    //                 resetPassword.userId,
    //                 password,
    //                 requestLog
    //             ),
    //             this.sessionUtil.deleteAllLogins(
    //                 resetPassword.userId,
    //                 sessions
    //             ),
    //         ]);
    //         await this.emailQueue.add(
    //             ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
    //             {
    //                 send: {
    //                     email: resetPassword.user.email,
    //                     name: resetPassword.user.name,
    //                 },
    //             },
    //             {
    //                 deduplication: {
    //                     id: `${ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD}-${updated.id}`,
    //                     ttl: 1000,
    //                 },
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
}
