import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    CreateTemplateCommand,
    CreateTemplateCommandInput,
    CreateTemplateCommandOutput,
    DeleteTemplateCommand,
    DeleteTemplateCommandInput,
    DeleteTemplateCommandOutput,
    GetSendQuotaCommand,
    GetTemplateCommand,
    GetTemplateCommandInput,
    GetTemplateCommandOutput,
    ListTemplatesCommand,
    ListTemplatesCommandInput,
    ListTemplatesCommandOutput,
    SESClient,
    SendBulkTemplatedEmailCommand,
    SendBulkTemplatedEmailCommandInput,
    SendBulkTemplatedEmailCommandOutput,
    SendTemplatedEmailCommand,
    SendTemplatedEmailCommandInput,
    SendTemplatedEmailCommandOutput,
    UpdateTemplateCommand,
    UpdateTemplateCommandInput,
    UpdateTemplateCommandOutput,
} from '@aws-sdk/client-ses';
import { IAwsSESService } from '@common/aws/interfaces/aws.ses-service.interface';
import {
    IAwsSESGetTemplate,
    IAwsSESSend,
    IAwsSESSendBulk,
    IAwsSESTemplate,
} from '@common/aws/interfaces/aws.ses.interface';

@Injectable()
export class AwsSESService implements IAwsSESService, OnModuleInit {
    private readonly logger = new Logger(AwsSESService.name);

    private readonly iamKey: string | null;
    private readonly iamSecret: string | null;
    private readonly region: string | null;

    private sesClient: SESClient;

    constructor(private readonly configService: ConfigService) {
        this.iamKey = this.configService.get<string | null>('aws.ses.iam.key')!;
        this.iamSecret = this.configService.get<string | null>(
            'aws.ses.iam.secret'
        )!;
        this.region = this.configService.get<string | null>('aws.ses.region')!;
    }

    onModuleInit(): void {
        if (!this.iamKey || !this.iamSecret || !this.region) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return;
        }

