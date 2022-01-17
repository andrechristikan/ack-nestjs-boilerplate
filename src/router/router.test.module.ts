import { Module } from '@nestjs/common';
import { TestingController } from 'src/testing/testing.controller';

@Module({
    controllers: [TestingController],
    providers: [],
    exports: [],
    imports: [],
})
export class RouterTestModule {}
