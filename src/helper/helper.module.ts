import { Module } from '@nestjs/common';
import { HelperService } from 'helper/helper.service';

@Module({
    providers: [HelperService],
    exports: [HelperService],
    imports: [],
})
export class HelperModule {}
