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
    IAwsSESGetTemplate,
    IAwsSESSend,
    IAwsSESSendBulk,
    IAwsSESTemplate,
} from '@common/aws/interfaces/aws.ses.interface';

export interface IAwsSESService {
    isInitialized(): boolean;
    checkConnection(): Promise<boolean>;
    listTemplates(nextToken?: string): Promise<ListTemplatesCommandOutput>;
    getTemplate({
        name,
    }: IAwsSESGetTemplate): Promise<GetTemplateCommandOutput>;
    createTemplate({
        name,
        subject,
        htmlBody,
        plainTextBody,
    }: IAwsSESTemplate): Promise<CreateTemplateCommandOutput>;
    updateTemplate({
        name,
        subject,
        htmlBody,
        plainTextBody,
    }: IAwsSESTemplate): Promise<UpdateTemplateCommandOutput>;
    deleteTemplate({
        name,
    }: IAwsSESGetTemplate): Promise<DeleteTemplateCommandOutput>;
    send({
        recipients,
        sender,
        replyTo,
        bcc,
        cc,
        templateName,
        templateData,
    }: IAwsSESSend): Promise<SendTemplatedEmailCommandOutput>;
    sendBulk({
        recipients,
        sender,
        replyTo,
        bcc,
        cc,
        templateName,
    }: IAwsSESSendBulk): Promise<SendBulkTemplatedEmailCommandOutput>;
}
