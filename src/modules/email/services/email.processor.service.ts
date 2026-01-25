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
import { IEmailProcessorService } from '@modules/email/interfaces/email.processor.service.interface';
import { EmailUtil } from '@modules/email/utils/email.util';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

@Injectable()
export class EmailProcessorService implements IEmailProcessorService {
    constructor(private readonly emailUtil: EmailUtil) {}

    async processWelcome(data: IEmailSendPayload): Promise<IQueueResponse> {
        await this.emailUtil.sendWelcome(data);

        return { message: 'Welcome email processed' };
    }

    async processChangePassword(
        data: IEmailSendPayload
    ): Promise<IQueueResponse> {
        await this.emailUtil.sendChangePassword(data);

        return { message: 'Change password email processed' };
    }

    async processTempPassword(
        data: IEmailSendPayload,
        tempPassword: IEmailTempPasswordPayload
    ): Promise<IQueueResponse> {
        await this.emailUtil.sendTempPassword(data, tempPassword);

        return { message: 'Temporary password email processed' };
    }

    async processCreateByAdmin(
        data: IEmailSendPayload,
        createdByAdmin: ICreateByAdminPayload
    ): Promise<IQueueResponse> {
        await this.emailUtil.sendCreateByAdmin(data, createdByAdmin);

        return { message: 'Create by admin email processed' };
    }

    async processForgotPassword(
        data: IEmailSendPayload,
        forgotPassword: IEmailForgotPasswordPayload
    ): Promise<IQueueResponse> {
        await this.emailUtil.sendForgotPassword(data, forgotPassword);

        return { message: 'Forgot password email processed' };
    }

    async processVerification(
        data: IEmailSendPayload,
        verification: IEmailVerificationPayload
    ): Promise<IQueueResponse> {
        await this.emailUtil.sendVerification(data, verification);

        return { message: 'Verification email processed' };
    }

    async processEmailVerified(
        data: IEmailSendPayload,
        emailVerified: IEmailVerifiedPayload
    ): Promise<IQueueResponse> {
        await this.emailUtil.sendEmailVerified(data, emailVerified);

        return { message: 'Email verified email processed' };
    }

    async processMobileNumberVerified(
        data: IEmailSendPayload,
        mobileNumberVerified: IEmailMobileNumberVerifiedPayload
    ): Promise<IQueueResponse> {
        await this.emailUtil.sendMobileNumberVerified(
            data,
            mobileNumberVerified
        );

        return { message: 'Mobile number verified email processed' };
    }

    async processNewLoginNotification(
        data: IEmailSendPayload,
        login: IEmailNewLoginPayload
    ): Promise<IQueueResponse> {
        await this.emailUtil.sendNewLogin(data, login);

        return { message: 'New login notification email processed' };
    }
}
