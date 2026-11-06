/**
 * dsh-sidebar-fold（侧栏折叠）浏览器半身。
 *
 * 在侧栏“工作区”上方的入口列表（Task board、插件、Skill / MCP……）前
 * 插入一个折叠按钮：按一次把整组入口收起来，再按一次全部展开。
 *
 * 这是 DOM 级实现：DSH 目前没有“面板列表上方”的官方 slot。
 * 只操作侧栏里的 nav，不碰工作区、会话列表和侧栏整体的收起按钮。
 */
window.__ModuleLoader__.load({
  id: 'dsh-sidebar-fold',
  factory() {
    const STORAGE_KEY = 'dsh-sidebar-fold.collapsed'
    const STYLE_ID = 'dsh-sidebar-fold-style'
    const BUTTON_CLASS = 'dsh-sidebar-fold-toggle'
    const LABEL_CLASS = 'dsh-sidebar-fold-label'
    const NAV_ID = 'dsh-sidebar-fold-panel-list'

    const NAV_LABELS = new Set([
      '全局面板',
      'Global panels',
      'Global Panels',
      'グローバルパネル',
      'Paneles globales',
      'Panneaux globaux',
      'Globale Bereiche',
      'Глобальные панели',
      'Painéis globais',
    ])

    const STYLE = [
      '.dsh-sidebar-fold-toggle {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 6px;',
      '  box-sizing: border-box;',
      '  width: 100%;',
      '  height: 30px;',
      '  margin: 0 0 4px;',
      '  padding: 0 10px;',
      '  border: 0;',
      '  border-radius: 8px;',
      '  background: transparent;',
      '  color: inherit;',
      '  font: inherit;',
      '  font-size: 12.5px;',
      '  line-height: 1;',
      '  text-align: left;',
      '  cursor: pointer;',
      '  opacity: .62;',
      '  transition: opacity .15s ease, background-color .15s ease;',
      '}',
      '.dsh-sidebar-fold-toggle:hover {',
      '  opacity: 1;',
      '  background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, .12));',
      '}',
      '.dsh-sidebar-fold-toggle:focus-visible {',
      '  outline: 2px solid var(--dsw-alias-focus-ring, #4c8dff);',
      '  outline-offset: -2px;',
      '  opacity: 1;',
      '}',
      '.dsh-sidebar-fold-toggle svg {',
      '  width: 14px;',
      '  height: 14px;',
      '  flex: none;',
      '  transition: transform .15s ease;',
      '}',
      ".dsh-sidebar-fold-toggle[data-collapsed='true'] svg {",
      '  transform: rotate(-90deg);',
      '}',
      '.dsh-sidebar-fold-toggle .dsh-sidebar-fold-label {',
      '  min-width: 0;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '  white-space: nowrap;',
      '}',
    ].join('\n')

    const ICON = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 6 8 10.5 12.5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'

    function readCollapsed() {
      try {
        return window.localStorage.getItem(STORAGE_KEY) === '1'
      } catch {
        return false
      }
    }

    function writeCollapsed(value) {
      try {
        window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
      } catch {
        /* localStorage 不可用时只保留本次页面状态 */
      }
    }

    function labels() {
      const lang = String((document.documentElement && document.documentElement.lang) || navigator.language || '').toLowerCase()
      if (lang.startsWith('zh')) {
        return {
          collapse: '收起导航',
          expand: '展开导航',
          titleCollapse: '收起工作区上方的入口',
          titleExpand: '展开工作区上方的入口',
        }
      }
      return {
        collapse: 'Collapse navigation',
        expand: 'Expand navigation',
        titleCollapse: 'Collapse the entries above Workspaces',
        titleExpand: 'Expand the entries above Workspaces',
      }
    }

    function isPanelNav(node) {
      if (!(node instanceof Element)) return false
      const label = (node.getAttribute('aria-label') || '').trim()
      if (NAV_LABELS.has(label)) return true
      return String(node.className || '').split(/\s+/).some((name) => name.includes('panelList'))
    }

    function findPanelNav() {
      const navs = document.querySelectorAll('nav')
      for (const nav of navs) {
        if (isPanelNav(nav)) return nav
      }
      return null
    }

    function findRoot(nav) {
      let node = nav.parentElement
      for (let depth = 0; node && depth < 4; depth += 1, node = node.parentElement) {
        if (node.querySelector('[data-sidebar-toggle]')) return node
      }
      return nav.parentElement
    }

    function rootIsRail(root) {
      if (!root) return false
      if (root.getBoundingClientRect().width < 80) return true
      const names = String(root.className || '').split(/\s+/)
      return names.some((name) => /(?:^|_)collapsed$/u.test(name))
    }

    function ensureStyle() {
      if (document.getElementById(STYLE_ID)) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = STYLE
      ;(document.head || document.documentElement).appendChild(style)
    }

    function createButton() {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = BUTTON_CLASS
      button.dataset.collapsed = 'false'
      button.innerHTML = ICON + '<span class="' + LABEL_CLASS + '"></span>'
      return button
    }

    function nextFrame(fn) {
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(fn)
      else window.setTimeout(fn, 16)
    }

    function init() {
      let disposed = false
      let collapsed = readCollapsed()
      let nav = null
      let root = null
      let button = null
      let originalDisplay = ''
      let group = []
      let rootObserver = null
      let scheduled = false
      let timer = null
      let weSetNavId = false

      ensureStyle()
      button = createButton()

      function updateButtonText() {
        if (!button) return
        const text = button.querySelector('.' + LABEL_CLASS)
        const copy = labels()
        if (text) text.textContent = collapsed ? copy.expand : copy.collapse
        button.dataset.collapsed = collapsed ? 'true' : 'false'
        button.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
        button.title = collapsed ? copy.titleExpand : copy.titleCollapse
      }

      function updateButtonVisibility() {
        if (!button) return
        const hidden = !nav || !nav.isConnected || rootIsRail(root)
        button.style.display = hidden ? 'none' : ''
      }

      function applyCollapsed() {
        for (const item of group) {
          if (collapsed) {
            if (item.saved === null) item.saved = item.el.style.display
            item.el.style.display = 'none'
          } else if (item.saved !== null) {
            item.el.style.display = item.saved
            item.saved = null
          }
        }
      }

      function removeButton() {
        if (button && button.parentNode) button.parentNode.removeChild(button)
      }

      function findNewSession(currentNav) {
        const parent = currentNav.parentElement
        if (!parent) return null
        for (const candidate of parent.querySelectorAll('button')) {
          const cls = String(candidate.className || '')
          const label = candidate.getAttribute('aria-label') || ''
          const text = candidate.textContent || ''
          if (cls.split(/\s+/).some((name) => name.includes('newSession'))) return candidate
          if (/新建会话|新会话|new session/i.test(label + ' ' + text)) return candidate
        }
        return null
      }

      function collectGroup(currentNav) {
        const parent = currentNav.parentElement
        if (!parent) return [currentNav]
        const newSession = findNewSession(currentNav)
        const nodes = []
        if (newSession && newSession.parentElement === parent) {
          let node = newSession.nextElementSibling
          while (node) {
            if (node === currentNav) {
              nodes.push(node)
              break
            }
            if (node !== button) nodes.push(node)
            node = node.nextElementSibling
          }
          if (nodes.includes(currentNav)) return nodes
        }
        nodes.length = 0
        nodes.push(currentNav)
        let prev = currentNav.previousElementSibling
        while (prev && prev !== button) {
          if (prev.matches && prev.matches('[data-dsh-atb-entry], [data-dsh-taskboard-entry], [data-dsh-ssh-entry]')) nodes.unshift(prev)
          else break
          prev = prev.previousElementSibling
        }
        return nodes
      }

      function restoreGroup() {
        for (const item of group) {
          if (item.saved !== null) item.el.style.display = item.saved
          item.saved = null
        }
        group = []
      }

      function rebuildGroup() {
        restoreGroup()
        group = collectGroup(nav).map((el) => ({ el, saved: null }))
      }

      function attachRootObserver(nextRoot) {
        if (rootObserver) {
          rootObserver.disconnect()
          rootObserver = null
        }
        root = nextRoot
        if (!root || typeof MutationObserver !== 'function') return
        rootObserver = new MutationObserver(() => updateButtonVisibility())
        rootObserver.observe(root, { attributes: true, attributeFilter: ['class'] })
      }

      function sync() {
        if (disposed) return
        const nextNav = findPanelNav()
        if (!nextNav) {
          nav = null
          restoreGroup()
          attachRootObserver(null)
          removeButton()
          return
        }

        if (nextNav !== nav) {
          if (nav && weSetNavId && nav.id === NAV_ID) nav.removeAttribute('id')
          restoreGroup()
          nav = nextNav
          originalDisplay = nav.style.display
          if (!nav.id) {
            nav.id = NAV_ID
            weSetNavId = true
          } else {
            weSetNavId = false
          }
          attachRootObserver(findRoot(nav))
          rebuildGroup()
        } else if (group.length === 0 || group.some((item) => !item.el.isConnected)) {
          rebuildGroup()
        }

        if (!button) button = createButton()
        const parent = nav.parentElement
        if (!parent) return
        const anchor = group[0] ? group[0].el : nav
        if (button.parentNode !== parent || button.nextElementSibling !== anchor) {
          parent.insertBefore(button, anchor)
        }
        button.setAttribute('aria-controls', nav.id || NAV_ID)
        updateButtonText()
        applyCollapsed()
        updateButtonVisibility()
      }

      function scheduleSync() {
        if (disposed || scheduled) return
        scheduled = true
        nextFrame(() => {
          scheduled = false
          if (!disposed) sync()
        })
      }

      function onButtonClick(event) {
        event.preventDefault()
        event.stopPropagation()
        collapsed = !collapsed
        writeCollapsed(collapsed)
        applyCollapsed()
        updateButtonText()
        updateButtonVisibility()
      }

      button.addEventListener('click', onButtonClick)
      sync()

      // 面板列表可能在会话切换/侧栏重绘时被 React 重建；
      // 定时兜底比监听整个 body 便宜，也不会打扰聊天渲染。
      timer = window.setInterval(sync, 1500)

      const observer = typeof MutationObserver === 'function'
        ? new MutationObserver(scheduleSync)
        : null
      if (observer) observer.observe(document.body, { childList: true, subtree: false })

      const stop = () => {
        if (disposed) return
        disposed = true
        if (timer !== null) window.clearInterval(timer)
        if (observer) observer.disconnect()
        if (rootObserver) rootObserver.disconnect()
        if (nav && weSetNavId && nav.id === NAV_ID) nav.removeAttribute('id')
        restoreGroup()
        if (nav) nav.style.display = originalDisplay
        removeButton()
        const style = document.getElementById(STYLE_ID)
        if (style && style.parentNode) style.parentNode.removeChild(style)
        if (window.__dshSidebarFold === handle) window.__dshSidebarFold = null
      }

      const handle = { dispose: stop }
      window.__dshSidebarFold = handle
      return stop
    }

    return {
      apply(ctx) {
        if (typeof document === 'undefined') return
        // HMR/重复加载时先撤掉上一份，避免出现两个按钮。
        if (window.__dshSidebarFold && typeof window.__dshSidebarFold.dispose === 'function') {
          try {
            window.__dshSidebarFold.dispose()
          } catch {
            /* noop */
          }
        }

        let stop = null
        let started = false
        const start = () => {
          if (started) return
          started = true
          stop = init()
        }
        const onReady = () => start()
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady, { once: true })
        else start()

        if (ctx && typeof ctx.effect === 'function') {
          ctx.effect(() => () => {
            document.removeEventListener('DOMContentLoaded', onReady)
            if (stop) stop()
          }, 'sidebar-fold: dom')
        }
      },
    }
  },
})
