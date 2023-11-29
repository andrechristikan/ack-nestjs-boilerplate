import { Injectable } from '@nestjs/common';
import { AwsSESService } from 'src/common/aws/services/aws.ses.service';
import { ENUM_EMAIL } from 'src/modules/email/constants/email.enum.constant';
import { capital } from 'case';
import { ConfigService } from '@nestjs/config';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { EmailSendSignUpDto } from 'src/modules/email/dtos/email.send-sign-up.dto';
import { IEmailService } from 'src/modules/email/interfaces/email.service.interface';
import { EmailSendChangePasswordDto } from 'src/modules/email/dtos/email.send-change-password.dto';
import {
    EMAIL_CHANGE_PASSWORD_HTML_BODY,
    EMAIL_SIGN_UP_HTML_BODY,
} from 'src/modules/email/constants/email.constant';

@Injectable()
export class EmailService implements IEmailService {
    private readonly appName: string;
    private readonly fromEmail: string;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly configService: ConfigService
    ) {
        this.appName = this.configService.get<string>('app.name');
        this.fromEmail = this.configService.get<string>('email.fromEmail');
    }

    async createSignUp(): Promise<boolean> {
        try {
            await this.awsSESService.createTemplate({
                name: ENUM_EMAIL.SIGN_UP,
                subject: `${this.appName} ${capital(ENUM_EMAIL.SIGN_UP)}`,
                plainTextBody: EMAIL_SIGN_UP_HTML_BODY,
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async getSignUp(): Promise<boolean> {
        try {
            await this.awsSESService.getTemplate({
                name: ENUM_EMAIL.SIGN_UP,
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async deleteSignUp(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_EMAIL.SIGN_UP,
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async sendSignUp(user: UserDoc): Promise<boolean> {
        try {
            await this.awsSESService.send<EmailSendSignUpDto>({
                templateName: ENUM_EMAIL.SIGN_UP,
                recipients: [user.email],
                sender: this.fromEmail,
                templateData: {
                    appName: capital(this.appName),
                    name: capital(`${user.firstName} ${user.lastName}`),
                },
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async createChangePassword(): Promise<boolean> {
        try {
            await this.awsSESService.createTemplate({
                name: ENUM_EMAIL.CHANGE_PASSWORD,
                subject: `${this.appName} ${capital(
                    ENUM_EMAIL.CHANGE_PASSWORD
                )}`,
                plainTextBody: EMAIL_CHANGE_PASSWORD_HTML_BODY,
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async getChangePassword(): Promise<boolean> {
        try {
            await this.awsSESService.getTemplate({
                name: ENUM_EMAIL.CHANGE_PASSWORD,
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async deleteChangePassword(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: ENUM_EMAIL.CHANGE_PASSWORD,
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    async sendChangePassword(user: UserDoc): Promise<boolean> {
        try {
            await this.awsSESService.send<EmailSendChangePasswordDto>({
                templateName: ENUM_EMAIL.CHANGE_PASSWORD,
                recipients: [user.email],
                sender: this.fromEmail,
                templateData: {
                    name: capital(`${user.firstName} ${user.lastName}`),
                },
            });

            return true;
        } catch (err: unknown) {
            return false;
        }
    }
}
