import { IAwsS3 } from '@common/aws/interfaces/aws.interface';

export interface ITermPolicyTemplateService {
    importTermsOfService(): Promise<IAwsS3 | null>;
    importPrivacy(): Promise<IAwsS3 | null>;
    importCookie(): Promise<IAwsS3 | null>;
    importMarketing(): Promise<IAwsS3 | null>;
}
