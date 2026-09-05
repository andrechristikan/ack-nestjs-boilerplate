import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';

export interface INotificationTemplateAccountService {
    emailImportWelcome(): Promise<boolean>;
    emailGetWelcome(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteWelcome(): Promise<boolean>;
    emailImportWelcomeSocial(): Promise<boolean>;
    emailGetWelcomeSocial(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteWelcomeSocial(): Promise<boolean>;
    emailImportWelcomeByAdmin(): Promise<boolean>;
    emailGetWelcomeByAdmin(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteWelcomeByAdmin(): Promise<boolean>;
    emailImportVerificationEmail(): Promise<boolean>;
    emailGetVerificationEmail(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteVerificationEmail(): Promise<boolean>;
    emailImportVerifiedEmail(): Promise<boolean>;
    emailGetVerifiedEmail(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteVerifiedEmail(): Promise<boolean>;
    emailImportVerifiedMobileNumber(): Promise<boolean>;
    emailGetVerifiedMobileNumber(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteVerifiedMobileNumber(): Promise<boolean>;
}
