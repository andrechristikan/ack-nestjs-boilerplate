import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    CreateTemplateCommand,
    DeleteTemplateCommand,
    GetSendQuotaCommand,
    GetTemplateCommand,
    ListTemplatesCommand,
    SESClient,
    SESServiceException,
    SendBulkTemplatedEmailCommand,
    SendTemplatedEmailCommand,
    TemplateDoesNotExistException,
    UpdateTemplateCommand,
} from '@aws-sdk/client-ses';
import type {
    CreateTemplateCommandInput,
    CreateTemplateCommandOutput,
    DeleteTemplateCommandInput,
    DeleteTemplateCommandOutput,
    GetTemplateCommandInput,
    GetTemplateCommandOutput,
    ListTemplatesCommandInput,
    ListTemplatesCommandOutput,
    SESClientResolvedConfig,
    SendBulkTemplatedEmailCommandInput,
    SendBulkTemplatedEmailCommandOutput,
    SendTemplatedEmailCommandInput,
    SendTemplatedEmailCommandOutput,
    ServiceInputTypes,
    ServiceOutputTypes,
    UpdateTemplateCommandInput,
    UpdateTemplateCommandOutput,
} from '@aws-sdk/client-ses';
import type { Command } from '@smithy/types';
import type {
    IAwsSesGetTemplate,
    IAwsSesSend,
    IAwsSesSendBulk,
    IAwsSesTemplate,
} from '@common/aws/interfaces/aws.ses.interface';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSesTemplateBodyRequiredException } from '@common/aws/exceptions/aws.ses-template-body-required.exception';
import { AwsUnavailableException } from '@common/aws/exceptions/aws.unavailable.exception';

@Injectable()
export class AwsSesService implements OnModuleInit {
    private readonly logger = new Logger(AwsSesService.name);

    private readonly accessKeyId: string | null;
    private readonly secretAccessKey: string | null;
    private readonly identityArn: string | null;
    private readonly region: string | null;
    private readonly endpoint: string | null;
    private readonly maxAttempts: number;
    private readonly timeoutInMs: number;

    private sesClient: SESClient;

    constructor(private readonly configService: ConfigService) {
        const accessKeyId = this.configService.get<string | null>(
            'aws.ses.accessKeyId'
        );
        this.accessKeyId = accessKeyId ?? null;
        const secretAccessKey = this.configService.get<string | null>(
            'aws.ses.secretAccessKey'
        );
        this.secretAccessKey = secretAccessKey ?? null;
        const identityArn = this.configService.get<string | null>(
            'aws.ses.identityArn'
        );
        this.identityArn = identityArn ?? null;
        const region = this.configService.get<string | null>('aws.ses.region');
        this.region = region ?? null;
        const endpoint = this.configService.get<string | null>(
            'aws.ses.endpoint'
        );
        this.endpoint = endpoint ?? null;
        this.maxAttempts = this.configService.get<number>(
            'aws.ses.maxAttempts'
        )!;
        this.timeoutInMs = this.configService.get<number>(
            'aws.ses.timeoutInMs'
        )!;
    }

    private toException(
        error: unknown
    ): SESServiceException | AwsUnavailableException {
        const isClientFault =
            error instanceof SESServiceException && error.$fault === 'client';

        return isClientFault ? error : new AwsUnavailableException(error);
    }

    private async sendCommand<
        TInput extends ServiceInputTypes,
        TOutput extends ServiceOutputTypes,
    >(
        command: Command<
            ServiceInputTypes,
            TInput,
            ServiceOutputTypes,
            TOutput,
            SESClientResolvedConfig
        >
    ): Promise<TOutput> {
        try {
            return await this.sesClient.send<TInput, TOutput>(command);
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    onModuleInit(): void {
        if (!this.accessKeyId || !this.secretAccessKey || !this.region) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return;
        }

        this.sesClient = new SESClient({
            credentials: {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey,
            },
            region: this.region,
            maxAttempts: this.maxAttempts,
            requestHandler: {
                requestTimeout: this.timeoutInMs,
            },
            ...(this.endpoint ? { endpoint: this.endpoint } : {}),
        });
    }

    isInitialized(): boolean {
        return !!this.sesClient;
    }

    async checkConnection(): Promise<boolean> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return false;
        }

