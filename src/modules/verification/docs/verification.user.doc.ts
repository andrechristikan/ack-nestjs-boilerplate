import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { VerificationVerifyRequestDto } from 'src/modules/verification/dtos/request/verification.verify.request.dto';
import { VerificationResponse } from 'src/modules/verification/dtos/response/verification.response';

export function VerificationUserGetEmailDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get active email verification',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocResponse<VerificationResponse>('verification.getEmail', {
            dto: VerificationResponse,
        })
    );
}

export function VerificationUserGetMobileNumberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get active mobile number verification',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<VerificationResponse>('verification.getMobileNumber', {
            dto: VerificationResponse,
        })
    );
}

export function VerificationUserResendEmailDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'request otp email verification',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocResponse<VerificationResponse>('verification.requestEmail', {
            dto: VerificationResponse,
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function VerificationUserResendMobileNumberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'request otp mobile number verification',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocResponse<VerificationResponse>('verification.requestMobileNumber', {
            dto: VerificationResponse,
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function VerificationUserVerifyEmailDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'verify user email',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: VerificationVerifyRequestDto,
        }),
        DocGuard({ role: true }),
        DocResponse('verification.verifyEmail')
    );
}

export function VerificationUserVerifyMobileNumberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'verify user mobile number',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: VerificationVerifyRequestDto,
        }),
        DocGuard({ role: true }),
        DocResponse('verification.verifyMobileNumber')
    );
}
