import Hyalite from './hyalite.js'
import { HYALITE_PRESET } from './preset.js'

export { Hyalite, HYALITE_PRESET }

const sessions = new WeakMap()

/** Only focal surfaces opt into the expensive lens; dense cards stay CSS-only. */
export function watchLiquidGlass(root = document.body) {
  let session = sessions.get(root)
  if (!session) {
    session = { watcher: createWatcher(root), users: 0 }
    sessions.set(root, session)
  }
  session.users++
  let released = false
  return {
    stop() {
      if (released) return
      released = true
      if (--session.users === 0) {
        session.watcher.stop()
        sessions.delete(root)
      }
    },
  }
}

function createWatcher(root) {
  const selector = '.glass-surface.glass-refract'
  const elements = new Set()
  const attached = new Set()
  const corners = new WeakMap()
  const transparency = matchMedia('(prefers-reduced-transparency: reduce)')
  let stopped = false

  function detach(element) {
    Hyalite.detach(element)
    attached.delete(element)
    corners.delete(element)
  }

  function cornerKey(element) {
    const style = getComputedStyle(element)
    return [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomRightRadius,
      style.borderBottomLeftRadius,
    ].join('|')
  }

  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const element = entry.target
      if (stopped || !elements.has(element)) continue
      if (!entry.isIntersecting || transparency.matches) {
        detach(element)
        continue
      }
      if (attached.has(element)) continue
      try {
        Hyalite.attach(element, HYALITE_PRESET)
        attached.add(element)
        corners.set(element, cornerKey(element))
      } catch {
        // Canvas/GPU failure keeps the CSS fallback and releases partial state.
        detach(element)
      }
    }
  })

  function consider(element) {
    if (!(element instanceof HTMLElement)) return
    if (!root.contains(element) || !element.matches(selector)) {
      visibility.unobserve(element)
      elements.delete(element)
      detach(element)
    } else if (!elements.has(element)) {
      elements.add(element)
      visibility.observe(element)
    } else if (attached.has(element)) {
      // Hover/selection classes do not invalidate a displacement map.
      const key = cornerKey(element)
      if (corners.get(element) !== key) {
        corners.set(element, key)
        Hyalite.refresh(element)
      }
    }
  }

  function scan(node) {
    if (!(node instanceof HTMLElement)) return
    consider(node)
    node.querySelectorAll(selector).forEach(consider)
  }

  const mutations = new MutationObserver(records => {
    const changed = new Set()
    for (const record of records) {
      if (record.type === 'attributes') changed.add(record.target)
      else record.addedNodes.forEach(scan)
    }
    changed.forEach(consider)
    // Check final ownership: a node moved within the page must stay attached.
    for (const element of elements) {
      if (!root.contains(element)) consider(element)
    }
  })

  function updatePreference() {
    for (const element of elements) {
      detach(element)
      visibility.unobserve(element)
      visibility.observe(element)
    }
  }

  root.querySelectorAll(selector).forEach(consider)
  mutations.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class'],
  })
  transparency.addEventListener('change', updatePreference)

  return {
    stop() {
      stopped = true
      mutations.disconnect()
      visibility.disconnect()
      transparency.removeEventListener('change', updatePreference)
      elements.forEach(detach)
      elements.clear()
    },
  }
}
