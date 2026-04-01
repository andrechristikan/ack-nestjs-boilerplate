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

/**
 * Contract for the AWS SES service covering connection health, template management,
 * and single or bulk templated email delivery.
 *
 * All operations are no-ops when the service has not been initialised with valid credentials.
 * Callers should check `isInitialized()` before invoking send operations.
 */
export interface IAwsSESService {
    /**
     * Returns whether the SES client has been initialised with valid AWS credentials.
     *
     * @returns {boolean} True when the client is ready to send requests to SES.
     */
    isInitialized(): boolean;

    /**
     * Verifies connectivity to the AWS SES endpoint by performing a lightweight API call.
     *
     * @returns {Promise<boolean>} True when the connection succeeds.
     */
    checkConnection(): Promise<boolean>;

    /**
     * Retrieves the list of email templates registered in SES, with optional pagination.
     *
     * @param {string} nextToken - Pagination cursor returned by a previous list call.
     * @returns {Promise<ListTemplatesCommandOutput>} Raw SES SDK response containing the template list.
     */
    listTemplates(nextToken?: string): Promise<ListTemplatesCommandOutput>;

    /**
     * Fetches the full definition of a single SES email template.
     *
     * @param {IAwsSESGetTemplate} param - Template name selector.
     * @returns {Promise<GetTemplateCommandOutput>} Raw SES SDK response containing the template definition.
     */
    getTemplate({
        name,
    }: IAwsSESGetTemplate): Promise<GetTemplateCommandOutput>;

    /**
     * Creates a new email template in SES.
     *
     * @param {IAwsSESTemplate} param - Template name, subject, and optional HTML/plain-text bodies.
     * @returns {Promise<CreateTemplateCommandOutput>} Raw SES SDK response confirming creation.
     */
    createTemplate({
        name,
        subject,
        htmlBody,
        plainTextBody,
    }: IAwsSESTemplate): Promise<CreateTemplateCommandOutput>;

    /**
     * Updates the subject or body of an existing SES email template.
     *
     * @param {IAwsSESTemplate} param - Template name and the updated subject and/or bodies.
     * @returns {Promise<UpdateTemplateCommandOutput>} Raw SES SDK response confirming the update.
     */
    updateTemplate({
        name,
        subject,
        htmlBody,
        plainTextBody,
    }: IAwsSESTemplate): Promise<UpdateTemplateCommandOutput>;

    /**
     * Permanently removes an email template from SES.
     *
     * @param {IAwsSESGetTemplate} param - Template name selector.
     * @returns {Promise<DeleteTemplateCommandOutput>} Raw SES SDK response confirming deletion.
     */
    deleteTemplate({
        name,
    }: IAwsSESGetTemplate): Promise<DeleteTemplateCommandOutput>;

    /**
     * Sends a templated email to one or more recipients via SES.
     *
     * @param {IAwsSESSend} param - Sender, recipients, template name, template data, and optional CC/BCC.
     * @returns {Promise<SendTemplatedEmailCommandOutput>} Raw SES SDK response containing the message ID.
     */
    send({
        recipients,
        sender,
        replyTo,
        bcc,
        cc,
        templateName,
        templateData,
    }: IAwsSESSend): Promise<SendTemplatedEmailCommandOutput>;

    /**
     * Sends a templated email to multiple recipients in a single bulk SES request,
     * where each recipient may supply individual template variable substitutions.
     *
     * @param {IAwsSESSendBulk} param - Sender, per-recipient list, template name, and optional CC/BCC.
     * @returns {Promise<SendBulkTemplatedEmailCommandOutput>} Raw SES SDK response with per-recipient delivery results.
     */
    sendBulk({
        recipients,
        sender,
        replyTo,
        bcc,
        cc,
        templateName,
    }: IAwsSESSendBulk): Promise<SendBulkTemplatedEmailCommandOutput>;
}
