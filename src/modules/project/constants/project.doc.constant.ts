import { faker } from '@faker-js/faker';
import { ApiParamOptions } from '@nestjs/swagger';

export const ProjectDocParamsId: ApiParamOptions[] = [
    {
        name: 'projectId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const ProjectDocParamsMemberId: ApiParamOptions[] = [
    {
        name: 'memberId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const ProjectDocParamsProjectMemberId: ApiParamOptions[] = [
    ...ProjectDocParamsId,
    ...ProjectDocParamsMemberId,
];

export const ProjectDocParamsInviteId: ApiParamOptions[] = [
    ...ProjectDocParamsId,
    {
        name: 'inviteId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];
