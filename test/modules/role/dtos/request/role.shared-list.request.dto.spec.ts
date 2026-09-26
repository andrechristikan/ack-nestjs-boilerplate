import { RoleSharedListRequestSchema } from '@modules/role/dtos/request/role.shared-list.request.dto';

describe('RoleSharedListRequestSchema', () => {
    it.each(['workspace', 'project'])('accepts scope=%s', scope => {
        expect(RoleSharedListRequestSchema.parse({ scope })).toEqual({
            scope,
        });
    });

    it.each([
        ['platform scope', { scope: 'platform' }],
        ['a missing scope', {}],
        ['a comma-delimited scope', { scope: 'workspace,project' }],
        ['an unknown scope', { scope: 'tenant' }],
        ['an unknown key', { scope: 'workspace', unknown: 'x' }],
        ['a cursor key', { scope: 'workspace', cursor: 'abc' }],
    ])('rejects %s', (_name, query) => {
        expect(RoleSharedListRequestSchema.safeParse(query).success).toBe(
            false
        );
    });

    it('keeps the page and perPage of the offset pagination kit', () => {
        expect(
            RoleSharedListRequestSchema.parse({
                scope: 'project',
                page: '2',
                perPage: '25',
            })
        ).toEqual({ scope: 'project', page: 2, perPage: 25 });
    });

    it('accepts search and orderBy', () => {
        expect(
            RoleSharedListRequestSchema.parse({
                scope: 'workspace',
                search: 'own',
                orderBy: ['createdAt:desc', 'name:asc'],
            })
        ).toEqual({
            scope: 'workspace',
            search: 'own',
            orderBy: ['createdAt:desc', 'name:asc'],
        });
    });
});
