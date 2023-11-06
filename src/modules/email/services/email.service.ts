import { Injectable } from '@nestjs/common';
import { AwsSESService } from 'src/common/aws/services/aws.ses.service';
import { ENUM_EMAIL } from 'src/modules/email/constants/email.enum.constant';
import { capital } from 'case';
import { ConfigService } from '@nestjs/config';
import { signUpPlainBody } from 'src/modules/email/constants/email.constant';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { EmailSendSignUpDto } from 'src/modules/email/dtos/email.send-sign-up.dto';
import { IEmailService } from 'src/modules/email/interfaces/email.service.interface';

@Injectable()
export class EmailService implements IEmailService {
    private readonly appName: string;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly configService: ConfigService
    ) {
        this.appName = this.configService.get<string>('app.name');
    }

    async createSignUp(): Promise<boolean> {
        try {
            await this.awsSESService.createTemplate({
                name: ENUM_EMAIL.SIGN_UP,
                subject: `${this.appName} ${capital(ENUM_EMAIL.SIGN_UP)}`,
                htmlBody: `<h1>${signUpPlainBody}</h1>`,
                plainTextBody: signUpPlainBody,
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
}
