import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ProjectDocParamsId } from '@modules/project/constants/project.doc.constant';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectAccessResponseDto } from '@modules/project/dtos/response/project.access.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function ProjectSharedCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create project for current user',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: ProjectCreateRequestDto,
        }),
        DocResponse<DatabaseIdDto>('project.create', {
            httpStatus: HttpStatus.CREATED,
            dto: DatabaseIdDto,
        })
    );
}

export function ProjectSharedListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list projects accessible by current user',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponsePaging<ProjectAccessResponseDto>('project.shared.list', {
            dto: ProjectAccessResponseDto,
            type: EnumPaginationType.offset,
        })
    );
}

export function ProjectSharedGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get accessible project detail',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            params: ProjectDocParamsId,
        }),
        DocResponse<ProjectResponseDto>('project.shared.get', {
            dto: ProjectResponseDto,
        })
    );
}
