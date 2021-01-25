import { Module } from '@nestjs/common';
import { HashService } from 'hash/hash.service';

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
