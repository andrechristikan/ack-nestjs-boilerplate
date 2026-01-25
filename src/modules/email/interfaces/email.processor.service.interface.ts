import {
    ICreateByAdminPayload,
    IEmailForgotPasswordPayload,
    IEmailMobileNumberVerifiedPayload,
    IEmailNewLoginPayload,
    IEmailSendPayload,
    IEmailTempPasswordPayload,
    IEmailVerificationPayload,
    IEmailVerifiedPayload,
} from '@modules/email/interfaces/email.interface';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

export interface IEmailProcessorService {
    processChangePassword(data: IEmailSendPayload): Promise<IQueueResponse>;
    processWelcome(data: IEmailSendPayload): Promise<IQueueResponse>;
    processCreateByAdmin(
        data: IEmailSendPayload,
        payload: ICreateByAdminPayload
    ): Promise<IQueueResponse>;
    processTempPassword(
        data: IEmailSendPayload,
        payload: IEmailTempPasswordPayload
    ): Promise<IQueueResponse>;
    processForgotPassword(
        data: IEmailSendPayload,
        payload: IEmailForgotPasswordPayload
    ): Promise<IQueueResponse>;
    processVerification(
        data: IEmailSendPayload,
        payload: IEmailVerificationPayload
    ): Promise<IQueueResponse>;
    processEmailVerified(
        data: IEmailSendPayload,
        payload: IEmailVerifiedPayload
    ): Promise<IQueueResponse>;
    processMobileNumberVerified(
        data: IEmailSendPayload,
        payload: IEmailMobileNumberVerifiedPayload
    ): Promise<IQueueResponse>;
    processNewLoginNotification(
        data: IEmailSendPayload,
        payload: IEmailNewLoginPayload
    ): Promise<IQueueResponse>;
}
