import { useState, type FormEvent } from 'react'
import { login } from '../../services/authService'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const [message, setMessage] = useState('')

  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setSubmitError('')

    const newErrors: {
      email?: string
      password?: string
    } = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      newErrors.password = 'Password is required.'
    }

    setErrors(newErrors)
    setMessage('')

    if (Object.keys(newErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await login({ email: email.trim(), password })
      setPassword('')
      setMessage('You are signed in.')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="mb-6 text-center text-3xl font-bold">
        Login
      </h1>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-lg border border-gray-700 p-6"
      >
        <div>
          <label htmlFor="email" className="mb-2 block">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className="w-full rounded border border-gray-500 bg-gray-800 p-3 text-white"
          />
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className="w-full rounded border border-gray-500 bg-gray-800 p-3 text-white"
          />
          {errors.password && (
            <p id="password-error" role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
              {errors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Login'}
        </button>

        {submitError && (
          <p role="alert" className="text-center text-sm text-red-700 dark:text-red-400">
            {submitError}
          </p>
        )}

        {message && (
          <p role="status" className="text-center text-sm text-yellow-800 dark:text-yellow-300">
            {message}
          </p>
        )}
      </form>
    </div>
  )
}

export default LoginPage
