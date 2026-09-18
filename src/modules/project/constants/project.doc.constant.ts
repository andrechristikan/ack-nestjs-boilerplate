import { faker } from '@faker-js/faker';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';

export const ProjectDocParamsId: ApiParamOptions[] = [
    {
        name: 'projectId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

export const ProjectMemberDocParamsId: ApiParamOptions[] = [
    {
        name: 'projectId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
    {
        name: 'projectMemberId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

export const ProjectAdminListDocQueries: ApiQueryOptions[] = [
    {
        name: 'workspaceId',
        required: false,
        type: 'string',
        example: faker.string.uuid(),
    },
];
