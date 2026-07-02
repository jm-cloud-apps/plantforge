// Build metadata baked in at build time by vite.config.js (`define`). Handy for
// confirming the browser is running fresh code and not a stale PWA/cached bundle.
export const BUILD = {
  version: __APP_VERSION__,
  commit: __COMMIT__,
  commitTime: __COMMIT_TIME__, // ISO commit date (empty when git isn't available)
  buildTime: __BUILD_TIME__, // ISO time the bundle was built
}

// Short human label like "a1b2c3d · Jul 1, 2026, 2:32 PM". Prefers the commit
// date, falling back to the build time if git info wasn't available.
export function buildStamp() {
  const iso = BUILD.commitTime || BUILD.buildTime
  const d = iso ? new Date(iso) : null
  const when =
    d && !Number.isNaN(d.getTime())
      ? d.toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : ''
  return { commit: BUILD.commit, when }
}
