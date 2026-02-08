import { Module } from '@nestjs/common';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeySharedModule } from '@modules/api-key/api-key.shared.module';

@Module({
    providers: [ApiKeyService],
    exports: [ApiKeyService],
    imports: [ApiKeySharedModule],
})
export class ApiKeyModule {}
