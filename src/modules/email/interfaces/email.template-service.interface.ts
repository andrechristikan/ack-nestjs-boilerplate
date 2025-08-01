import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';

export interface IEmailTemplateService {
    importChangePassword(): Promise<boolean>;
    getChangePassword(): Promise<GetTemplateCommandOutput>;
    deleteChangePassword(): Promise<boolean>;
    importWelcome(): Promise<boolean>;
    getWelcome(): Promise<GetTemplateCommandOutput>;
    deleteWelcome(): Promise<boolean>;
    importCreate(): Promise<boolean>;
    getCreate(): Promise<GetTemplateCommandOutput>;
    deleteCreate(): Promise<boolean>;
    importTempPassword(): Promise<boolean>;
    getTempPassword(): Promise<GetTemplateCommandOutput>;
    deleteTempPassword(): Promise<boolean>;
    importResetPassword(): Promise<boolean>;
    getResetPassword(): Promise<GetTemplateCommandOutput>;
    deleteResetPassword(): Promise<boolean>;
    importVerification(): Promise<boolean>;
    getVerification(): Promise<GetTemplateCommandOutput>;
    deleteVerification(): Promise<boolean>;
    importEmailVerified(): Promise<boolean>;
    getEmailVerified(): Promise<GetTemplateCommandOutput>;
    deleteEmailVerified(): Promise<boolean>;
    importMobileNumberVerified(): Promise<boolean>;
    getMobileNumberVerified(): Promise<GetTemplateCommandOutput>;
    deleteMobileNumberVerified(): Promise<boolean>;
}
