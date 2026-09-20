import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { faker } from '@faker-js/faker';
import type { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';

/**
 * Swagger path parameter `workspaceId`.
 * @public
 */
export const WorkspaceDocParamsId: ApiParamOptions[] = [
    {
        name: 'workspaceId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

/**
 * Swagger path parameter `slug`.
 * @public
 */
export const WorkspaceDocParamsSlug: ApiParamOptions[] = [
    {
        name: 'slug',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: 'acme-team',
    },
];

/**
 * Swagger path parameter `workspaceMemberId`.
 * @public
 */
export const WorkspaceMemberDocParamsId: ApiParamOptions[] = [
    {
        name: 'workspaceMemberId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

/**
 * Swagger path parameter `workspaceInviteId`.
 * @public
 */
export const WorkspaceInviteDocParamsId: ApiParamOptions[] = [
    {
        name: 'workspaceInviteId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

/**
 * Swagger path parameter `inviteToken`.
 * @public
 */
export const WorkspaceInviteTokenDocParamsId: ApiParamOptions[] = [
    {
        name: 'inviteToken',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.alphanumeric(100),
    },
];

/**
 * Swagger path parameter `workspaceJoinRequestId`.
 * @public
 */
export const WorkspaceJoinRequestDocParamsId: ApiParamOptions[] = [
    {
        name: 'workspaceJoinRequestId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

/**
 * Swagger query parameters of the admin workspace list: `isPublic`.
 * @public
 */
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

/**
 * Swagger query parameters of the workspace member list: `role`.
 * @public
 */
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

/**
 * Swagger query parameters of the workspace invite list: `status`.
 * @public
 */
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

/**
 * Swagger query parameters of the workspace join-request list: `status`.
 * @public
 */
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
