import { createThemeAction } from 'remix-themes'

import { themeSessionResolver } from '../../lib/sessions.server'

export const action = createThemeAction(themeSessionResolver)
