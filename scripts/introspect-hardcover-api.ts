/**
 * Script to introspect the Hardcover GraphQL API schema
 * Run with: npx tsx scripts/introspect-hardcover-api.ts
 */

import { env } from 'process';

const HARDCOVER_API_URL = env.HARDCOVER_API_URL || 'https://api.hardcover.app/v1/graphql';
const HARDCOVER_API_KEY = env.HARDCOVER_API_KEY;

if (!HARDCOVER_API_KEY) {
	console.error('Error: HARDCOVER_API_KEY environment variable is not set');
	process.exit(1);
}

const introspectionQuery = `
  query IntrospectionQuery {
    __schema {
      types {
        name
        kind
        fields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  }
`;

async function introspect() {
	try {
		console.log('Introspecting Hardcover API...\n');

		const response = await fetch(HARDCOVER_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: HARDCOVER_API_KEY.startsWith('Bearer ')
					? HARDCOVER_API_KEY
					: `Bearer ${HARDCOVER_API_KEY}`
			},
			body: JSON.stringify({ query: introspectionQuery })
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const result = await response.json();

		if (result.errors) {
			console.error('GraphQL errors:', JSON.stringify(result.errors, null, 2));
			process.exit(1);
		}

		// Find the 'books' type
		const booksType = result.data.__schema.types.find((type: any) => type.name === 'books');

		if (!booksType) {
			console.error('Could not find "books" type in schema');
			process.exit(1);
		}

		console.log('=== Available fields on "books" type ===\n');

		if (booksType.fields) {
			booksType.fields
				.sort((a: any, b: any) => a.name.localeCompare(b.name))
				.forEach((field: any) => {
					const typeName = field.type.name || field.type.ofType?.name || 'unknown';
					const typeKind = field.type.kind || field.type.ofType?.kind || 'unknown';
					console.log(`  ${field.name}: ${typeName} (${typeKind})`);
				});
		}

		console.log('\n=== Suggested GraphQL query for book details ===\n');
		console.log(`query GetBook($id: Int!) {
  books(where: { id: { _eq: $id } }) {
    id
    title
    description
    image {
      url
    }
    release_date
    pages
    # Add other fields from the list above as needed
  }
}`);
	} catch (error) {
		console.error('Error introspecting API:', error);
		process.exit(1);
	}
}

introspect();

