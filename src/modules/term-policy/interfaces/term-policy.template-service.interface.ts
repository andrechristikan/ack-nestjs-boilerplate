import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';

export interface ITermPolicyTemplateService {
    importTermsOfService(): Promise<AwsS3Dto>;
    importPrivacy(): Promise<AwsS3Dto>;
    importCookie(): Promise<AwsS3Dto>;
    importMarketing(): Promise<AwsS3Dto>;
}
