import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';

/**
 * Applies access/CORS/lifecycle policies to the public and private S3 buckets; removal is a no-op. Skips with a warning
 * when S3 or `AWS_S3_IAM_ARN` is not configured.
 */
@Command({
    name: 'awsS3Config',
    description: 'Setting AWS S3 Configurations',
    allowUnknownOptions: false,
})
export class MigrationAwsS3ConfigSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationAwsS3ConfigSeed.name);

    private readonly iamArn: string | null;

    constructor(
        private readonly awsS3Service: AwsS3Service,
        private readonly configService: ConfigService
    ) {
        super();

        const iamArn = this.configService.get<string | null>('aws.s3.iam.arn');
        this.iamArn = iamArn ?? null;
    }

    private async setPrivateBucketPolicies(): Promise<void> {
        this.logger.log('Setting policies for private bucket...');

        // Sequential by design: the policy calls are order-dependent.
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

        // Sequential by design: the policy calls are order-dependent.
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

        const isS3Initialized = this.awsS3Service.isInitialized();
        if (!isS3Initialized) {
            this.logger.warn(
                'AWS S3 is not configured. Skipping AWS S3 policy seed.'
            );

            return;
        }

        if (!this.iamArn) {
            this.logger.warn(
                'AWS_S3_IAM_ARN is not set. Skipping AWS S3 policy seed.'
            );

            return;
        }

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
