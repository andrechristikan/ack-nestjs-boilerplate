import { faker } from '@faker-js/faker';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';

export const ProjectDocParamsId: ApiParamOptions[] = [
    {
        name: 'projectId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const ProjectMemberDocParamsId: ApiParamOptions[] = [
    {
        name: 'projectId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
    {
        name: 'projectMemberId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const ProjectAdminListDocQueries: ApiQueryOptions[] = [
    {
        name: 'workspaceId',
        required: false,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];
