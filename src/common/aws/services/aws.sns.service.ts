import {
    GetSMSAttributesCommand,
    PublishCommand,
    SNSClient,
} from '@aws-sdk/client-sns';
import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
    PublishCommandInput,
    PublishCommandOutput,
} from '@aws-sdk/client-sns';
import type { IAwsSNSSendSms } from '@common/aws/interfaces/aws.sns.interface';

@Injectable()
export class AwsSNSService implements OnModuleInit {
    private readonly logger = new Logger(AwsSNSService.name);

    private readonly iamKey: string | null;
    private readonly iamSecret: string | null;
    private readonly region: string | null;
    private readonly senderId: string | null;
    private readonly maxAttempts: number;

    private snsClient: SNSClient;

    constructor(private readonly configService: ConfigService) {
        this.iamKey = this.configService.get<string | null>('aws.sns.iam.key')!;
        this.iamSecret = this.configService.get<string | null>(
            'aws.sns.iam.secret'
        )!;
        this.region = this.configService.get<string | null>('aws.sns.region')!;
        this.senderId = this.configService.get<string | null>(
            'aws.sns.senderId'
        )!;
        this.maxAttempts = this.configService.get<number>(
            'aws.sns.maxAttempts'
        )!;
    }

    onModuleInit(): void {
        if (!this.iamKey || !this.iamSecret || !this.region) {
            this.logger.warn(
                'AWS SNS credentials not configured. SNS functionalities will be disabled.'
            );

            return;
        }

        this.snsClient = new SNSClient({
            credentials: {
                accessKeyId: this.iamKey,
                secretAccessKey: this.iamSecret,
            },
            region: this.region,
            maxAttempts: this.maxAttempts,
        });
    }

    isInitialized(): boolean {
        return !!this.snsClient;
    }

    async checkConnection(): Promise<boolean> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS SNS credentials not configured. SNS functionalities will be disabled.'
            );
            return false;
        }

        try {
            await this.snsClient.send(new GetSMSAttributesCommand({}));
            return true;
        } catch {
            return false;
        }
    }

    async sendSms({
        phoneNumber,
        message,
    }: IAwsSNSSendSms): Promise<PublishCommandOutput> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS SNS credentials not configured. SNS functionalities will be disabled.'
            );

            return { $metadata: {} };
        }

        const command: PublishCommand = new PublishCommand({
            PhoneNumber: phoneNumber,
            Message: message,
            MessageAttributes: {
                'AWS.SNS.SMS.SMSType': {
                    DataType: 'String',
                    StringValue: 'Transactional',
                },
                ...(this.senderId
                    ? {
                          'AWS.SNS.SMS.SenderID': {
                              DataType: 'String',
                              StringValue: this.senderId,
                          },
                      }
                    : {}),
            },
        });

        const published: PublishCommandOutput = await this.snsClient.send<
            PublishCommandInput,
            PublishCommandOutput
        >(command);
        return published;
    }
}
