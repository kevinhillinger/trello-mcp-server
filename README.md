# Trello MCP Server

A Model Context Protocol (MCP) server that provides comprehensive Trello integration for AI assistants and applications. This server enables MCP clients to interact with Trello boards, cards, lists, and more through a standardized interface.

## Features

### Search & Discovery
- **Universal Search**: Search across all Trello content (boards, cards, members, organizations)
- **User Boards**: Get all boards accessible to the current user
- **Board Details**: Retrieve detailed information about boards including lists and cards

### Card Management
- **Create Cards**: Add new cards to any list with descriptions, due dates, and assignments
- **Update Cards**: Modify card properties like name, description, due dates, and status
- **Move Cards**: Transfer cards between lists to update workflow status
- **Get Card Details**: Fetch comprehensive card information including members, labels, and checklists

### Collaboration
- **Add Comments**: Post comments on cards for team communication
- **Member Management**: View board members and member details
- **Activity History**: Track card actions and changes

### Organization
- **List Management**: Create new lists and get cards within specific lists
- **Labels**: View and manage board labels for categorization
- **Checklists**: Access card checklists and checklist items
- **Attachments**: Upload, download, and manage card attachments with MCP resource support

## Installation

### Prerequisites
- Node.js 18+ installed
- An MCP-compatible client (Claude Desktop, Claude Code, or other MCP clients)
- Trello account with API credentials

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/semblancelabs/trello-mcp-server.git
   cd trello-mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Get Trello API credentials**
   - Visit https://trello.com/app-key
   - Copy your API Key
   - Generate a Token (never expires, read/write access)

5. **Configure your MCP client**

   Add the Trello MCP server to your client's configuration. Example configuration:
   ```json
   {
     "mcpServers": {
       "trello": {
         "command": "node",
         "args": ["/absolute/path/to/trello-mcp-server/dist/index.js"],
         "env": {
           "TRELLO_API_KEY": "your-api-key-here",
           "TRELLO_TOKEN": "your-token-here"
         }
       }
     }
   }
   ```

6. **Restart your MCP client**

## Available Tools

The MCP server provides 35 tools organized by category:

### Search
- `search` - Universal search across all Trello content (boards, cards, members, organizations)

### Boards
- `listBoards` - List all boards accessible to the user
- `getBoardDetails` - Get detailed board information with lists and cards
- `getLists` - Get all lists in a board

### Cards
- `createCard` - Create a new card in a list
- `getCard` - Get detailed card information
- `updateCard` - Update card properties (name, description, due date, etc.)
- `moveCard` - Move a card to a different list
- `archiveCard` - Archive or unarchive a card
- `deleteCard` - Permanently delete a card

### Checklists
- `createChecklistOnCard` - Create a new checklist on a card
- `updateCheckItem` - Update a checklist item (mark complete/incomplete, rename)
- `deleteCheckItem` - Delete a checklist item
- `getCardChecklists` - Get all checklists and items for a card

### Attachments
- `addAttachmentToCard` - Add a URL or file attachment to a card
- `deleteAttachmentFromCard` - Remove an attachment from a card
- `getAttachmentsOnCard` - Get all attachments for a card
- `getAttachmentOnCard` - Get a specific attachment
- `downloadFileAttachment` - Download an attachment file to local path

### Labels
- `createLabel` - Create a new label on a board
- `getLabel` - Get label details
- `updateLabel` - Update label name or color
- `deleteLabel` - Delete a label from a board
- `updateLabelField` - Update a specific label field
- `getBoardLabels` - Get all labels on a board
- `addLabelToCard` - Add a label to a card
- `removeLabelFromCard` - Remove a label from a card

### Members
- `getUserBoards` - Get all boards accessible to the current user
- `getMember` - Get member profile and boards
- `getBoardMembers` - Get all members on a board
- `addMemberToCard` - Assign a member to a card
- `removeMemberFromCard` - Remove a member from a card

### Lists & Comments
- `createList` - Create a new list on a board
- `getListCards` - Get all cards in a specific list
- `addComment` - Add a comment to a card
- `getCardActions` - Get activity history and comments for a card

### Board Queries
- `getBoardCards` - Get all cards from a board with filtering

## MCP Resources

The server exposes Trello card attachments as MCP resources using the `trello://` URI scheme. This allows MCP clients to access file attachments directly.

### Resource URI Format

```
trello://cards/{cardId}/attachments/{attachmentId}/download/{fileName}
```

### How It Works

1. **Get Attachments**: Use `getAttachmentsOnCard` to list attachments on a card. File attachments (where `isUpload=true`) include a `trello://` resource URI in the `url` field.

2. **Access Resources**: MCP clients can read the resource URI directly to access file metadata and trigger downloads.

3. **Download Files**: Use `downloadFileAttachment` with the resource URI to download the file to a local path.

### Example Workflow

```
1. Call getAttachmentsOnCard for card "abc123"
2. Response includes: { "url": "trello://cards/abc123/attachments/xyz789/download/document.pdf", "isUpload": true }
3. Call downloadFileAttachment with resourceUri and desired filePath
4. File is downloaded and saved locally
```

### Resource Features

- **On-Demand Download**: Files are only downloaded when explicitly requested
- **Large File Support**: Streams files efficiently without loading entirely into memory
- **Authenticated Access**: Uses your Trello credentials automatically

## Usage Examples

Once configured, you can use natural language to interact with Trello:

```
"Show me all my Trello boards"
"Create a new card called 'Update documentation' in the To Do list"
"Move card X from In Progress to Done"
"Add a comment to card Y saying 'This is ready for review'"
"Search for all cards with 'bug' in the title"
"Show me all cards assigned to me"
```

## Architecture

### MCP Protocol
The server implements the Model Context Protocol (MCP), which provides:
- Standardized tool discovery and invocation
- Type-safe parameter validation
- Structured error handling
- Automatic credential management

### Security
- API credentials are stored in your MCP client's configuration
- No credentials are transmitted over the network except to Trello's API
- All Trello API calls use HTTPS
- Rate limiting is respected with automatic retry logic

### Technical Stack
- TypeScript for type safety
- MCP SDK for protocol implementation
- Zod for schema validation
- Fetch API for HTTP requests

## Development

### Building from Source
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run type checking
npm run type-check
```

### Testing
The server includes comprehensive error handling and validation. Test your setup by:
1. Checking your MCP client's connection status
2. Running a simple command like "Show me my Trello boards"
3. Verifying the response includes your board data

## Troubleshooting

### Common Issues

1. **"No Trello tools available"**
   - Ensure your MCP client is fully restarted after configuration
   - Check that the path in config points to `dist/index.js`
   - Verify the file exists and is built

2. **"Invalid credentials"**
   - Double-check your API key and token
   - Ensure token has read/write permissions
   - Regenerate token if needed

3. **"Rate limit exceeded"**
   - The server includes automatic retry logic
   - Wait a few minutes if you hit limits
   - Consider reducing request frequency

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/anthropics/mcp)
- Uses the [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/)
