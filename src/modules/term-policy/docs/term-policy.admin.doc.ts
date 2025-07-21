import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { applyDecorators } from '@nestjs/common';
import {
    TermPolicyDocParamsId,
    TermPolicyListDocQuery,
} from '@modules/term-policy/constants/term-policy.doc.constant';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { TermPolicyUploadDocumentRequestDto } from '@modules/term-policy/dtos/request/term-policy.upload-document.request';
import { AwsS3PresignResponseDto } from '@modules/aws/dtos/response/aws.s3-presign.response.dto';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { DatabaseIdResponseDto } from '@common/database/dtos/response/database.id.response.dto';
import { TermPolicyUpdateDocumentRequestDto } from '@modules/term-policy/dtos/request/term-policy.update-document.request';

export function TermPolicyAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Retrieve list of terms and policies',
        }),
        DocRequest({
            queries: TermPolicyListDocQuery,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({
            policy: true,
            role: true,
        }),
        DocResponse<TermPolicyResponseDto>('termPolicy.list', {
            dto: TermPolicyResponseDto,
        })
    );
}

export function TermPolicyAdminUploadDocumentDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'upload document for term-policy using presigned URL',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({
            policy: true,
            role: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyUploadDocumentRequestDto,
        }),
        DocResponse<AwsS3PresignResponseDto>('termPolicy.updateDocument', {
            dto: AwsS3PresignResponseDto,
        })
    );
}

export function TermPolicyAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create new term-policy',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({
            policy: true,
            role: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyCreateRequestDto,
        }),
        DocResponse<DatabaseIdResponseDto>('termPolicy.create', {
            dto: DatabaseIdResponseDto,
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
        DocGuard({
            policy: true,
            role: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyUpdateDocumentRequestDto,
            params: [TermPolicyDocParamsId],
        }),
        DocResponse('termPolicy.updateDocument')
    );
}

export function TermPolicyAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete term-policy only if it is in draft status',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({
            policy: true,
            role: true,
        }),
        DocRequest({
            params: [TermPolicyDocParamsId],
        }),
        DocResponse('termPolicy.deleteDocument')
    );
}
