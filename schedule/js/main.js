import { CATEGORIES, CAT_BY_ID, STRIPE_CATS, TRAVEL_PAIRS } from './categories.js'
import { MONTH_NAMES, DOW_SHORT, isoDate, mondayIndex, isWeekend, isoWeek, monthMatrix, isSameDay } from './dateutil.js'
import { getWorkspaceId, loadFromCloud, saveToCloud } from './supabase-db.js'

// ── Local storage ────────────────────────────────────────────
const LS_KEY = 'yearly-plan-data-v1'
const LS_THEME = 'yearly-plan-theme-v1'

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { version: 1, years: {} }
    const d = JSON.parse(raw)
    if (!d.years) d.years = {}
    return d
  } catch { return { version: 1, years: {} } }
}
function saveLocal(data) { localStorage.setItem(LS_KEY, JSON.stringify(data)) }
function loadTheme() { return localStorage.getItem(LS_THEME) || 'light' }
function saveTheme(t) { localStorage.setItem(LS_THEME, t) }

function exportToFile(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `yearly-plan-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}
function importFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result)
        if (!d || typeof d !== 'object' || !d.years) throw new Error('Invalid file')
        resolve(d)
      } catch (e) { reject(e) }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

// ── Sync status UI ───────────────────────────────────────────
function setSyncStatus(status) {
  const el = document.getElementById('syncStatus')
  if (!el) return
  const map = {
    syncing: { text: '⏳ Syncing…', cls: 'syncing' },
    saved:   { text: '☁️ Saved',    cls: 'saved' },
    error:   { text: '⚠️ Offline',  cls: 'error' },
    loaded:  { text: '☁️ Loaded',   cls: 'saved' },
  }
  const s = map[status] || {}
  el.textContent = s.text || ''
  el.className = 'sync-status ' + (s.cls || '')
  if (status === 'saved' || status === 'loaded') {
    setTimeout(() => { el.textContent = ''; el.className = 'sync-status' }, 2500)
  }
}

// ── Cloud save (debounced) ───────────────────────────────────
const workspaceId = getWorkspaceId()
let cloudSaveTimer = null

function scheduleCloudSave() {
  setSyncStatus('syncing')
  clearTimeout(cloudSaveTimer)
  cloudSaveTimer = setTimeout(async () => {
    const ok = await saveToCloud(workspaceId, state.data)
    setSyncStatus(ok ? 'saved' : 'error')
  }, 500)
}

// ── Calendar render ──────────────────────────────────────────
function renderCalendar(container, year, data, handlers) {
  container.innerHTML = ''
  const today = new Date()
  for (let m = 0; m < 12; m++) container.appendChild(renderMonth(year, m, data, handlers, today))
}

function renderMonth(year, monthIdx, data, handlers, today) {
  const wrap = document.createElement('div')
  wrap.className = 'month'
  const title = document.createElement('div')
  title.className = 'month-title'
  title.textContent = MONTH_NAMES[monthIdx]
  wrap.appendChild(title)

  const grid = document.createElement('div')
  grid.className = 'month-grid'

  const wkHead = document.createElement('div')
  wkHead.className = 'dow'; wkHead.textContent = 'Wk'
  grid.appendChild(wkHead)
  DOW_SHORT.forEach((n, i) => {
    const d = document.createElement('div')
    d.className = 'dow' + (i >= 5 ? ' weekend' : '')
    d.textContent = n
    grid.appendChild(d)
  })

  const days = monthMatrix(year, monthIdx)
  const yearData = (data.years[year] || {})

  for (let i = 0; i < days.length; i += 7) {
    const weekDays = days.slice(i, i + 7)
    const refDay = weekDays.find(d => d.getMonth() === monthIdx) || weekDays[0]
    const weekNum = isoWeek(refDay)
    const wkCell = document.createElement('div')
    wkCell.className = 'wk'; wkCell.textContent = weekNum
    wkCell.title = `Week ${weekNum} — click to paint Mon–Fri`
    wkCell.addEventListener('click', () => {
      const weekdaysOnly = weekDays.filter(d => d.getMonth() === monthIdx && !isWeekend(d))
      if (weekdaysOnly.length) handlers.onPaintDays(weekdaysOnly.map(isoDate))
    })
    grid.appendChild(wkCell)

    weekDays.forEach(d => {
      const cell = document.createElement('div')
      cell.className = 'day'
      const inMonth = d.getMonth() === monthIdx
      if (!inMonth) cell.classList.add('outside')
      if (isWeekend(d)) cell.classList.add('weekend')
      if (isSameDay(d, today)) cell.classList.add('today')

      const iso = isoDate(d)
      cell.dataset.date = iso
      const cats = yearData[iso] || []
      renderDayContent(cell, cats)

      const num = document.createElement('span')
      num.className = 'num'; num.textContent = d.getDate()
      cell.appendChild(num)

      if (inMonth) {
        cell.addEventListener('click', e => { e.preventDefault(); handlers.onPaintDays([iso]) })
        cell.addEventListener('contextmenu', e => { e.preventDefault(); handlers.onClearDay(iso) })
        cell.addEventListener('mouseenter', e => handlers.onHover(e, iso, cats))
        cell.addEventListener('mouseleave', () => handlers.onHoverOut())
        cell.addEventListener('mousemove', e => handlers.onHoverMove(e))
      }
      grid.appendChild(cell)
    })
  }
  wrap.appendChild(grid)
  return wrap
}

function renderDayContent(cell, cats) {
  const stripeCats = cats.filter(c => STRIPE_CATS.includes(c))
  if (stripeCats.length) {
    const stripes = document.createElement('div')
    stripes.className = 'stripes'
    stripeCats.forEach(id => {
      const seg = document.createElement('i')
      seg.style.background = `var(${CAT_BY_ID[id].cssVar})`
      stripes.appendChild(seg)
    })
    cell.appendChild(stripes)
  }
  TRAVEL_PAIRS.forEach(pair => {
    const hasP = cats.includes(pair.planned)
    const hasA = cats.includes(pair.actual)
    if (!hasP && !hasA) return
    const split = document.createElement('div')
    const mode = hasP && hasA ? 'both' : (hasP ? 'planned' : 'actual')
    split.className = `split ${pair.splitClass} ${mode}`
    cell.appendChild(split)
  })
}

// ── Stats ────────────────────────────────────────────────────
function computeStats(data, year) {
  const yearData = data.years[year] || {}
  const counts = Object.fromEntries(CATEGORIES.map(c => [c.id, 0]))
  let mismatchNP = 0, mismatchPN = 0
  for (const iso in yearData) {
    const cats = yearData[iso]
    cats.forEach(id => { if (counts[id] !== undefined) counts[id]++ })
    if (cats.includes('tnp_planned') !== cats.includes('tnp_actual')) mismatchNP++
    if (cats.includes('tpn_planned') !== cats.includes('tpn_actual')) mismatchPN++
  }
  const workBase = counts.office + counts.wfh_no + counts.wfh_pl
  const ratio = workBase > 0 ? counts.wfh_pl / workBase : 0
  return { counts, ratio, workBase, mismatchNP, mismatchPN,
    awayFromOffice: counts.wfh_no + counts.wfh_pl + counts.holiday + counts.absence + counts.official,
    holidaysFromWork: counts.holiday + counts.absence + counts.official }
}

function renderStats(stats) {
  const list = document.getElementById('statsList')
  list.innerHTML = ''
  CATEGORIES.forEach(c => {
    const li = document.createElement('li')
    li.innerHTML = `<span><i class="sw" style="background:var(${c.cssVar})"></i>${c.label}</span><b>${stats.counts[c.id]}</b>`
    list.appendChild(li)
  })
  const pct = (stats.ratio * 100).toFixed(1)
  document.getElementById('ratioValue').textContent = stats.workBase ? `${pct}%` : '—'
  document.getElementById('ratioBar').style.width = `${Math.min(100, stats.ratio * 100)}%`
  document.getElementById('cntWfhPl').textContent = stats.counts.wfh_pl
  document.getElementById('cntOffice').textContent = stats.counts.office
  document.getElementById('cntWfhNo').textContent = stats.counts.wfh_no
  document.querySelectorAll('.ratio-legend .sw').forEach(el => {
    const id = el.dataset.cat
    if (CAT_BY_ID[id]) el.style.background = `var(${CAT_BY_ID[id].cssVar})`
  })
  document.getElementById('awayCount').textContent = stats.awayFromOffice
  document.getElementById('holidayCount').textContent = stats.holidaysFromWork
  document.getElementById('travelNpMismatch').textContent = stats.mismatchNP
  document.getElementById('travelPnMismatch').textContent = stats.mismatchPN
}

// ── App state ────────────────────────────────────────────────
const state = { data: loadLocal(), year: new Date().getFullYear(), brush: 'office' }
const els = {}

function applyTheme(t) {
  document.body.dataset.theme = t
  els.themeSelect.value = t
  saveTheme(t)
  renderSidebar()
  renderAll()
}

function setYear(y) {
  state.year = y
  els.yearInput.value = y
  els.statsYearLabel.textContent = y
  renderAll()
}

function renderSidebar() {
  els.brushList.innerHTML = ''
  CATEGORIES.forEach(c => {
    const li = document.createElement('li')
    li.className = 'brush-item' + (state.brush === c.id ? ' active' : '')
    li.innerHTML = `<span class="sw" style="background:var(${c.cssVar})"></span><span class="label">${c.label}</span><span class="count" id="bc-${c.id}">0</span>`
    li.addEventListener('click', () => { state.brush = c.id; renderSidebar() })
    els.brushList.appendChild(li)
  })
  const eraser = document.getElementById('eraseBrush')
  eraser.classList.toggle('active', state.brush === null)
  eraser.onclick = () => { state.brush = state.brush === null ? 'office' : null; renderSidebar() }
  updateBrushCounts()
}

function updateBrushCounts() {
  const y = state.data.years[state.year] || {}
  const counts = Object.fromEntries(CATEGORIES.map(c => [c.id, 0]))
  for (const iso in y) y[iso].forEach(id => { if (counts[id] !== undefined) counts[id]++ })
  CATEGORIES.forEach(c => { const el = document.getElementById('bc-' + c.id); if (el) el.textContent = counts[c.id] })
}

function getDayCats(iso) {
  const yd = state.data.years[state.year] || (state.data.years[state.year] = {})
  return yd[iso] || []
}
function setDayCats(iso, cats) {
  const yd = state.data.years[state.year] || (state.data.years[state.year] = {})
  if (cats.length === 0) delete yd[iso]; else yd[iso] = cats
}
function persistAll() {
  saveLocal(state.data)
  scheduleCloudSave()
}

function paintDays(isoList) {
  if (state.brush === null) {
    isoList.forEach(iso => setDayCats(iso, []))
  } else {
    const allHave = isoList.every(iso => getDayCats(iso).includes(state.brush))
    isoList.forEach(iso => {
      const cats = new Set(getDayCats(iso))
      if (allHave) cats.delete(state.brush); else cats.add(state.brush)
      setDayCats(iso, [...cats])
    })
  }
  persistAll(); renderAll()
}
function clearDay(iso) { setDayCats(iso, []); persistAll(); renderAll() }

// ── Tooltip ──────────────────────────────────────────────────
function showTooltip(e, iso, cats) {
  if (!cats || cats.length === 0) { hideTooltip(); return }
  const lines = cats.map(id => CAT_BY_ID[id]?.label || id).map(l => `<li>${l}</li>`).join('')
  els.tooltip.innerHTML = `<b>${iso}</b><ul>${lines}</ul>`
  els.tooltip.hidden = false
  moveTooltip(e)
}
function moveTooltip(e) {
  const pad = 12
  let x = e.clientX + pad, y = e.clientY + pad
  const r = els.tooltip.getBoundingClientRect()
  if (x + r.width > window.innerWidth) x = e.clientX - r.width - pad
  if (y + r.height > window.innerHeight) y = e.clientY - r.height - pad
  els.tooltip.style.left = x + 'px'; els.tooltip.style.top = y + 'px'
}
function hideTooltip() { els.tooltip.hidden = true }

function renderAll() {
  renderCalendar(els.calendar, state.year, state.data, {
    onPaintDays: paintDays, onClearDay: clearDay,
    onHover: showTooltip, onHoverMove: moveTooltip, onHoverOut: hideTooltip,
  })
  renderStats(computeStats(state.data, state.year))
  updateBrushCounts()
  if (typeof attachMobileDayHandlers === 'function') attachMobileDayHandlers(els.calendar)
}

// ── Mobile ───────────────────────────────────────────────────
function isMobile() { return window.innerWidth <= 700 }

function initMobile() {
  const hamburger = document.getElementById('hamburgerBtn')
  const topbarRight = document.getElementById('topbarRight')
  const overlay = document.getElementById('sheetOverlay')
  const brushPanel = document.getElementById('brushPanel')
  const statsPanel = document.getElementById('statsPanel')
  const navBrush = document.getElementById('mobileNavBrush')
  const navStats = document.getElementById('mobileNavStats')
  const brushClose = document.getElementById('brushPanelClose')
  const statsClose = document.getElementById('statsPanelClose')

  hamburger.addEventListener('click', () => topbarRight.classList.toggle('open'))

  function openSheet(panel, navBtn) {
    closeAllSheets()
    panel.classList.add('sheet-open')
    navBtn.classList.add('active')
    overlay.classList.add('visible')
    document.body.style.overflow = 'hidden'
  }
  function closeAllSheets() {
    [brushPanel, statsPanel].forEach(p => p.classList.remove('sheet-open'))
    ;[navBrush, navStats].forEach(b => b.classList.remove('active'))
    overlay.classList.remove('visible')
    document.body.style.overflow = ''
  }

  navBrush.addEventListener('click', () =>
    brushPanel.classList.contains('sheet-open') ? closeAllSheets() : openSheet(brushPanel, navBrush))
  navStats.addEventListener('click', () =>
    statsPanel.classList.contains('sheet-open') ? closeAllSheets() : openSheet(statsPanel, navStats))
  brushClose.addEventListener('click', closeAllSheets)
  statsClose.addEventListener('click', closeAllSheets)
  overlay.addEventListener('click', closeAllSheets)
  document.getElementById('brushList').addEventListener('click', () => setTimeout(closeAllSheets, 180))
  document.getElementById('eraseBrush').addEventListener('click', () => setTimeout(closeAllSheets, 180))
}

function addLongPress(cell, iso) {
  let timer = null
  cell.addEventListener('touchstart', () => {
    timer = setTimeout(() => {
      timer = null
      if (navigator.vibrate) navigator.vibrate(40)
      clearDay(iso)
    }, 550)
  }, { passive: true })
  cell.addEventListener('touchend', () => { clearTimeout(timer); timer = null })
  cell.addEventListener('touchmove', () => { clearTimeout(timer); timer = null })
}

let touchTooltipTimer = null
function showTouchTooltip(iso, cats) {
  if (!cats || cats.length === 0) return
  clearTimeout(touchTooltipTimer)
  const lines = cats.map(id => CAT_BY_ID[id]?.label || id).map(l => `<li>${l}</li>`).join('')
  els.tooltip.innerHTML = `<b>${iso}</b><ul>${lines}</ul>`
  els.tooltip.hidden = false
  els.tooltip.style.left = ''; els.tooltip.style.top = ''
  touchTooltipTimer = setTimeout(() => { els.tooltip.hidden = true }, 2500)
}

function attachMobileDayHandlers(container) {
  if (!isMobile()) return
  container.querySelectorAll('.day:not(.outside)').forEach(cell => {
    const iso = cell.dataset.date
    if (!iso) return
    addLongPress(cell, iso)
    cell.addEventListener('touchend', () => {
      const cats = (state.data.years[state.year] || {})[iso] || []
      if (cats.length > 0) showTouchTooltip(iso, cats)
    }, { passive: true })
  })
}

// ── Init ─────────────────────────────────────────────────────
async function init() {
  els.calendar = document.getElementById('calendar')
  els.brushList = document.getElementById('brushList')
  els.yearInput = document.getElementById('yearInput')
  els.statsYearLabel = document.getElementById('statsYearLabel')
  els.themeSelect = document.getElementById('themeSelect')
  els.tooltip = document.getElementById('tooltip')

  els.yearInput.value = state.year
  els.statsYearLabel.textContent = state.year

  els.themeSelect.addEventListener('change', e => applyTheme(e.target.value))
  els.yearInput.addEventListener('change', e => { const y = parseInt(e.target.value, 10); if (!isNaN(y)) setYear(y) })
  document.getElementById('prevYear').addEventListener('click', () => setYear(state.year - 1))
  document.getElementById('nextYear').addEventListener('click', () => setYear(state.year + 1))
  document.getElementById('todayBtn').addEventListener('click', () => setYear(new Date().getFullYear()))

  document.getElementById('exportBtn').addEventListener('click', () => exportToFile(state.data))
  const importFile = document.getElementById('importFile')
  document.getElementById('importBtn').addEventListener('click', () => importFile.click())
  importFile.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return
    try {
      const d = await importFromFile(file)
      if (confirm('Merge imported data with current? Cancel = replace all.')) {
        for (const y in d.years) {
          state.data.years[y] = state.data.years[y] || {}
          for (const iso in d.years[y]) {
            const merged = new Set([...(state.data.years[y][iso] || []), ...d.years[y][iso]])
            state.data.years[y][iso] = [...merged]
          }
        }
      } else {
        state.data = d
      }
      persistAll(); renderAll()
    } catch (err) { alert('Import failed: ' + err.message) }
    finally { importFile.value = '' }
  })

  document.getElementById('clearYearBtn').addEventListener('click', () => {
    if (!confirm(`Clear all entries for ${state.year}? This cannot be undone.`)) return
    delete state.data.years[state.year]
    persistAll(); renderAll()
  })

  applyTheme(loadTheme())
  renderSidebar()

  // Load from cloud — takes priority over localStorage
  setSyncStatus('syncing')
  const cloudData = await loadFromCloud(workspaceId)
  if (cloudData && cloudData.years) {
    state.data = cloudData
    saveLocal(state.data)
    setSyncStatus('loaded')
  } else {
    setSyncStatus('')
  }
  renderAll()
}

document.addEventListener('DOMContentLoaded', () => { init(); initMobile() })
