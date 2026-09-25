export function isLocalDevelopment(hostname = '') {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

function currentRedirectUrl(location) {
  return `${location.origin}${location.pathname}${location.search}${location.hash}`
}

export async function initializeLineSession({
  liffId,
  location = window.location,
  liffClient
} = {}) {
  if (isLocalDevelopment(location.hostname)) {
    return { status: 'local', inClient: false, profile: null }
  }

  if (!liffId) {
    return { status: 'unconfigured', inClient: false, profile: null }
  }

  const client = liffClient ?? (await import('@line/liff')).default
  await client.init({ liffId })

  const inClient = client.isInClient()
  if (!client.isLoggedIn()) {
    if (!inClient) {
      client.login({ redirectUri: currentRedirectUrl(location) })
      return { status: 'redirecting', inClient, profile: null }
    }
    return { status: 'unauthenticated', inClient, profile: null }
  }

  const profile = await client.getProfile()
  return {
    status: 'authenticated',
    inClient,
    idToken: client.getIDToken(),
    profile: {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl || ''
    }
  }
}
