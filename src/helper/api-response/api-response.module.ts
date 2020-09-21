import { Global, Module } from '@nestjs/common';
import { ApiResponseService } from 'helper/api-response/api-response.service';

@Global()
@Module({
    providers: [
        {
            provide: 'ApiResponseService',
            useClass: ApiResponseService,
        },
    ],
    exports: ['ApiResponseService'],
    imports: [],
})
export class ApiResponseModule {}