        this.sesClient = new SESClient({
            credentials: {
                accessKeyId: this.iamKey,
                secretAccessKey: this.iamSecret,
            },
            region: this.region,
        });
    }

    isInitialized(): boolean {
        return !!this.sesClient;
    }

    async checkConnection(): Promise<boolean> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return false;
        }

        try {
            await this.sesClient.send<
                ListTemplatesCommandInput,
                ListTemplatesCommandOutput
            >(new GetSendQuotaCommand({}));

            return true;
        } catch {
            return false;
        }
    }

    async listTemplates(
        nextToken?: string
    ): Promise<ListTemplatesCommandOutput> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return {
                TemplatesMetadata: [],
                $metadata: {},
            } as ListTemplatesCommandOutput;
        }

        const command: ListTemplatesCommand = new ListTemplatesCommand({
            MaxItems: 20,
            NextToken: nextToken,
        });

        const listTemplate: ListTemplatesCommandOutput =
            await this.sesClient.send<
                ListTemplatesCommandInput,
                ListTemplatesCommandOutput
            >(command);
        return listTemplate;
    }

    async getTemplate({
        name,
    }: IAwsSESGetTemplate): Promise<GetTemplateCommandOutput> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return {
                $metadata: {},
                Template: undefined,
            } as GetTemplateCommandOutput;
        }

        const command: GetTemplateCommand = new GetTemplateCommand({
            TemplateName: name,
        });

        const getTemplate: GetTemplateCommandOutput = await this.sesClient.send<
            GetTemplateCommandInput,
            GetTemplateCommandOutput
        >(command);

        return getTemplate;
    }

    async createTemplate({
        name,
        subject,
        htmlBody,
        plainTextBody,
    }: IAwsSESTemplate): Promise<CreateTemplateCommandOutput> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return { $metadata: {} } as CreateTemplateCommandOutput;
        }

        if (!htmlBody && !plainTextBody) {
            throw new Error('body is null');
        }

        const command: CreateTemplateCommand = new CreateTemplateCommand({
            Template: {
                TemplateName: name,
                SubjectPart: subject,
                HtmlPart: htmlBody,
                TextPart: plainTextBody,
            },
        });

        const create: CreateTemplateCommandOutput = await this.sesClient.send<
            CreateTemplateCommandInput,
            CreateTemplateCommandOutput
        >(command);

        return create;
    }

    async updateTemplate({
        name,
        subject,
        htmlBody,
        plainTextBody,
    }: IAwsSESTemplate): Promise<UpdateTemplateCommandOutput> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return { $metadata: {} } as UpdateTemplateCommandOutput;
        }

        if (!htmlBody && !plainTextBody) {
            throw new Error('body is null');
        }

        const command: UpdateTemplateCommand = new UpdateTemplateCommand({
            Template: {
                TemplateName: name,
                SubjectPart: subject,
                HtmlPart: htmlBody,
                TextPart: plainTextBody,
            },
        });

        const update: UpdateTemplateCommandOutput = await this.sesClient.send<
            UpdateTemplateCommandInput,
            UpdateTemplateCommandOutput
        >(command);

        return update;
    }

    async deleteTemplate({
        name,
    }: IAwsSESGetTemplate): Promise<DeleteTemplateCommandOutput> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return { $metadata: {} } as DeleteTemplateCommandOutput;
        }

        const command: DeleteTemplateCommand = new DeleteTemplateCommand({
            TemplateName: name,
        });

        const del: DeleteTemplateCommandOutput = await this.sesClient.send<
            DeleteTemplateCommandInput,
            DeleteTemplateCommandOutput
        >(command);

        return del;
    }

    async send({
        recipients,
        sender,
        replyTo,
        bcc,
        cc,
        templateName,
        templateData,
    }: IAwsSESSend): Promise<SendTemplatedEmailCommandOutput> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return {
                MessageId: undefined,
                $metadata: {},
            } as SendTemplatedEmailCommandOutput;
        }

        const command: SendTemplatedEmailCommand =
            new SendTemplatedEmailCommand({
                Template: templateName,
                Destination: {
                    ToAddresses: recipients,
                    BccAddresses: bcc ?? [],
                    CcAddresses: cc ?? [],
                },
                Source: sender,
                TemplateData: JSON.stringify(templateData ?? ''),
                ReplyToAddresses: [replyTo ?? sender],
            });

        const sendWithTemplate: SendTemplatedEmailCommandOutput =
            await this.sesClient.send<
                SendTemplatedEmailCommandInput,
                SendTemplatedEmailCommandOutput
            >(command);

        return sendWithTemplate;
    }

    async sendBulk({
        recipients,
        sender,
        replyTo,
        bcc,
        cc,
        templateName,
        defaultTemplateData,
    }: IAwsSESSendBulk): Promise<SendBulkTemplatedEmailCommandOutput> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return {
                Status: [],
                $metadata: {},
            } as SendBulkTemplatedEmailCommandOutput;
        }

        const command: SendBulkTemplatedEmailCommand =
            new SendBulkTemplatedEmailCommand({
                Template: templateName,
                Destinations: recipients.map(e => ({
                    Destination: {
                        ToAddresses: [e.recipient],
                        BccAddresses: bcc ?? [],
                        CcAddresses: cc ?? [],
                    },
                    ReplacementTemplateData: JSON.stringify(
                        e.templateData ?? ''
                    ),
                })),
                Source: sender,
                DefaultTemplateData: JSON.stringify(defaultTemplateData ?? {}),
                ReplyToAddresses: [replyTo ?? sender],
            });

        const sendWithTemplate: SendBulkTemplatedEmailCommandOutput =
            await this.sesClient.send<
                SendBulkTemplatedEmailCommandInput,
                SendBulkTemplatedEmailCommandOutput
            >(command);

        return sendWithTemplate;
    }
}
