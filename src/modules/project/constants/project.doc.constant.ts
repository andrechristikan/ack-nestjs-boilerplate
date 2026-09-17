import { faker } from '@faker-js/faker';
import type { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';

/**
 * Swagger path parameter `projectId`.
 * @public
 */
export const ProjectDocParamsId: ApiParamOptions[] = [
    {
        name: 'projectId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

/**
 * Swagger path parameters `projectId` and `projectMemberId`.
 * @public
 */
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

/**
 * Swagger query parameters of the admin project list: `workspaceId`.
 * @public
 */
export const ProjectAdminListDocQueries: ApiQueryOptions[] = [
    {
        name: 'workspaceId',
        required: false,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];
