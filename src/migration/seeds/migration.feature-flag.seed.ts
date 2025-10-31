import { Command } from 'nestjs-command';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@common/database/services/database.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MigrationFeatureFlagSeed {
    private readonly logger = new Logger(MigrationFeatureFlagSeed.name);

    private readonly featureFlags: Prisma.FeatureFlagCreateInput[] = [
        {
            key: 'loginWithGoogle',
            description: 'Enable login with Google',
            isEnable: true,
            rolloutPercent: 100,
            metadata: {
                signUpAllowed: true,
            },
        },
        {
            key: 'loginWithApple',
            description: 'Enable login with Apple',
            isEnable: true,
            rolloutPercent: 100,
            metadata: {
                signUpAllowed: true,
            },
        },
        {
            key: 'loginWithCredential',
            description: 'Enable login with Credential',
            isEnable: true,
        },
        {
            key: 'signUp',
            description: 'Enable user sign up',
            isEnable: true,
        },
        // TODO: LAST
        // {
        //     key: 'resetPassword',
        //     isEnable: true,
        // },
    ];

    constructor(private readonly databaseService: DatabaseService) {}

    @Command({
        command: 'seed:featureFlag',
        describe: 'seeds featureFlags',
    })
    async seeds(): Promise<void> {
        this.logger.log('Seeding Feature Flags...');

        await this.databaseService.featureFlag.createMany({
            data: this.featureFlags,
        });

        this.logger.log('Feature Flags seeded successfully.');

        return;
    }

    @Command({
        command: 'remove:featureFlag',
        describe: 'remove featureFlags',
    })
    async remove(): Promise<void> {
        this.logger.log('Removing Feature Flags...');

        await this.databaseService.featureFlag.deleteMany({});

        this.logger.log('Feature Flags removed successfully.');

        return;
    }
}
