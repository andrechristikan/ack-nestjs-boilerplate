import { Global, Module } from '@nestjs/common';
import { HelperService } from 'helper/helper.service';

@Global()
@Module({
    providers: [
        {
            provide: 'HelperService',
            useClass: HelperService
        }
    ],
    exports: ['HelperService'],
    imports: []
})
export class HelperModule {}
