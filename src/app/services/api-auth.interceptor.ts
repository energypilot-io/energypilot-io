import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http'
import { catchError, from, mergeMap, throwError } from 'rxjs'

export const API_PASSWORD_STORAGE_KEY = 'energypilot-api-password'

let tokenPrompt: Promise<string | null> | undefined

function promptForToken(): Promise<string | null> {
    const storedPassword = sessionStorage.getItem(API_PASSWORD_STORAGE_KEY)
    if (storedPassword) return Promise.resolve(storedPassword)

    tokenPrompt ??= Promise.resolve()
        .then(() => window.prompt('Enter the EnergyPilot password') || null)
        .then(password => {
            if (password) {
                sessionStorage.setItem(API_PASSWORD_STORAGE_KEY, password)
            }
            return password
        })
        .finally(() => {
            tokenPrompt = undefined
        })

    return tokenPrompt
}

export const apiAuthInterceptor: HttpInterceptorFn = (request, next) => {
    if (!request.url.startsWith('/api/v1')) {
        return next(request)
    }

    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        return next(request)
    }

    const password = sessionStorage.getItem(API_PASSWORD_STORAGE_KEY)
    const authenticatedRequest = password
        ? request.clone({ setHeaders: { 'X-API-Password': password } })
        : request

    return next(authenticatedRequest).pipe(
        catchError((error: unknown) => {
            if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
                return throwError(() => error)
            }

            if (
                password &&
                sessionStorage.getItem(API_PASSWORD_STORAGE_KEY) === password
            ) {
                sessionStorage.removeItem(API_PASSWORD_STORAGE_KEY)
            }

            return from(promptForToken()).pipe(
                mergeMap(enteredPassword => {
                    if (!enteredPassword) return throwError(() => error)

                    return next(
                        request.clone({
                            setHeaders: {
                                'X-API-Password': enteredPassword,
                            },
                        })
                    ).pipe(
                        catchError(retryError => {
                            if (
                                retryError instanceof HttpErrorResponse &&
                                retryError.status === 401 &&
                                sessionStorage.getItem(
                                    API_PASSWORD_STORAGE_KEY
                                ) === enteredPassword
                            ) {
                                sessionStorage.removeItem(
                                    API_PASSWORD_STORAGE_KEY
                                )
                            }

                            return throwError(() => retryError)
                        })
                    )
                })
            )
        })
    )
}
