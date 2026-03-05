import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';

export interface ITermPolicyTemplateService {
    importTermsOfService(): Promise<AwsS3Dto | null>;
    importPrivacy(): Promise<AwsS3Dto | null>;
    importCookie(): Promise<AwsS3Dto | null>;
    importMarketing(): Promise<AwsS3Dto | null>;
}
