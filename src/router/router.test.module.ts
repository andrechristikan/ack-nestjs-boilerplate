import { Module } from '@nestjs/common';
import { TestingCommonController } from 'src/testing/testing.common.controller';

@Module({
    controllers: [TestingCommonController],
    providers: [],
    exports: [],
    imports: [],
})
export class RouterTestModule {}
