import { Module } from '@nestjs/common';
import { ResponseService } from 'common/response/response.service';

@Module({
    providers: [ResponseService],
    exports: [ResponseService],
    imports: [],
})
export class ResponseModule {}
