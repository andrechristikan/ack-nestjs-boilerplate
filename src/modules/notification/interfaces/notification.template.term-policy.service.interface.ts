import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';

export interface INotificationTemplateTermPolicyService {
    emailImportPublishTermPolicy(): Promise<boolean>;
    emailGetPublishTermPolicy(): Promise<GetTemplateCommandOutput | null>;
    emailDeletePublishTermPolicy(): Promise<boolean>;
}
