import { ApiKeyHttpService } from '@modules/api-key/services/api-key.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ApiKeyHttpService],
    exports: [ApiKeyHttpService],
    imports: [],
})
export class ApiKeyHttpModule {}
