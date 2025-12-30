import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { Logger } from '@nestjs/common';
import { Command } from 'nest-commander';

@Command({
    name: 'aws-s3-config',
    description: 'Setting AWS S3 Configurations',
    allowUnknownOptions: false,
})
export class MigrationAwsS3ConfigSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationAwsS3ConfigSeed.name);

    constructor(private readonly awsS3Service: AwsS3Service) {
        super();
    }

    private async setPrivateBucketPolicies(): Promise<void> {
        this.logger.log('Setting policies for private bucket...');

        // @note: need to set policies in order and sequentially
        await this.awsS3Service.settingBlockPublicAccessConfiguration({
            access: EnumAwsS3Accessibility.private,
        });
        await this.awsS3Service.settingDisableAclConfiguration({
            access: EnumAwsS3Accessibility.private,
        });
        await this.awsS3Service.settingBucketPolicy({
            access: EnumAwsS3Accessibility.private,
        });
        await this.awsS3Service.settingCorsConfiguration({
            access: EnumAwsS3Accessibility.private,
        });
        await this.awsS3Service.settingBucketExpiredObjectLifecycle({
            access: EnumAwsS3Accessibility.private,
        });

        this.logger.log('Finished setting policies for private bucket.');
    }

    private async setPublicBucketPolicies(): Promise<void> {
        this.logger.log('Setting policies for public bucket...');

        // @note: need to set policies in order and sequentially
        await this.awsS3Service.settingBlockPublicAccessConfiguration({
            access: EnumAwsS3Accessibility.public,
        });
        await this.awsS3Service.settingDisableAclConfiguration({
            access: EnumAwsS3Accessibility.public,
        });
        await this.awsS3Service.settingBucketPolicy({
            access: EnumAwsS3Accessibility.public,
        });
        await this.awsS3Service.settingCorsConfiguration({
            access: EnumAwsS3Accessibility.public,
        });
        await this.awsS3Service.settingBucketExpiredObjectLifecycle({
            access: EnumAwsS3Accessibility.public,
        });

        this.logger.log('Finished setting policies for public bucket.');
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding AWS S3 Policies...');

        try {
            await Promise.all([
                this.setPublicBucketPolicies(),
                this.setPrivateBucketPolicies(),
            ]);
        } catch (error: unknown) {
            this.logger.error(error, 'Error setting AWS S3 policies');
            throw error;
        }

        this.logger.log('Finished seeding AWS S3 Policies.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Skipping removal of AWS S3 Policies seed.');

        return;
    }
}
