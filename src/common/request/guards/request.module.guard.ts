import { Module, Global } from '@nestjs/common';
import {
    RequestJsonBodyParserGuard,
    RequestRawBodyParserGuard,
    RequestTextBodyParserGuard,
    RequestUrlencodedBodyParserGuard,
} from 'src/common/request/guards/body-parser/request.body-parser.guard';
import { RequestCorsGuard } from 'src/common/request/guards/cors/request.cors.guard';
import { RequestHelmetGuard } from 'src/common/request/guards/helmet/request.helmet.guard';
import { RequestIdGuard } from 'src/common/request/guards/id/request.id.guard';
import { RequestTimestampGuard } from 'src/common/request/guards/timestamp/request.timestamp.guard';
import { RequestTimezoneGuard } from 'src/common/request/guards/timezone/request.timezone.guard';
import { RequestUserAgentGuard } from 'src/common/request/guards/user-agent/request.user-agent.guard';

import { RequestVersionGuard } from 'src/common/request/guards/version/request.version.guard';

@Global()
@Module({
    providers: [
        RequestHelmetGuard,
        RequestIdGuard,
        RequestJsonBodyParserGuard,
        RequestTextBodyParserGuard,
        RequestRawBodyParserGuard,
        RequestUrlencodedBodyParserGuard,
        RequestCorsGuard,
        RequestVersionGuard,
        RequestUserAgentGuard,
        RequestTimestampGuard,
        RequestTimezoneGuard,
    ],
    exports: [

    ],
})
export class RequestGuardModule {}
