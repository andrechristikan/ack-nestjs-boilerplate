import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';

@Command({
    name: 'aws-s3-policy',
    description: 'Setting AWS S3 Policies',
    allowUnknownOptions: false,
})
export class MigrationAwsS3PolicySeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationAwsS3PolicySeed.name);

    private readonly termPolicyContentPublicPath: string;
    private readonly termPolicyUploadContentPath: string;
    private readonly userUploadPhotoProfilePath: string;

    constructor(
        private readonly awsS3Service: AwsS3Service,
        private readonly configService: ConfigService
    ) {
        super();

        this.termPolicyContentPublicPath = this.configService.get<string>(
            'termPolicy.contentPublicPath'
        );
        this.termPolicyUploadContentPath = this.configService.get<string>(
            'termPolicy.uploadContentPath'
        );
        this.userUploadPhotoProfilePath = this.configService.get<string>(
            'user.uploadPhotoProfilePath'
        );
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding AWS S3 Policies...');

        this.logger.log('Setting policies for public bucket...');

        await Promise.all([
            this.awsS3Service.settingBlockPublicAccessConfiguration({
                access: EnumAwsS3Accessibility.public,
            }),
            this.awsS3Service.settingBucketExpiredObjectLifecycle({
                access: EnumAwsS3Accessibility.public,
            }),
            this.awsS3Service.settingBucketPolicy(
                [
                    this.termPolicyContentPublicPath,
                    this.userUploadPhotoProfilePath,
                ],
                {
                    access: EnumAwsS3Accessibility.public,
                }
            ),
            this.awsS3Service.settingCorsConfiguration({
                access: EnumAwsS3Accessibility.public,
            }),
            this.awsS3Service.settingDisableAclConfiguration({
                access: EnumAwsS3Accessibility.public,
            }),
        ]);

        this.logger.log('Setting policies for private bucket...');

        await Promise.all([
            this.awsS3Service.settingBlockPublicAccessConfiguration({
                access: EnumAwsS3Accessibility.private,
            }),
            this.awsS3Service.settingBucketExpiredObjectLifecycle({
                access: EnumAwsS3Accessibility.private,
            }),
            this.awsS3Service.settingBucketPolicy(
                [this.termPolicyUploadContentPath],
                {
                    access: EnumAwsS3Accessibility.private,
                }
            ),
            this.awsS3Service.settingCorsConfiguration({
                access: EnumAwsS3Accessibility.private,
            }),
            this.awsS3Service.settingDisableAclConfiguration({
                access: EnumAwsS3Accessibility.private,
            }),
        ]);

        this.logger.log('Finished seeding AWS S3 Policies.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Skipping removal of AWS S3 Policies seed.');

        return;
    }
}
