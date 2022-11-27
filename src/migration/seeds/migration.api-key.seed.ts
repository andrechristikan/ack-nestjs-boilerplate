import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { ApiKeyBulkKeyService } from 'src/common/api-key/services/api-key.bulk.service';
import { UserService } from 'src/modules/user/services/user.service';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class MigrationApiKeySeed {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly apiKeyBulkService: ApiKeyBulkKeyService,
        private readonly userService: UserService
    ) {}

    @Command({
        command: 'seed:apikey',
        describe: 'seeds apikeys',
    })
    async seeds(): Promise<void> {
        const user: UserEntity = await this.userService.findOneByUsername(
            'user'
        );
        try {
            await this.apiKeyService.createRaw({
                name: 'Api Key Migration',
                description: 'From migration',
                key: 'qwertyuiop12345zxcvbnmkjh',
                user: user._id,
                secret: '5124512412412asdasdasdasdasdASDASDASD',
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
            await this.apiKeyBulkService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
