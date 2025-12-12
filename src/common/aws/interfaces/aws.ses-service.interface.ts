import {
    CreateTemplateCommandOutput,
    DeleteTemplateCommandOutput,
    GetTemplateCommandOutput,
    ListTemplatesCommandOutput,
    SendBulkTemplatedEmailCommandOutput,
    SendTemplatedEmailCommandOutput,
    UpdateTemplateCommandOutput,
} from '@aws-sdk/client-ses';
import {
    AwsSESGetTemplateDto,
    AwsSESSendBulkDto,
    AwsSESSendDto,
    AwsSESTemplateDto,
} from '@common/aws/dtos/aws.ses.dto';

export interface IAwsSESService {
    checkConnection(): Promise<boolean>;
    listTemplates(nextToken?: string): Promise<ListTemplatesCommandOutput>;
    getTemplate({
        name,
    }: AwsSESGetTemplateDto): Promise<GetTemplateCommandOutput>;
    createTemplate({
        name,
        subject,
        htmlBody,
        plainTextBody,
    }: AwsSESTemplateDto): Promise<CreateTemplateCommandOutput>;
    updateTemplate({
        name,
        subject,
        htmlBody,
        plainTextBody,
    }: AwsSESTemplateDto): Promise<UpdateTemplateCommandOutput>;
    deleteTemplate({
        name,
    }: AwsSESGetTemplateDto): Promise<DeleteTemplateCommandOutput>;
    send<T>({
        recipients,
        sender,
        replyTo,
        bcc,
        cc,
        templateName,
        templateData,
    }: AwsSESSendDto<T>): Promise<SendTemplatedEmailCommandOutput>;
    sendBulk({
        recipients,
        sender,
        replyTo,
        bcc,
        cc,
        templateName,
    }: AwsSESSendBulkDto): Promise<SendBulkTemplatedEmailCommandOutput>;
}
