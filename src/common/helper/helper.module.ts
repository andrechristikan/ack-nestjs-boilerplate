import { DynamicModule, Global, Module } from '@nestjs/common';
import { HelperService } from '@common/helper/services/helper.service';

@Global()
@Module({})
export class HelperModule {
    static forRoot(): DynamicModule {
        return {
            module: HelperModule,
            providers: [HelperService],
            exports: [HelperService],
            controllers: [],
            imports: [],
        };
    }
}
