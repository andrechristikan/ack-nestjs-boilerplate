import { Module } from '@nestjs/common';
import { CaslService } from './casl.service';

@Module({
    providers: [CaslService],
    exports: [CaslService]
})
export class CaslModule {}
