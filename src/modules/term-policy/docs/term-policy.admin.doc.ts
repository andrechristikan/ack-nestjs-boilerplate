import {
    AwsS3PresignResponseDto,
    AwsS3PresignResponseSchema,
} from '@common/aws/dtos/response/aws.s3-presign.response.dto';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    TermPolicyDocParamsGetContent,
    TermPolicyDocParamsId,
    TermPolicyListAdminDocQuery,
} from '@modules/term-policy/constants/term-policy.doc.constant';
import { TermPolicyDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';
import {
    TermPolicyResponseDto,
    TermPolicyResponseSchema,
} from '@modules/term-policy/dtos/response/term-policy.response.dto';
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
            termPolicy: true,
        }),
        DocResponsePaging<TermPolicyResponseDto>('termPolicy.list', {
            schema: TermPolicyResponseSchema,
            availableOrderBy: TermPolicyDefaultAvailableOrderBy,
            type: EnumPaginationType.offset,
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
            termPolicy: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocResponse<TermPolicyResponseDto>('termPolicy.create', {
            schema: TermPolicyResponseSchema,
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
            termPolicy: true,
        }),
        DocRequest({
            params: TermPolicyDocParamsId,
        }),
        DocResponse<TermPolicyResponseDto>('termPolicy.create', {
            schema: TermPolicyResponseSchema,
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
            termPolicy: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocResponse<AwsS3PresignResponseDto>(
            'termPolicy.generateContentPresign',
            {
                schema: AwsS3PresignResponseSchema,
            }
        )
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
            termPolicy: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
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
            termPolicy: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
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
            termPolicy: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            params: TermPolicyDocParamsId,
        }),
        DocResponse('termPolicy.removeContent')
    );
}

export function TermPolicyAdminGetContentDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get content of a term or policy by ID and language',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard({
            policy: true,
            role: true,
            termPolicy: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            params: TermPolicyDocParamsGetContent,
        }),
        DocResponse('termPolicy.getContent', {
            schema: AwsS3PresignResponseSchema,
        })
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
            termPolicy: true,
        }),
        DocRequest({
            params: TermPolicyDocParamsId,
        }),
        DocResponse('termPolicy.publish')
    );
}
