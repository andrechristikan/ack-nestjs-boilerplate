import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { VerificationPublicVerifyEmailDoc } from '@modules/verification/docs/verification.public.doc';
import { VerificationVerifyEmailRequestDto } from '@modules/verification/dtos/request/verification.verify-email.request.dto';
import { VerificationService } from '@modules/verification/services/verification.service';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.verification')
@Controller({
    version: '1',
    path: '/verification',
})
export class VerificationPublicController {
    constructor(private readonly verificationService: VerificationService) {}

    @VerificationPublicVerifyEmailDoc()
    @Response('verification.verifyEmail')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/verify/email')
    async verifyEmail(
        @Body() body: VerificationVerifyEmailRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.verificationService.verifyEmail(body, {
            ipAddress,
            userAgent,
        });
    }
}
