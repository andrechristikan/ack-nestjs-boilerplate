import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type { INotificationPublishTermPolicyPayload } from '@modules/notification/interfaces/notification.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Renders and sends the term-policy publication email to every active user, in batches. */
@Injectable()
export class NotificationEmailTermPolicyDomain {
    private readonly noreplyEmail: string;
    private readonly supportEmail: string;

    private readonly homeName: string;
    private readonly homeUrl: string;

    private readonly batchSize: number;
    private readonly batchDelayInMs: number;

    private readonly defaultTemplateData: Record<string, string>;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly configService: ConfigService,
        private readonly userDomain: UserDomain,
        private readonly helperArrayService: HelperArrayService
    ) {
        // AppEnvSchema requires both addresses once AWS SES credentials are set, and
        // AwsSESService.send is a no-op while SES is uninitialized, so neither is read as null.
        this.noreplyEmail = this.configService.get<string>('email.noreply')!;
        this.supportEmail = this.configService.get<string>('email.support')!;

        this.homeName = this.configService.get<string>('home.name')!;
        this.homeUrl = this.configService.get<string>('home.url')!;

        this.batchSize = this.configService.get<number>('email.batchSize')!;
        this.batchDelayInMs = this.configService.get<number>(
            'email.batchDelayInMs'
        )!;

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
        const users = await this.userDomain.getListActive();
        const userChunks = this.helperArrayService.chunk(users, this.batchSize);

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

            await new Promise(resolve =>
                setTimeout(resolve, this.batchDelayInMs)
            );
        }

        return { message: 'Publish term policy email processed', results };
    }
}
