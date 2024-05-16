import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';

@Injectable()
export class MigrationApiKeySeed {
    constructor(private readonly apiKeyService: ApiKeyService) {}

    @Command({
        command: 'seed:apikey',
        describe: 'seeds apikeys',
    })
    async seeds(): Promise<void> {
        try {
            const apiKeyPublicKey = 'v8VB0yY887lMpTA2VJMV';
            const apiKeyPublicSecret = 'zeZbtGTugBTn3Qd5UXtSZBwt7gn3bg';
            await this.apiKeyService.createRaw({
                name: 'Api Key Public Migration',
                type: ENUM_API_KEY_TYPE.PUBLIC,
                key: apiKeyPublicKey,
                secret: apiKeyPublicSecret,
            });

            const apiKeyPrivateKey = 'OgXYkQyOtP7Zl5uCbKd8';
            const apiKeyPrivateSecret = '3kh0hW7pIAH3wW9DwUGrP8Y5RW9Ywv';
            await this.apiKeyService.createRaw({
                name: 'Api Key Private Migration',
                type: ENUM_API_KEY_TYPE.PRIVATE,
                key: apiKeyPrivateKey,
                secret: apiKeyPrivateSecret,
            });
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }

    @Command({
        command: 'remove:apikey',
        describe: 'remove apikeys',
    })
    async remove(): Promise<void> {
        try {
            await this.apiKeyService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
