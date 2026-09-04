import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { INotificationEmailTermPolicyService } from '@modules/notification/interfaces/notification.email.term-policy.service.interface';
import { INotificationPublishTermPolicyPayload } from '@modules/notification/interfaces/notification.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Renders and sends the term-policy publication email to every active user, in batches. */
@Injectable()
export class NotificationEmailTermPolicyService implements INotificationEmailTermPolicyService {
    private readonly logger = new Logger(
        NotificationEmailTermPolicyService.name
    );

    private readonly noreplyEmail: string;
    private readonly supportEmail: string;

    private readonly homeName: string;
    private readonly homeUrl: string;

    private readonly batchSize: number;

    private readonly defaultTemplateData: Record<string, string>;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
        private readonly helperArrayService: HelperArrayService
    ) {
        this.noreplyEmail = this.configService.get<string>('email.noreply')!;
        this.supportEmail = this.configService.get<string>('email.support')!;

        this.homeName = this.configService.get<string>('home.name')!;
        this.homeUrl = this.configService.get<string>('home.url')!;

        this.batchSize = this.configService.get<number>('email.batchSize')!;

        this.defaultTemplateData = {
            homeName: this.homeName,
            supportEmail: this.supportEmail,
            homeUrl: this.homeUrl,
        };
    }

    async processPublishTermPolicy({
        type,
        version,
    }: INotificationPublishTermPolicyPayload): Promise<IQueueResponse> {
        try {
            const users = await this.userRepository.findActive();
            const userChunks = this.helperArrayService.chunk(
                users,
                this.batchSize
            );

            const results = [];
            for (const chunk of userChunks) {
                const result = await this.awsSESService.sendBulk({
                    templateName: EnumNotificationProcess.publishTermPolicy,
                    recipients: chunk.map(u => ({
                        recipient: u.email,
                        templateData: { username: u.username },
                    })),
                    sender: this.noreplyEmail,
                    defaultTemplateData: {
                        ...this.defaultTemplateData,
                        type,
                        version: String(version),
                    },
                });

                results.push(result);

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            return { message: 'Publish term policy email processed', results };
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to process publish term policy email'
            );
            throw err;
        }
    }
}
