# Example prompts for OpenHands agent

## Code Generation Examples

"Create a new React component for the product listing page in next_app/components/ProductListing.tsx with proper TypeScript types, error handling, and integration with the Firebase backend."

"Refactor the authentication service in functions/services/auth.ts to use modern async/await patterns and add comprehensive error handling with custom error types."

## Testing Examples

"Run the playwright smoke tests in scripts/smoke-test.spec.ts, analyze any failures, and provide a detailed report of what broke and why."

"Execute all unit tests in next_app/tests and generate a coverage report showing which code paths are not tested."

## Bug Fixing Examples

"Debug the failing authentication flow E2E test in scripts/auth-flow.e2e.spec.ts. Analyze the test output, identify the root cause, and implement a fix."

"Investigate the CSP (Content Security Policy) issues in the Firebase deployment and fix the security headers in next.config.mjs."

## Deployment Examples

"Deploy the Next.js app to Firebase hosting using: npm run build && firebase deploy --only hosting"

"Update all environment variables for the production deployment and verify Firebase configuration is correct."

## Documentation Examples

"Generate API documentation for all endpoints in functions/routes and create a comprehensive README."

"Create a deployment runbook documenting all steps required to deploy this project to production."

## Database Examples

"Analyze the Firestore schema in firestore.rules and suggest optimizations for the current data access patterns."

"Create database migration scripts to update the schema without losing existing data."

## Performance Examples

"Profile the Next.js app build performance and identify bottlenecks in next_app/next.config.mjs."

"Optimize the bundle size by analyzing unused dependencies and suggesting tree-shaking improvements."
