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

    private readonly publicPaths: string[] = [];
    private readonly privatePaths: string[] = [];

    constructor(
        private readonly awsS3Service: AwsS3Service,
        private readonly configService: ConfigService
    ) {
        super();

        this.publicPaths = [
            this.configService.get<string>('termPolicy.contentPublicPath'),
            this.configService.get<string>('user.uploadPhotoProfilePath'),
        ];

        this.privatePaths = [
            this.configService.get<string>('termPolicy.uploadContentPath'),
        ];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding AWS S3 Policies...');

        this.logger.log('Setting policies for public bucket...');

        try {
            await Promise.all([
                this.awsS3Service.settingBlockPublicAccessConfiguration({
                    access: EnumAwsS3Accessibility.public,
                }),
                this.awsS3Service.settingBucketExpiredObjectLifecycle({
                    access: EnumAwsS3Accessibility.public,
                }),
                this.awsS3Service.settingBucketPolicy(this.publicPaths, {
                    access: EnumAwsS3Accessibility.public,
                }),
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
                this.awsS3Service.settingBucketPolicy(this.privatePaths, {
                    access: EnumAwsS3Accessibility.private,
                }),
                this.awsS3Service.settingCorsConfiguration({
                    access: EnumAwsS3Accessibility.private,
                }),
                this.awsS3Service.settingDisableAclConfiguration({
                    access: EnumAwsS3Accessibility.private,
                }),
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
