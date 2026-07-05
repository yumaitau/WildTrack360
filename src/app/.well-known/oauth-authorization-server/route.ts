import {
  authServerMetadataHandlerClerk,
  metadataCorsOptionsRequestHandler,
} from '@clerk/mcp-tools/next';

// RFC 8414 OAuth authorization server metadata. Not required by the current
// MCP spec (clients use protected-resource discovery), but older clients
// still look here. Must stay publicly accessible.
const handler = authServerMetadataHandlerClerk();
const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
