import { Injectable } from '@nestjs/common';
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
 * AWS SES (Simple Email Service) service for managing email operations.
 * Provides functionality for creating, updating, and deleting email templates,
 * as well as sending single emails and bulk emails using AWS SES templated
 * email functionality.
 */
@Injectable()
export class AwsSESService implements IAwsSESService {
    private readonly sesClient: SESClient;

    constructor(private readonly configService: ConfigService) {
        this.sesClient = new SESClient({
            credentials: {
                accessKeyId: this.configService.get<string>('aws.ses.iam.key'),
                secretAccessKey:
                    this.configService.get<string>('aws.ses.iam.secret'),
            },
            region: this.configService.get<string>('aws.ses.region'),
        });
    }

    /**
     * Checks the connection to AWS SES by sending a get quota command.
     * @returns {Promise<boolean>} Promise that resolves to true if connection is successful, false otherwise
     */
    async checkConnection(): Promise<boolean> {
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
     * Retrieves a list of email templates from AWS SES.
     * @param {string} [nextToken] - Optional pagination token to get the next set of results
     * @returns {Promise<ListTemplatesCommandOutput>} Promise that resolves to a list of templates with pagination information
     */
    async listTemplates(
        nextToken?: string
    ): Promise<ListTemplatesCommandOutput> {
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
     * @param {AwsSESGetTemplateDto} templateDto - Object containing the template name to retrieve
     * @returns {Promise<GetTemplateCommandOutput>} Promise that resolves to the template information including subject and body
     */
    async getTemplate({
        name,
    }: AwsSESGetTemplateDto): Promise<GetTemplateCommandOutput> {
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
     * @param {AwsSESTemplateDto} templateDto - Object containing template name, subject, and body content
     * @returns {Promise<CreateTemplateCommandOutput>} Promise that resolves to the creation result
     */
    async createTemplate({
        name,
        subject,
        htmlBody,
        plainTextBody,
    }: AwsSESTemplateDto): Promise<CreateTemplateCommandOutput> {
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
     * @param {AwsSESTemplateDto} templateDto - Object containing template name, subject, and updated body content
     * @returns {Promise<UpdateTemplateCommandOutput>} Promise that resolves to the update result
     */
    async updateTemplate({
        name,
        subject,
        htmlBody,
        plainTextBody,
    }: AwsSESTemplateDto): Promise<UpdateTemplateCommandOutput> {
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
     * @param {AwsSESGetTemplateDto} templateDto - Object containing the template name to delete
     * @returns {Promise<DeleteTemplateCommandOutput>} Promise that resolves to the deletion result
     */
    async deleteTemplate({
        name,
    }: AwsSESGetTemplateDto): Promise<DeleteTemplateCommandOutput> {
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
     * Sends a templated email to a single recipient or multiple recipients using AWS SES.
     * @template T - Type of template data object
     * @param {AwsSESSendDto<T>} emailDto - Object containing recipients, sender, template name, and template data
     * @returns {Promise<SendTemplatedEmailCommandOutput>} Promise that resolves to the send result with message ID
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
     * @param {AwsSESSendBulkDto} emailDto - Object containing recipients with individual template data, sender, and template name
     * @returns {Promise<SendBulkTemplatedEmailCommandOutput>} Promise that resolves to the bulk send result with message IDs and status
     */
    async sendBulk({
        recipients,
        sender,
        replyTo,
        bcc,
        cc,
        templateName,
    }: AwsSESSendBulkDto): Promise<SendBulkTemplatedEmailCommandOutput> {
        const command: SendBulkTemplatedEmailCommand =
            new SendBulkTemplatedEmailCommand({
                DefaultTemplateData: '',
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
