// #!/usr/bin/env node

import { sizuku } from './cli/index.js'

sizuku().then((result) => {
  if (result?.ok) {
    console.log(result.value)
  } else {
    console.error(result?.error)
  }
})
