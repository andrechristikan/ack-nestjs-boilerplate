export interface IAwsSESTemplate {
    name: string;
    subject: string;
    htmlBody?: string;
    plainTextBody?: string;
}

export interface IAwsSESGetTemplate {
    name: string;
}

export interface IAwsSESSendBulkRecipient {
    recipient: string;
    templateData?: Record<string, string>;
}

export interface IAwsSESSend {
    templateName: string;
    templateData?: Record<string, string>;
    sender: string;
    replyTo?: string;
    recipients: string[];
    cc?: string[];
    bcc?: string[];
}

export interface IAwsSESSendBulk
    extends Omit<IAwsSESSend, 'recipients' | 'templateData'> {
    recipients: IAwsSESSendBulkRecipient[];
    defaultTemplateData?: Record<string, string>;
}
