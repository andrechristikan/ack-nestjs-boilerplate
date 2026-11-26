import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkValidateLinks from 'remark-validate-links';

const remarkConfig = {
    plugins: [remarkFrontmatter, remarkGfm, remarkValidateLinks],
};

export default remarkConfig;
