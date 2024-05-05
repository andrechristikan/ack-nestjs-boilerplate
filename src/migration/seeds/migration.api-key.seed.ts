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
            await this.apiKeyService.createRaw({
                name: 'Api Key Public Migration',
                type: ENUM_API_KEY_TYPE.PUBLIC,
                key: '8M5LeT6bnl5OGYZZVvC6',
                secret: 'qkiYgtywz9WYkDgK1IJ6qFeBx7SOqZRz',
            });
            await this.apiKeyService.createRaw({
                name: 'Api Key Public Migration',
                type: ENUM_API_KEY_TYPE.PRIVATE,
                key: 'dQ9fDRDZh4cAnKvVeEjJ',
                secret: '6ky6drqfX1DHJ6rwPGzjPcpVMqu5TUTC',
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
