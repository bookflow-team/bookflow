export type RegistrationRole = 'CUSTOMER' | 'BUSINESS_OWNER'

type LoginInput = {
  email: string
  password: string
}

type Account = {
  id: string
  email: string
  role: RegistrationRole | 'ADMIN'
}

async function submitAuth(
  action: 'login' | 'register',
  input: LoginInput | (LoginInput & { role: RegistrationRole }),
): Promise<void> {
  const response = await fetch(`/api/v1/auth/${action}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).catch(() => {
    throw new Error('Could not connect to BookFlow. Please try again.')
  })

  if (action === 'login' && response.status === 401) {
    throw new Error('Incorrect email or password.')
  }

  const body: { data?: Account; error?: { message?: string } } | null =
    await response.json().catch(() => null)

  if (!response.ok || !body?.data?.id) {
    const fallback = action === 'login' ? 'Sign-in failed.' : 'Registration failed.'
    const message = body?.error?.message
    throw new Error(
      response.status < 500 && typeof message === 'string' && message.trim()
        ? message
        : `${fallback} Please try again.`,
    )
  }
}

export function login(input: LoginInput) {
  return submitAuth('login', input)
}

export function register(input: LoginInput & { role: RegistrationRole }) {
  return submitAuth('register', input)
}
