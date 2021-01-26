import { Global, Module } from '@nestjs/common';
import { HashService } from 'hash/hash.service';

@Global()
@Module({
    providers: [
        {
            provide: 'HashService',
            useClass: HashService
        }
    ],
    exports: [HashService],
    imports: []
})
export class HashModule {}
