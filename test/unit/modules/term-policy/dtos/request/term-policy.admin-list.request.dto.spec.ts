import { TermPolicyDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyAdminListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.admin-list.request.dto';

describe('TermPolicyAdminListRequestSchema', () => {
    it('parses a payload into exactly the declared fields', () => {
        const payload = {
            page: 1,
            perPage: 20,
            orderBy: 'version:desc',
            type: 'privacy',
            status: 'draft',
        };

        const result = TermPolicyAdminListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty payload with every field optional', () => {
        const result = TermPolicyAdminListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces page and perPage to numbers', () => {
        const result = TermPolicyAdminListRequestSchema.parse({
            page: '2',
            perPage: '10',
        });

        expect(result).toEqual({ page: 2, perPage: 10 });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            TermPolicyAdminListRequestSchema.parse({ search: 'x' })
        ).toThrow();
    });

    it('keeps the module orderBy description', () => {
        expect(
            TermPolicyAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(TermPolicyDefaultAvailableOrderBy.join(', '));
    });
});
