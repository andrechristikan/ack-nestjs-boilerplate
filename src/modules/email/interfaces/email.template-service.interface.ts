import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';

export interface IEmailTemplateService {
    importChangePassword(): Promise<boolean>;
    getChangePassword(): Promise<GetTemplateCommandOutput | null>;
    deleteChangePassword(): Promise<boolean>;
    importWelcome(): Promise<boolean>;
    getWelcome(): Promise<GetTemplateCommandOutput | null>;
    deleteWelcome(): Promise<boolean>;
    importCreateByAdmin(): Promise<boolean>;
    getCreateByAdmin(): Promise<GetTemplateCommandOutput | null>;
    deleteCreateByAdmin(): Promise<boolean>;
    importTempPassword(): Promise<boolean>;
    getTempPassword(): Promise<GetTemplateCommandOutput | null>;
    deleteTempPassword(): Promise<boolean>;
    importForgotPassword(): Promise<boolean>;
    getForgotPassword(): Promise<GetTemplateCommandOutput | null>;
    deleteForgotPassword(): Promise<boolean>;
    importVerification(): Promise<boolean>;
    getVerification(): Promise<GetTemplateCommandOutput | null>;
    deleteVerification(): Promise<boolean>;
    importEmailVerified(): Promise<boolean>;
    getEmailVerified(): Promise<GetTemplateCommandOutput | null>;
    deleteEmailVerified(): Promise<boolean>;
    importMobileNumberVerified(): Promise<boolean>;
    getMobileNumberVerified(): Promise<GetTemplateCommandOutput | null>;
    deleteMobileNumberVerified(): Promise<boolean>;
}
