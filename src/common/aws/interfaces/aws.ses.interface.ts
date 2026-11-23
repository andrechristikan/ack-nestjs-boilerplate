export interface IAwsSesTemplate {
    name: string;
    subject: string;
    htmlBody?: string;
    plainTextBody?: string;
}

export interface IAwsSesGetTemplate {
    name: string;
}

export interface IAwsSesSendBulkRecipient {
    recipient: string;
    templateData?: Record<string, string>;
}

export interface IAwsSesSend {
    templateName: string;
    templateData?: Record<string, string>;
    sender: string;
    replyTo?: string;
    recipients: string[];
    cc?: string[];
    bcc?: string[];
}

export interface IAwsSesSendBulk extends Omit<
    IAwsSesSend,
    'recipients' | 'templateData'
> {
    recipients: IAwsSesSendBulkRecipient[];
    defaultTemplateData?: Record<string, string>;
}
