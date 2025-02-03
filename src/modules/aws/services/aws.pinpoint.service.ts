import { Injectable } from '@nestjs/common';
import {
    ChannelType,
    GetApplicationSettingsCommand,
    MessageType,
    PinpointClient,
    SendMessagesCommand,
    SendMessagesCommandInput,
} from '@aws-sdk/client-pinpoint';
import { ConfigService } from '@nestjs/config';
import { IAwsPinpointService } from 'src/modules/aws/interfaces/aws.pinpoint-service.interface';

@Injectable()
export class AwsPinpointService implements IAwsPinpointService {
    private readonly accessKeyId: string;
    private readonly secretAccessKey: string;
    private readonly region: string;
    private readonly applicationId: string;

    private readonly pinpointClient: PinpointClient;

    constructor(private readonly configService: ConfigService) {
        this.accessKeyId = this.configService.get<string>(
            'aws.pinpoint.credential.key'
        );
        this.secretAccessKey = this.configService.get<string>(
            'aws.pinpoint.credential.secret'
        );
        this.region = this.configService.get<string>('aws.pinpoint.region');
        this.applicationId = this.configService.get<string>(
            'aws.pinpoint.applicationId'
        );

        this.pinpointClient = new PinpointClient({
            credentials: {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey,
            },
            region: this.region,
        });
    }

    async checkConnection(): Promise<boolean> {
        try {
            const command = new GetApplicationSettingsCommand({
                ApplicationId: this.applicationId,
            });

            await this.pinpointClient.send(command);

            return true;
        } catch {
            return false;
        }
    }

    async sendSMS(phoneNumber: string, message: string): Promise<void> {
        const params: SendMessagesCommandInput = {
            ApplicationId: this.applicationId,
            MessageRequest: {
                Addresses: {
                    [phoneNumber]: {
                        ChannelType: ChannelType.SMS,
                    },
                },
                MessageConfiguration: {
                    SMSMessage: {
                        Body: message,
                        MessageType: MessageType.TRANSACTIONAL,
                    },
                },
            },
        };

        const command = new SendMessagesCommand(params);
        await this.pinpointClient.send(command);
    }
}
