import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http'
import { catchError, from, mergeMap, throwError } from 'rxjs'

export const API_TOKEN_STORAGE_KEY = 'energypilot-api-token'

let tokenPrompt: Promise<string | null> | undefined

function promptForToken(): Promise<string | null> {
    const storedToken = sessionStorage.getItem(API_TOKEN_STORAGE_KEY)
    if (storedToken) return Promise.resolve(storedToken)

    tokenPrompt ??= Promise.resolve()
        .then(
            () =>
                window.prompt('Enter the EnergyPilot API token')?.trim() || null
        )
        .then(token => {
            if (token) sessionStorage.setItem(API_TOKEN_STORAGE_KEY, token)
            return token
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

    const token = sessionStorage.getItem(API_TOKEN_STORAGE_KEY)
    const authenticatedRequest = token
        ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : request

    return next(authenticatedRequest).pipe(
        catchError((error: unknown) => {
            if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
                return throwError(() => error)
            }

            if (
                token &&
                sessionStorage.getItem(API_TOKEN_STORAGE_KEY) === token
            ) {
                sessionStorage.removeItem(API_TOKEN_STORAGE_KEY)
            }

            return from(promptForToken()).pipe(
                mergeMap(enteredToken => {
                    if (!enteredToken) return throwError(() => error)

                    return next(
                        request.clone({
                            setHeaders: {
                                Authorization: `Bearer ${enteredToken}`,
                            },
                        })
                    ).pipe(
                        catchError(retryError => {
                            if (
                                retryError instanceof HttpErrorResponse &&
                                retryError.status === 401 &&
                                sessionStorage.getItem(
                                    API_TOKEN_STORAGE_KEY
                                ) === enteredToken
                            ) {
                                sessionStorage.removeItem(API_TOKEN_STORAGE_KEY)
                            }

                            return throwError(() => retryError)
                        })
                    )
                })
            )
        })
    )
}
