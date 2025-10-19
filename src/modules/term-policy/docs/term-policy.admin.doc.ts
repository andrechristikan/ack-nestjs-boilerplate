import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import {
    TermPolicyDocParamsId,
    TermPolicyListAdminDocQuery,
} from '@modules/term-policy/constants/term-policy.doc.constant';
import { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function TermPolicyAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Retrieve list of terms and policies for admin',
        }),
        DocRequest({
            queries: TermPolicyListAdminDocQuery,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({
            policy: true,
            role: true,
        }),
        DocResponsePaging<TermPolicyResponseDto>('termPolicy.list', {
            dto: TermPolicyResponseDto,
        })
    );
}

export function TermPolicyAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Create a new term or policy',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard({
            policy: true,
            role: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyCreateRequestDto,
        }),
        DocResponse<TermPolicyResponseDto>('termPolicy.create', {
            dto: TermPolicyResponseDto,
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function TermPolicyAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Delete a term or policy by ID',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard({
            policy: true,
            role: true,
        }),
        DocRequest({
            params: TermPolicyDocParamsId,
        }),
        DocResponse<TermPolicyResponseDto>('termPolicy.create', {
            dto: TermPolicyResponseDto,
        })
    );
}

export function TermPolicyAdminGenerateContentPresignDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Generate presign url for term or policy content upload',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard({
            policy: true,
            role: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyContentPresignRequestDto,
        }),
        DocResponse<AwsS3PresignDto>('termPolicy.generateContentPresign', {
            dto: AwsS3PresignDto,
        })
    );
}

export function TermPolicyAdminUpdateContentDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Update content of a term or policy by ID',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard({
            policy: true,
            role: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyContentRequestDto,
            params: TermPolicyDocParamsId,
        }),
        DocResponse('termPolicy.updateContent')
    );
}

export function TermPolicyAdminAddContentDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Add content to a term or policy by ID',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard({
            policy: true,
            role: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyContentRequestDto,
            params: TermPolicyDocParamsId,
        }),
        DocResponse('termPolicy.addContent')
    );
}

export function TermPolicyAdminRemoveContentDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Remove content of a term or policy by ID',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard({
            policy: true,
            role: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyRemoveContentRequestDto,
            params: TermPolicyDocParamsId,
        }),
        DocResponse('termPolicy.removeContent')
    );
}

export function TermPolicyAdminPublishDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Publish a term or policy by ID',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard({
            policy: true,
            role: true,
        }),
        DocRequest({
            params: TermPolicyDocParamsId,
        }),
        DocResponse('termPolicy.publish')
    );
}