        try {
            await this.sendCommand(new GetSendQuotaCommand({}));

            return true;
        } catch {
            return false;
        }
    }

    async listTemplates(
        nextToken: string | null
    ): Promise<ListTemplatesCommandOutput> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
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
            ...(nextToken !== null && { NextToken: nextToken }),
        });

        const listTemplate: ListTemplatesCommandOutput = await this.sendCommand<
            ListTemplatesCommandInput,
            ListTemplatesCommandOutput
        >(command);
        return listTemplate;
    }

    async getTemplate({
        name,
    }: IAwsSesGetTemplate): Promise<GetTemplateCommandOutput> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return { $metadata: {} } as GetTemplateCommandOutput;
        }

        const command: GetTemplateCommand = new GetTemplateCommand({
            TemplateName: name,
        });

        const getTemplate: GetTemplateCommandOutput = await this.sendCommand<
            GetTemplateCommandInput,
            GetTemplateCommandOutput
        >(command);

        return getTemplate;
    }

    /** Updates the template and creates it when SES reports it missing; a no-op while SES is unset. */
    async upsertTemplate({
        name,
        subject,
        htmlBody,
        plainTextBody,
    }: IAwsSesTemplate): Promise<void> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return;
        }

        if (!htmlBody && !plainTextBody) {
            throw new AwsSesTemplateBodyRequiredException();
        }

        const template = {
            TemplateName: name,
            SubjectPart: subject,
            HtmlPart: htmlBody,
            TextPart: plainTextBody,
        };

        try {
            await this.sendCommand<
                UpdateTemplateCommandInput,
                UpdateTemplateCommandOutput
            >(new UpdateTemplateCommand({ Template: template }));
        } catch (error: unknown) {
            if (error instanceof AwsUnavailableException) {
                throw error;
            }

            if (!(error instanceof TemplateDoesNotExistException)) {
                throw new AppUnknownException(error);
            }

            await this.sendCommand<
                CreateTemplateCommandInput,
                CreateTemplateCommandOutput
            >(new CreateTemplateCommand({ Template: template }));
        }
    }

    async deleteTemplate({
        name,
    }: IAwsSesGetTemplate): Promise<DeleteTemplateCommandOutput> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return { $metadata: {} } as DeleteTemplateCommandOutput;
        }

        const command: DeleteTemplateCommand = new DeleteTemplateCommand({
            TemplateName: name,
        });

        const del: DeleteTemplateCommandOutput = await this.sendCommand<
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
    }: IAwsSesSend): Promise<SendTemplatedEmailCommandOutput> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return { $metadata: {} } as SendTemplatedEmailCommandOutput;
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
                ...(this.identityArn ? { SourceArn: this.identityArn } : {}),
                TemplateData: JSON.stringify(templateData ?? {}),
                ReplyToAddresses: [replyTo ?? sender],
            });

        const sendWithTemplate: SendTemplatedEmailCommandOutput =
            await this.sendCommand<
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
    }: IAwsSesSendBulk): Promise<SendBulkTemplatedEmailCommandOutput> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
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
                        e.templateData ?? {}
                    ),
                })),
                Source: sender,
                ...(this.identityArn ? { SourceArn: this.identityArn } : {}),
                DefaultTemplateData: JSON.stringify(defaultTemplateData ?? {}),
                ReplyToAddresses: [replyTo ?? sender],
            });

        const sendWithTemplate: SendBulkTemplatedEmailCommandOutput =
            await this.sendCommand<
                SendBulkTemplatedEmailCommandInput,
                SendBulkTemplatedEmailCommandOutput
            >(command);

        return sendWithTemplate;
    }
}
