export type ConnectionIssueKind = 'offline' | 'cors' | 'backend' | 'unknown';

export interface ConnectionIssue {
  kind: ConnectionIssueKind;
  label: string;
  message: string;
}

function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export function classifyConnectionIssue(apiUrl: string): ConnectionIssue {
  const backendOrigin = getOrigin(apiUrl);
  const frontendOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!online) {
    return {
      kind: 'offline',
      label: 'Offline',
      message: 'Your device is offline. Reconnect to the internet and try again.'
    };
  }

  if (frontendOrigin && backendOrigin !== frontendOrigin) {
    return {
      kind: 'cors',
      label: 'CORS / Blocked',
      message: `The browser blocked the request between ${frontendOrigin} and ${backendOrigin}. Check the backend CORS allowlist and verify the API is reachable.`
    };
  }

  return {
    kind: 'backend',
    label: 'Backend Down',
    message: `Cannot reach the backend at ${backendOrigin}. Check that the server is running and the API URL is correct.`
  };
}