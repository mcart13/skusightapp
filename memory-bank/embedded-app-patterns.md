# Embedded App Patterns: SKU Sight

## Overview

SKU Sight is designed as an embedded Shopify app, which means it runs within the Shopify Admin interface rather than as a standalone application. This embedded architecture provides a seamless experience for merchants but requires specific patterns and considerations for development.

As Shopify states in their [documentation](https://shopify.dev/docs/apps/tools/app-bridge): "For embedded apps, App Bridge is essential. It handles communication between your app and the Shopify Admin, including things like navigation, modals, and authentication. Any component that interacts with Shopify's Admin or relies on Shopify-specific functionality should use App Bridge."

## App Bridge Integration

### Core Concepts

1. **App Bridge Provider**
   - Wraps the entire application
   - Establishes connection with Shopify Admin
   - Provides context for all App Bridge utilities
   - Handles authentication and session management
   - [Documentation](https://shopify.dev/docs/api/app-bridge-react/components/provider)

2. **Navigation**
   - All navigation must use App Bridge navigation utilities
   - Direct links (`<a>` tags) break the embedded context
   - Navigation state is synchronized with Shopify Admin
   - Browser history is managed by App Bridge
   - [Documentation](https://shopify.dev/docs/api/app-bridge-react/components/navigation)

3. **UI Components**
   - Modal dialogs must use [App Bridge Modal](https://shopify.dev/docs/api/app-bridge-react/components/modal)
   - Toasts and notifications should use [App Bridge Toast](https://shopify.dev/docs/api/app-bridge-react/components/toast)
   - Loading indicators should use [App Bridge Loading](https://shopify.dev/docs/api/app-bridge-react/components/loading)
   - Confirmation dialogs should use [App Bridge Confirm](https://shopify.dev/docs/api/app-bridge-react/components/confirm)

4. **Authentication**
   - OAuth flow is managed through App Bridge
   - Session tokens are securely handled
   - Re-authentication is handled automatically when needed
   - Permissions and scopes are enforced
   - [Documentation](https://shopify.dev/docs/apps/auth/oauth)

### Implementation Patterns

```jsx
// App Bridge Provider setup
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';

function MyApp() {
  const config = {
    apiKey: API_KEY,
    host: host,
    forceRedirect: true
  };

  return (
    <AppBridgeProvider config={config}>
      <App />
    </AppBridgeProvider>
  );
}
```

```jsx
// Navigation example
import { useNavigate } from "@shopify/app-bridge-react";

function MyComponent() {
  const navigate = useNavigate();
  
  const handleClick = () => {
    // Use this instead of <a> tags or window.location
    navigate("/settings");
  };
  
  return (
    <Button onClick={handleClick}>Go to Settings</Button>
  );
}
```

```jsx
// Modal example
import { Modal } from '@shopify/app-bridge/actions';

function showModal() {
  const modal = Modal.create(app, {
    title: 'Product Details',
    message: 'View and edit product information',
    primaryAction: {
      content: 'Save',
      onAction: () => handleSave(),
    },
    secondaryActions: [
      {
        content: 'Cancel',
        onAction: () => modal.dispatch(Modal.Action.CLOSE),
      },
    ],
  });
  
  modal.dispatch(Modal.Action.OPEN);
}
```

## Navigation Patterns

### Best Practices

1. **Always use App Bridge navigation**
   - Use [`useNavigate`](https://shopify.dev/docs/api/app-bridge-react/hooks/usenavigator) hook from App Bridge React
   - Never use direct `<a>` tags or `window.location`
   - For Remix, use the App Bridge-compatible [Link component](https://shopify.dev/docs/api/shopify-app-remix/unstable/components/link)

2. **Handle deep linking**
   - Support direct URL access to app sections
   - Preserve state in URL parameters when appropriate
   - Handle navigation history properly

3. **Manage navigation state**
   - Synchronize app state with URL
   - Handle back/forward browser navigation
   - Preserve form data during navigation when appropriate

### Common Patterns

```jsx
// Redirect pattern
import { redirect } from "@shopify/remix-oxygen";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  
  // Use this redirect helper, not the one from @remix-run/node
  return redirect("/app/dashboard");
}
```

```jsx
// Form submission pattern
import { useSubmit, Form } from "@remix-run/react";

function MyForm() {
  const submit = useSubmit();
  
  // Use <Form> from Remix, not lowercase <form>
  return (
    <Form method="post" onSubmit={(e) => {
      // Custom handling if needed
      submit(e.currentTarget);
    }}>
      {/* Form fields */}
      <button type="submit">Save</button>
    </Form>
  );
}
```

## Modal and UI Element Integration

### Modal Patterns

1. **Confirmation Dialogs**
   - Use for destructive actions
   - Provide clear messaging
   - Offer cancel option
   - Handle focus management

2. **Form Modals**
   - Keep forms concise
   - Validate input before submission
   - Provide clear error messages
   - Handle loading states

3. **Information Modals**
   - Use for additional details
   - Keep content focused
   - Provide clear dismissal option
   - Consider alternative UI patterns for simple information

### Toast Notifications

1. **Success Messages**
   - Confirm action completion
   - Keep messages brief
   - Auto-dismiss after appropriate time
   - Provide action link when relevant

2. **Error Messages**
   - Clearly explain what went wrong
   - Offer recovery actions when possible
   - Don't auto-dismiss critical errors
   - Log details for troubleshooting

### Loading States

1. **Page Loading**
   - Use App Bridge Loading for full-page loads
   - Show progress indicator for long operations
   - Maintain UI responsiveness during loading
   - Provide cancel option for lengthy operations

2. **Component Loading**
   - Use skeleton loaders for content areas
   - Maintain layout stability during loading
   - Avoid multiple spinners in the same view
   - Provide feedback for operations over 1 second

## Authentication Flow

### OAuth Process

1. **Initial Authentication**
   - Merchant installs app from Shopify App Store
   - OAuth flow redirects to app's auth endpoint
   - App requests necessary scopes
   - Shopify provides access token
   - [OAuth Documentation](https://shopify.dev/docs/apps/auth/oauth)

2. **Session Management**
   - Store session in database
   - Associate session with shop
   - Implement session refresh mechanism
   - Handle session expiration gracefully

3. **Token Handling**
   - Securely store access tokens
   - Never expose tokens to client
   - Refresh tokens when needed
   - Implement proper token rotation

### Security Considerations

1. **CSRF Protection**
   - Implement CSRF tokens for forms
   - Validate state parameter in OAuth flow
   - Use secure cookies with appropriate flags
   - Implement proper session validation
   - [Security Considerations](https://shopify.dev/docs/apps/auth/oauth/security-considerations)

2. **Scope Management**
   - Request only necessary scopes
   - Document required scopes
   - Handle scope changes during updates
   - Implement graceful degradation for missing scopes

## Common Pitfalls and Solutions

### Navigation Issues

1. **Broken Session in iFrame**
   - **Problem**: Direct links break the session in embedded apps
   - **Solution**: Always use [App Bridge navigation utilities](https://shopify.dev/docs/api/app-bridge-react/components/navigation)

2. **History Management**
   - **Problem**: Browser back button doesn't work as expected
   - **Solution**: Use App Bridge history management

3. **Deep Linking**
   - **Problem**: Direct URL access fails
   - **Solution**: Implement proper authentication checks and redirects

### UI Integration Issues

1. **Modal Stacking**
   - **Problem**: Multiple modals create poor UX
   - **Solution**: Manage modal state carefully, avoid stacking

2. **Toast Overload**
   - **Problem**: Too many notifications overwhelm users
   - **Solution**: Consolidate related messages, prioritize important ones

3. **Focus Management**
   - **Problem**: Keyboard focus lost after modal closes
   - **Solution**: Implement proper focus management with App Bridge

### Authentication Issues

1. **Session Timeout**
   - **Problem**: User session expires during use
   - **Solution**: Implement silent refresh, graceful re-authentication

2. **Scope Changes**
   - **Problem**: App updates require new scopes
   - **Solution**: Implement scope verification, guide users through re-authorization

3. **Cross-Origin Issues**
   - **Problem**: API calls fail due to CORS
   - **Solution**: Proxy requests through backend, use App Bridge fetch utilities

## Testing Embedded Apps

### Local Development

1. **Shopify CLI**
   - Use `shopify app dev` for local development
   - Test with development store
   - Verify embedded behavior in Shopify Admin
   - Test webhook handling
   - [Shopify CLI Documentation](https://shopify.dev/docs/apps/tools/cli)

2. **Tunnel Testing**
   - Use Shopify CLI tunnel for external access
   - Test on multiple devices
   - Verify performance over tunnel
   - Test with various network conditions

### Component Testing

1. **App Bridge Mocking**
   - Mock App Bridge context for component tests
   - Test navigation behavior
   - Verify modal and toast interactions
   - Test authentication flows

2. **Integration Testing**
   - Test full user journeys
   - Verify data persistence
   - Test error handling
   - Validate performance metrics

## Performance Considerations

### Initial Load

1. **Bundle Size**
   - Minimize JavaScript bundle size
   - Implement code splitting
   - Lazy load non-critical components
   - Optimize dependencies
   - [Performance Best Practices](https://shopify.dev/docs/apps/best-practices/performance)

2. **Rendering Strategy**
   - Use server-side rendering for initial content
   - Hydrate client-side for interactivity
   - Implement progressive enhancement
   - Prioritize above-the-fold content

### Ongoing Performance

1. **API Efficiency**
   - Batch API requests when possible
   - Implement caching for frequent data
   - Use GraphQL to minimize data transfer
   - Monitor API rate limits

2. **UI Responsiveness**
   - Optimize render performance
   - Avoid layout thrashing
   - Implement virtualization for long lists
   - Debounce frequent events

## Versioning and Updates

### App Bridge Versioning

1. **Version Management**
   - Track App Bridge version dependencies
   - Test with new versions before upgrading
   - Document breaking changes
   - Implement graceful degradation for unsupported features

2. **Update Strategy**
   - Plan regular updates to stay current
   - Test thoroughly before deploying updates
   - Implement feature flags for new functionality
   - Provide fallbacks for deprecated features

### Shopify Admin Changes

1. **Monitoring Changes**
   - Stay informed about Shopify Admin updates
   - Test app with beta versions when possible
   - Subscribe to developer newsletters
   - Participate in developer preview programs

2. **Adaptation Strategy**
   - Quickly address breaking changes
   - Implement temporary workarounds when needed
   - Communicate changes to users
   - Maintain backward compatibility when possible
