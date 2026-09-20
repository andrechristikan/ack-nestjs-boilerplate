import { faker } from '@faker-js/faker';
import type { ApiParamOptions } from '@nestjs/swagger';

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
        example: faker.string.uuid(),
        description: 'Project identifier read by the project guards',
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
        example: faker.string.uuid(),
        description: 'Project identifier read by the project guards',
    },
    {
        name: 'projectMemberId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
        description: 'Project member identifier',
    },
];
