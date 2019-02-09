const { createFilePath } = require('gatsby-source-filesystem');
const fs = require('fs');

const DOCS_DIR = 'docs';

exports.onPreBootstrap = ({ reporter }) => {
  if (!fs.existsSync(DOCS_DIR)) {
    reporter.log(`creating the ${DOCS_DIR} directory`);
    fs.mkdirSync(DOCS_DIR);
  }
};

/*
 * Create a slug for each doc. This allows for the docs to be nested in folders
 * and have the URLs match the folder structure.
 *
 * For example, if a doc is created at `docs/install/quickstart.md`, the slug
 * created for it would be `/install/quickstart/`.
 */
exports.onCreateNode = ({ node, getNode, actions: { createNodeField } }) => {
  if (node.internal.type === 'Mdx') {
    createNodeField({
      node,
      name: 'slug',
      value: createFilePath({ node, getNode })
    });
  }
};

exports.createPages = async ({
  graphql,
  actions: { createPage },
  reporter
}) => {
  const result = await graphql(`
    {
      allFile(filter: { sourceInstanceName: { eq: "docs" } }) {
        edges {
          node {
            childMdx {
              fields {
                slug
              }
            }
          }
        }
      }
    }
  `);

  if (!result.data || !result.data.allFile) {
    reporter.warn(
      'No docs were found in the `docs` directory. Add some Markdown files to add content on your site!'
    );

    const backup = await graphql(`
      {
        mdx(
          fileAbsolutePath: {
            regex: "/.*/gatsby-theme-simple-docs/docs/___no-content-default-page.md/"
          }
        ) {
          fields {
            slug
          }
        }
      }
    `);

    createPage({
      path: '/',
      component: require.resolve('./src/templates/doc.js'),
      context: {
        slug: backup.data.mdx.fields.slug
      }
    });

    // Don’t do anything else since there aren’t more pages.
    return;
  }

  // Convert the response into an array of just the data we need.
  const docs = result.data.allFile.edges.map(({ node }) => node.childMdx);

  // Create a page for each doc.
  docs.forEach(doc => {
    createPage({
      path: doc.fields.slug,
      component: require.resolve('./src/templates/doc.js'),
      context: {
        slug: doc.fields.slug
      }
    });
  });
};
