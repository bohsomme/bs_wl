const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

function browser(stored = null, systemDark = false, blockedStorage = false) {
  const classes = new Set()
  const media = new EventTarget()
  media.matches = systemDark
  const window = new EventTarget()
  window.matchMedia = () => media
  const document = { documentElement: { classList: {
    add: (name) => classes.add(name),
    toggle: (name, active) => active ? classes.add(name) : classes.delete(name),
  } } }
  const localStorage = {
    getItem() { if (blockedStorage) throw new Error('Unavailable'); return stored },
    setItem(key, value) { if (blockedStorage) throw new Error('Unavailable'); stored = value },
  }
  class StorageEvent extends Event {
    constructor(key, newValue) { super('storage'); this.key = key; this.newValue = newValue }
  }
  class CustomEvent extends Event {
    constructor(type, options) { super(type); this.detail = options.detail }
  }
  let state = 'system', effect, cleanup
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useState: () => [state, (value) => { state = value }],
    useEffect: (fn) => { effect = fn },
  }
  const source = ts.transpileModule(fs.readFileSync(__dirname + '/../components/theme-provider.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const mod = { exports: {} }
  new Function('require', 'exports', 'module', 'window', 'document', 'localStorage', 'StorageEvent', 'CustomEvent', source)(
    (id) => id === 'react' ? react : require(id), mod.exports, mod, window, document, localStorage, StorageEvent, CustomEvent,
  )
  const render = () => mod.exports.ThemeProvider({ children: null }).props.value
  return {
    classes, media, render,
    boot() {
      const layout = fs.readFileSync(__dirname + '/../app/layout.tsx', 'utf8')
      const script = layout.match(/__html: `([^`]+)`/)[1]
      new Function('document', 'localStorage', 'matchMedia', script)(document, localStorage, window.matchMedia)
    },
    mount() { render(); cleanup = effect() },
    unmount() { cleanup() },
    stored: () => stored,
    system(dark) { media.matches = dark; media.dispatchEvent(new Event('change')) },
    storage(key, value) { window.dispatchEvent(new StorageEvent(key, value)) },
  }
}

test('saved theme is applied before hydration and explicit themes override OS changes', () => {
  const b = browser('light', true)
  b.boot()
  assert.ok(b.classes.has('light'))
  b.mount()
  b.render().setTheme('dark')
  assert.equal(b.stored(), 'dark')
  b.system(false)
  assert.ok(b.classes.has('dark'))
  assert.ok(!b.classes.has('light'))
  b.render().setTheme('light')
  b.system(true)
  assert.ok(b.classes.has('light'))
  assert.equal(b.render().theme, 'light')
  const reloaded = browser(b.stored(), true)
  reloaded.boot()
  reloaded.mount()
  assert.equal(reloaded.render().theme, 'light')
  b.unmount()
  reloaded.unmount()
})

test('system tracks the OS and storage changes sync other tabs', () => {
  const b = browser()
  b.mount()
  b.system(true)
  assert.ok(b.classes.has('dark'))
  b.storage('bs-wl-theme', 'light')
  assert.equal(b.render().theme, 'light')
  b.storage('unrelated', 'dark')
  assert.equal(b.render().theme, 'light')
  b.storage(null, null)
  assert.equal(b.render().theme, 'system')
  assert.ok(b.classes.has('dark'))
  b.system(false)
  assert.ok(b.classes.has('light'))
  b.unmount()
  b.system(true)
  assert.ok(b.classes.has('light'))
})

test('unavailable storage still allows selection and system mode', () => {
  const b = browser(null, true, true)
  b.boot()
  b.mount()
  assert.ok(b.classes.has('dark'))
  b.render().setTheme('light')
  assert.ok(b.classes.has('light'))
  b.render().setTheme('system')
  assert.equal(b.render().theme, 'system')
  assert.ok(b.classes.has('dark'))
  b.unmount()
})
