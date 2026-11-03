import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { ProjectUtil } from '@modules/project/utils/project.util';

describe('ProjectUtil', () => {
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const configGet =
        vi.fn<(key: string) => string | number | RegExp | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let util: ProjectUtil;

    const member: WorkspaceMember = {
        id: '507f1f77bcf86cd799439011',
        workspaceId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439013',
        role: EnumWorkspaceMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number | RegExp> = {
                'project.slugRegex': /^[0-9a-zA-Z-]+$/,
                'project.slugPrefix': 'p-',
                'project.slugMaxLength': 30,
                'project.slugMaxAttempts': 5,
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectUtil,
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
            ],
        }).compile();

        util = module.get(ProjectUtil);
    });

    describe('hasWorkspaceBypass', () => {
        it('returns true when the workspace member role is owner', () => {
            const result = util.hasWorkspaceBypass({
                ...member,
                role: EnumWorkspaceMemberRole.owner,
            });

            expect(result).toBe(true);
        });

        it('returns true when the workspace member role is admin', () => {
            const result = util.hasWorkspaceBypass({
                ...member,
                role: EnumWorkspaceMemberRole.admin,
            });

            expect(result).toBe(true);
        });

        it('returns false when the workspace member role is member', () => {
            const result = util.hasWorkspaceBypass({
                ...member,
                role: EnumWorkspaceMemberRole.member,
            });

            expect(result).toBe(false);
        });
    });

    describe('mapMemberActor', () => {
        it('maps the workspace member to its user id and workspace bypass', () => {
            const result = util.mapMemberActor({
                ...member,
                role: EnumWorkspaceMemberRole.admin,
            });

            expect(result).toEqual({
                userId: '507f1f77bcf86cd799439013',
                hasWorkspaceBypass: true,
            });
        });

        it('maps a plain workspace member to no bypass', () => {
            const result = util.mapMemberActor(member);

            expect(result).toEqual({
                userId: '507f1f77bcf86cd799439013',
                hasWorkspaceBypass: false,
            });
        });
    });

    describe('drawSlugCandidates', () => {
        it('draws slugMaxAttempts candidates from the prefix and max length', () => {
            const candidates = ['p-a', 'p-b', 'p-c', 'p-d', 'p-e'];
            helperStringService.generateSlugCandidates.mockReturnValue(
                candidates
            );

            const result = util.drawSlugCandidates();

            expect(result).toBe(candidates);
            expect(
                helperStringService.generateSlugCandidates
            ).toHaveBeenCalledWith('p-', 30, 5);
        });
    });

    describe('isSlugAllowed', () => {
        it('returns true for a slug within length and matching the pattern', () => {
            expect(util.isSlugAllowed('p-valid-slug')).toBe(true);
        });

        it('returns false for a slug over the max length', () => {
            expect(util.isSlugAllowed('p-'.padEnd(31, 'a'))).toBe(false);
        });

        it('returns false for a slug failing the pattern', () => {
            expect(util.isSlugAllowed('invalid slug!')).toBe(false);
        });
    });
});
