export const AUTHORIZATION_BOUNDARY_VERSION = 1;

export function createAuthorizedRepository({ getSession, query }) {
  if (typeof getSession !== 'function' || typeof query !== 'function') throw new Error('Authorized repositories require getSession and query functions.');
  return {
    async retrieve(request) {
      const session = await getSession();
      if (!session?.user?.id) throw new Error('Authentication required.');
      if (!request.organizationId || !request.projectId || !request.objectType) throw new Error('Retrieval requires explicit organization, project, and object scope.');
      // The query implementation must use the authenticated client. The browser never receives
      // a service-role credential and must rely on server authorization/RLS for the final decision.
      return query({ ...request, authenticatedUserId: session.user.id });
    },
  };
}
