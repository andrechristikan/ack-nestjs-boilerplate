/**
 * Payload for creating or updating an SES email template.
 */
export interface IAwsSESTemplate {
    /** Unique template name used to reference the template in send operations. */
    name: string;
    /** Email subject line; may include template variable placeholders. */
    subject: string;
    /** HTML body of the email; may include template variable placeholders. */
    htmlBody?: string;
    /** Plain-text fallback body for email clients that do not render HTML. */
    plainTextBody?: string;
}

/**
 * Selector for retrieving or deleting a specific SES email template by name.
 */
export interface IAwsSESGetTemplate {
    /** Name of the SES template to look up. */
    name: string;
}

/**
 * A single recipient entry in a bulk SES send operation, with optional per-recipient template data.
 */
export interface IAwsSESSendBulkRecipient {
    /** Email address of the recipient. */
    recipient: string;
    /** Template variable substitutions specific to this recipient. Overrides default template data when provided. */
    templateData?: Record<string, string>;
}

/**
 * Payload for sending a templated email to one or more recipients via SES.
 */
export interface IAwsSESSend {
    /** Name of the SES template to render. */
    templateName: string;
    /** Key-value pairs substituted into the template variables. */
    templateData?: Record<string, string>;
    /** Verified sender email address (From header). */
    sender: string;
    /** Optional reply-to email address. */
    replyTo?: string;
    /** Primary recipient email addresses. */
    recipients: string[];
    /** Carbon-copy recipient email addresses. */
    cc?: string[];
    /** Blind carbon-copy recipient email addresses. */
    bcc?: string[];
}

/**
 * Payload for sending a templated email in bulk, where each recipient may supply individual template data.
 * Omits the single-recipient `recipients` and `templateData` fields from IAwsSESSend in favour of per-recipient entries.
 */
export interface IAwsSESSendBulk extends Omit<IAwsSESSend, 'recipients' | 'templateData'> {
    /** List of recipients, each with optional per-recipient template data. */
    recipients: IAwsSESSendBulkRecipient[];
    /** Fallback template data applied to recipients that do not provide their own. */
    defaultTemplateData?: Record<string, string>;
}
