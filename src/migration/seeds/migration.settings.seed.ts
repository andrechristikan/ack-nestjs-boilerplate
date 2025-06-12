import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { SettingFeatureRepository } from '@modules/setting/repository/repositories/setting-feature.repository';
import { SettingFeatureEntity } from '@modules/setting/repository/entities/setting-feature.entity';

@Injectable()
export class MigrationSettingFeatureSeed {
    constructor(private readonly settingRepository: SettingFeatureRepository) {}

    @Command({
        command: 'seed:settings',
        describe: 'seed settings',
    })
    async seeds(): Promise<void> {
        try {
            const socialAuthGoogle = new SettingFeatureEntity();
            socialAuthGoogle.key = 'social.auth.google';
            socialAuthGoogle.description =
                'Enable or disable authentication via Google account';
            socialAuthGoogle.value = {
                enabled: true,
            };

            const socialAuthApple = new SettingFeatureEntity();
            socialAuthApple.key = 'social.auth.apple';
            socialAuthApple.description =
                'Enable or disable authentication via Apple account';
            socialAuthApple.value = {
                enabled: true,
            };

            const settingFeatures = [socialAuthGoogle, socialAuthApple];

            // Create multiple config entities at once
            await this.settingRepository.createMany(settingFeatures);

            console.log('Feature configs created successfully');
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }

    @Command({
        command: 'remove:settings',
        describe: 'remove settings',
    })
    async remove(): Promise<void> {
        try {
            await this.settingRepository.deleteMany();
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }
}
