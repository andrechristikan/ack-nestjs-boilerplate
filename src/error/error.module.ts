import { Global, Module } from '@nestjs/common';
import { ErrorService } from 'error/error.service';

@Global()
@Module({
    providers: [
        {
            provide: 'ErrorService',
            useClass: ErrorService,
        },
    ],
    exports: ['ErrorService'],
    imports: [],
})
export class ErrorModule {}
