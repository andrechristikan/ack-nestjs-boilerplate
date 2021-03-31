import { Global, Module } from '@nestjs/common';
import { EncryptionController } from './encryption.controller';

@Global()
@Module({
    providers: [],
    controllers: [EncryptionController],
    exports: [],
    imports: []
})
export class EncryptionModule {}
