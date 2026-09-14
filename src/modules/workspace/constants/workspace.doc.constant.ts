import { faker } from '@faker-js/faker';
import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';

export const WorkspaceDocParamsId: ApiParamOptions[] = [
    {
        name: 'workspaceId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const WorkspaceDocParamsSlug: ApiParamOptions[] = [
    {
        name: 'slug',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: 'acme-team',
    },
];

export const WorkspaceMemberDocParamsId: ApiParamOptions[] = [
    {
        name: 'workspaceMemberId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const WorkspaceInviteDocParamsId: ApiParamOptions[] = [
    {
        name: 'workspaceInviteId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const WorkspaceInviteTokenDocParamsId: ApiParamOptions[] = [
    {
        name: 'inviteToken',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.alphanumeric(100),
    },
];

export const WorkspaceJoinRequestDocParamsId: ApiParamOptions[] = [
    {
        name: 'workspaceJoinRequestId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const WorkspaceDocQueryList: ApiQueryOptions[] = [
    {
        name: 'isPublic',
        allowEmptyValue: true,
        required: false,
        type: 'boolean',
        example: true,
        description:
            'Filter by public visibility. Omit to return both public and private workspaces',
    },
];

export const WorkspaceMemberDocQueryList: ApiQueryOptions[] = [
    {
        name: 'role',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(EnumWorkspaceMemberRole).join(','),
        description: "value with ',' delimiter",
    },
];

export const WorkspaceInviteDocQueryList: ApiQueryOptions[] = [
    {
        name: 'status',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(EnumWorkspaceInviteStatus).join(','),
        description: "value with ',' delimiter",
    },
];

export const WorkspaceJoinRequestDocQueryList: ApiQueryOptions[] = [
    {
        name: 'status',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(EnumWorkspaceJoinRequestStatus).join(','),
        description: "value with ',' delimiter",
    },
];
