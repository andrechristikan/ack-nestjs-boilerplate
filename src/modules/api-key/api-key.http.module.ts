import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { ApiKeyHttpService } from '@modules/api-key/services/api-key.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ApiKeyHttpService],
    exports: [ApiKeyHttpService],
    imports: [ApiKeyModule],
})
export class ApiKeyHttpModule {}
