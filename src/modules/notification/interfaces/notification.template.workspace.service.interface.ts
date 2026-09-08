import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';

export interface INotificationTemplateWorkspaceService {
    emailImportWorkspaceInvite(): Promise<boolean>;
    emailGetWorkspaceInvite(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteWorkspaceInvite(): Promise<boolean>;
    emailImportWorkspaceJoinRequest(): Promise<boolean>;
    emailGetWorkspaceJoinRequest(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteWorkspaceJoinRequest(): Promise<boolean>;
    emailImportWorkspaceJoinAccepted(): Promise<boolean>;
    emailGetWorkspaceJoinAccepted(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteWorkspaceJoinAccepted(): Promise<boolean>;
    emailImportWorkspaceJoinRejected(): Promise<boolean>;
    emailGetWorkspaceJoinRejected(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteWorkspaceJoinRejected(): Promise<boolean>;
}
