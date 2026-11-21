import { useState, type FormEvent } from 'react'

type RegistrationRole = 'CUSTOMER' | 'BUSINESS_OWNER'

type FormErrors = {
  email?: string
  password?: string
  confirmPassword?: string
}

function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<RegistrationRole>('CUSTOMER')
  const [errors, setErrors] = useState<FormErrors>({})
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const newErrors: FormErrors = {}
    setMessage('')

    if (!email.trim()) {
      newErrors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      newErrors.password = 'Password is required.'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    // Sprint 2: Send this payload to POST /auth/register.
    // const registrationData = {
    //   email: email.trim(),
    //   password,
    //   role
    // }

    setMessage(
      'Registration is not available yet. Backend integration is planned for Sprint 2.'
    )
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="mb-8 text-center text-3xl font-bold">
        Create an account
      </h1>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-lg border border-gray-700 p-6"
      >
        <div>
          <label htmlFor="register-email" className="mb-2 block">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className="w-full rounded border border-gray-500 bg-slate-800 p-3 text-white"
          />
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="register-password" className="mb-2 block">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className="w-full rounded border border-gray-500 bg-slate-800 p-3 text-white"
          />
          {errors.password && (
            <p id="password-error" role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
              {errors.password}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-2 block">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword ? 'confirm-password-error' : undefined
            }
            className="w-full rounded border border-gray-500 bg-slate-800 p-3 text-white"
          />
          {errors.confirmPassword && (
            <p
              id="confirm-password-error"
              role="alert"
              className="mt-1 text-sm text-red-700 dark:text-red-400"
            >
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="register-role" className="mb-2 block">
            Account type
          </label>
          <select
            id="register-role"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as RegistrationRole)
            }
            className="w-full rounded border border-gray-500 bg-slate-800 p-3 text-white"
          >
            <option value="CUSTOMER">Customer</option>
            <option value="BUSINESS_OWNER">Business Owner</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full rounded bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700"
        >
          Register
        </button>

        {message && (
          <p role="status" className="text-center text-sm text-blue-700 dark:text-blue-300">
            {message}
          </p>
        )}
      </form>
    </div>
  )
}

export default RegisterPage
