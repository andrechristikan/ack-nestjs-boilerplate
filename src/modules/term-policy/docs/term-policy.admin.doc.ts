import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { TermPolicyGetResponseDto } from '@modules/term-policy/dtos/response/term-policy.get.response.dto';
import { TermPolicyCreateRequestDto } from '../dtos/request/term-policy.create.request.dto';
import { TermPolicyUploadDocumentRequestDto } from '../dtos/request/term-policy.upload-document.request';
import { TermPolicyUpdateDocumentRequestDto } from '../dtos/request/term-policy.update-document.request';
import { AwsS3PresignResponseDto } from '@modules/aws/dtos/response/aws.s3-presign.response.dto';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { applyDecorators } from '@nestjs/common';

export function TermPolicyAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create new term-policy',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyCreateRequestDto,
        }),
        DocResponse<TermPolicyGetResponseDto>('termPolicy.create', {
            dto: TermPolicyGetResponseDto,
        })
    );
}

export function TermPolicyAdminUploadDocumentDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'upload document for term-policy',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyUploadDocumentRequestDto,
        }),
        DocResponse<AwsS3PresignResponseDto>('termPolicy.uploadDocument', {
            dto: AwsS3PresignResponseDto,
        })
    );
}

export function TermPolicyAdminUpdateDocumentDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update document for term-policy',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyUpdateDocumentRequestDto,
        }),
        DocResponse<TermPolicyGetResponseDto>('termPolicy.updateDocument', {
            dto: TermPolicyGetResponseDto,
        })
    );
}
