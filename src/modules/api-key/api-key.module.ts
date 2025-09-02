import { Module } from '@nestjs/common';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';

@Module({
    providers: [ApiKeyService, ApiKeyUtil],
    exports: [ApiKeyService, ApiKeyUtil],
    controllers: [],
    imports: [],
})
export class ApiKeyModule {}
