import remarkGfm from 'remark-gfm';
import remarkValidateLinks from 'remark-validate-links';

const remarkConfig = {
    plugins: [remarkGfm, remarkValidateLinks],
};

export default remarkConfig;
