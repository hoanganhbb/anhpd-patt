'use client'

import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { useServerInsertedHTML } from 'next/navigation'
import { useState, type ReactNode } from 'react'

// Without this, Emotion streams <style> tags inline in <body> during SSR and moves them to
// <head> on the client, so the DOM hydrates against a different tree (hydration mismatch).
// Collect the rules instead and emit them in <head> via useServerInsertedHTML.
export function EmotionRegistry({ children }: { children: ReactNode }) {
  const [registry] = useState(() => {
    const cache = createCache({ key: 'css' })
    // Compat mode makes Global and css styles go through insert() instead of inline tags.
    cache.compat = true
    const insert = cache.insert
    let inserted: { name: string; isGlobal: boolean }[] = []
    cache.insert = (...args) => {
      const [selector, serialized] = args
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push({ name: serialized.name, isGlobal: !selector })
      }
      return insert(...args)
    }
    const flush = () => {
      const flushed = inserted
      inserted = []
      return flushed
    }
    return { cache, flush }
  })

  useServerInsertedHTML(() => {
    const inserted = registry.flush()
    if (!inserted.length) return null
    let styles = ''
    let names = ''
    const globals: { name: string; style: string }[] = []
    for (const { name, isGlobal } of inserted) {
      const style = registry.cache.inserted[name]
      if (typeof style !== 'string') continue
      if (isGlobal) {
        globals.push({ name, style })
      } else {
        styles += style
        names += ` ${name}`
      }
    }
    return (
      <>
        {globals.map(({ name, style }) => (
          <style
            key={name}
            data-emotion={`${registry.cache.key}-global ${name}`}
            dangerouslySetInnerHTML={{ __html: style }}
          />
        ))}
        {styles && (
          <style
            data-emotion={`${registry.cache.key}${names}`}
            dangerouslySetInnerHTML={{ __html: styles }}
          />
        )}
      </>
    )
  })

  return <CacheProvider value={registry.cache}>{children}</CacheProvider>
}
