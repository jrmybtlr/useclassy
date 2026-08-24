import type { RouterConfig } from '@nuxt/schema'

export default {
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          resolve({
            el: to.hash,
            top: 80,
            behavior: 'smooth',
          })
        })
      })
    }
    return { top: 0 }
  },
} satisfies RouterConfig
