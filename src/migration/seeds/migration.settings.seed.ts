import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { SettingFeatureEntity } from '@modules/setting/repository/entities/setting-feature.entity';
import { SettingFeatureService } from '@modules/setting/services/setting-feature.service';

@Injectable()
export class MigrationSettingFeatureSeed {
    constructor(
        private readonly settingFeatureService: SettingFeatureService
    ) {}

    @Command({
        command: 'seed:settings',
        describe: 'seed settings',
    })
    async seeds(): Promise<void> {
        try {
            const socialAuthGoogle = new SettingFeatureEntity();
            socialAuthGoogle.key = 'auth.social.google';
            socialAuthGoogle.description =
                'Setting for Google social authentication';
            socialAuthGoogle.value = {
                enabled: true,
            };

            const socialAuthApple = new SettingFeatureEntity();
            socialAuthApple.key = 'auth.social.apple';
            socialAuthApple.description =
                'Setting for Apple social authentication';
            socialAuthApple.value = {
                enabled: true,
            };

            // Create multiple config entities at once
            await this.settingFeatureService.createMany([
                socialAuthGoogle,
                socialAuthApple,
            ]);
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
            await this.settingFeatureService.deleteMany();
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }
}
