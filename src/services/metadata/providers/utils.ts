/**
 * Removes null and undefined values from a GraphQL variables object.
 * This prevents GQL resolvers from erroneously performing null-value lookups.
 */
export function cleanGraphQLVariables<T extends Record<string, any>>(variables: T): Partial<T> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(variables)) {
    if (value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as Partial<T>;
}
