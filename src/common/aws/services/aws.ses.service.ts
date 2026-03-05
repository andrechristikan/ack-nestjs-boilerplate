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
    AwsSESGetTemplateDto,
    AwsSESSendBulkDto,
    AwsSESSendDto,
    AwsSESTemplateDto,
} from '@common/aws/dtos/aws.ses.dto';

/**
 * Service for AWS SES (Simple Email Service) operations.
 *
 * Handles email template management (create, update, delete, list, get)
 * and email delivery (single and bulk) using AWS SES templated email.
 *
 * The service is initialized lazily on module init. If IAM credentials or
 * region are not configured, the SES client will not be created and all
 * methods will return default empty responses instead of throwing errors.
 */
@Injectable()
export class AwsSESService implements IAwsSESService, OnModuleInit {
    private readonly logger = new Logger(AwsSESService.name);

    private readonly iamKey: string | null;
    private readonly iamSecret: string | null;
    private readonly region: string | null;

    private sesClient: SESClient;

    constructor(private readonly configService: ConfigService) {
        this.iamKey = this.configService.get<string | null>('aws.ses.iam.key');
        this.iamSecret = this.configService.get<string | null>(
            'aws.ses.iam.secret'
        );
        this.region = this.configService.get<string | null>('aws.ses.region');
    }

    /**
     * Initializes the SES client using configured IAM credentials and region.
     * If any required credential is missing, the client will not be created
     * and the service will operate in a no-op mode.
     */
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

    /**
     * Returns whether the SES client has been successfully initialized.
     * @returns {boolean} `true` if the SES client is ready to use, `false` otherwise
     */
    isInitialized(): boolean {
        return !!this.sesClient;
    }

    /**
     * Verifies connectivity to AWS SES by sending a GetSendQuota request.
     * Returns `false` immediately if the service is not initialized.
     * @returns {Promise<boolean>} `true` if connected successfully, `false` if not initialized or request fails
     */
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

    /**
     * Retrieves a paginated list of email templates from AWS SES.
     * Returns an empty `TemplatesMetadata` array if the service is not initialized.
     * @param {string} [nextToken] - Optional pagination token to retrieve the next page of results
     * @returns {Promise<ListTemplatesCommandOutput>} List of template metadata with an optional `NextToken` for pagination
     */
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

    /**
     * Retrieves a specific email template from AWS SES by name.
     * Returns an empty output if the service is not initialized.
     * @param {AwsSESGetTemplateDto} dto - DTO containing the template name to look up
     * @returns {Promise<GetTemplateCommandOutput>} Template detail including subject, HTML body, and plain text body
     */
    async getTemplate({
        name,
    }: AwsSESGetTemplateDto): Promise<GetTemplateCommandOutput> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return {
                $metadata: {},
                Template: null,
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

    /**
     * Creates a new email template in AWS SES.
     * Returns an empty output if the service is not initialized.
     * Throws an error if neither `htmlBody` nor `plainTextBody` is provided.
     * @param {AwsSESTemplateDto} dto - DTO containing the template name, subject, HTML body, and/or plain text body
     * @returns {Promise<CreateTemplateCommandOutput>} Result of the create operation
     * @throws {Error} If both `htmlBody` and `plainTextBody` are missing
     */
    async createTemplate({
        name,
        subject,
        htmlBody,
        plainTextBody,
    }: AwsSESTemplateDto): Promise<CreateTemplateCommandOutput> {
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

    /**
     * Updates an existing email template in AWS SES.
     * Returns an empty output if the service is not initialized.
     * Throws an error if neither `htmlBody` nor `plainTextBody` is provided.
     * @param {AwsSESTemplateDto} dto - DTO containing the template name, subject, HTML body, and/or plain text body
     * @returns {Promise<UpdateTemplateCommandOutput>} Result of the update operation
     * @throws {Error} If both `htmlBody` and `plainTextBody` are missing
     */
    async updateTemplate({
        name,
        subject,
        htmlBody,
        plainTextBody,
    }: AwsSESTemplateDto): Promise<UpdateTemplateCommandOutput> {
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

    /**
     * Deletes an email template from AWS SES.
     * Returns an empty output if the service is not initialized.
     * @param {AwsSESGetTemplateDto} dto - DTO containing the name of the template to delete
     * @returns {Promise<DeleteTemplateCommandOutput>} Result of the delete operation
     */
    async deleteTemplate({
        name,
    }: AwsSESGetTemplateDto): Promise<DeleteTemplateCommandOutput> {
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

    /**
     * Sends a templated email to one or more recipients using AWS SES.
     * Returns an empty output with a `null` MessageId if the service is not initialized.
     * @template T - Shape of the template data object
     * @param {AwsSESSendDto<T>} dto - DTO containing recipients, sender, reply-to, CC, BCC, template name, and template data
     * @returns {Promise<SendTemplatedEmailCommandOutput>} Send result including the SES `MessageId`
     */
    async send<T>({
        recipients,
        sender,
        replyTo,
        bcc,
        cc,
        templateName,
        templateData,
    }: AwsSESSendDto<T>): Promise<SendTemplatedEmailCommandOutput> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS SES credentials not configured. Email functionalities will be disabled.'
            );

            return {
                MessageId: null,
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

    /**
     * Sends templated emails to multiple recipients in bulk using AWS SES.
     * Each recipient can have individual template data via `ReplacementTemplateData`.
     * Returns an empty `Status` array if the service is not initialized.
     * @param {AwsSESSendBulkDto} dto - DTO containing per-recipient data, sender, reply-to, CC, BCC, template name, and default template data
     * @returns {Promise<SendBulkTemplatedEmailCommandOutput>} Bulk send result with per-destination status and message IDs
     */
    async sendBulk({
        recipients,
        sender,
        replyTo,
        bcc,
        cc,
        templateName,
        defaultTemplateData,
    }: AwsSESSendBulkDto): Promise<SendBulkTemplatedEmailCommandOutput> {
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
