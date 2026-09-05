import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';

export interface INotificationTemplateSecurityService {
    emailImportChangePassword(): Promise<boolean>;
    emailGetChangePassword(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteChangePassword(): Promise<boolean>;
    emailImportTemporaryPasswordByAdmin(): Promise<boolean>;
    emailGetTemporaryPasswordByAdmin(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteTemporaryPasswordByAdmin(): Promise<boolean>;
    emailImportResetPassword(): Promise<boolean>;
    emailGetResetPassword(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteResetPassword(): Promise<boolean>;
    emailImportForgotPassword(): Promise<boolean>;
    emailGetForgotPassword(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteForgotPassword(): Promise<boolean>;
    emailImportResetTwoFactorByAdmin(): Promise<boolean>;
    emailGetResetTwoFactorByAdmin(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteResetTwoFactorByAdmin(): Promise<boolean>;
    emailImportNewDeviceLogin(): Promise<boolean>;
    emailGetNewDeviceLogin(): Promise<GetTemplateCommandOutput | null>;
    emailDeleteNewDeviceLogin(): Promise<boolean>;
}
