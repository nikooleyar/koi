import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './App.css'

const GROUPS = ['chest', 'arms', 'legs', 'back'] as const
type Group = (typeof GROUPS)[number]

type Log = {
  id: number
  exercise: string
  weight: number
  rest_seconds: number | null
  logged_at: string
}

const VIEWS = [
  { id: 'log', label: 'Log', icon: 'M12 5v14M5 12h14' },
  { id: 'stats', label: 'Stats', icon: 'M4 19V5M4 19h16M8 15l4-5 3 3 5-6' },
  { id: 'weight', label: 'Weight', icon: 'M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 8h6l-1 3h-4z' },
  { id: 'settings', label: 'Settings', icon: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 5v4M8 15v4' },
] as const
type View = (typeof VIEWS)[number]['id']

const ACCENTS = { Orange: '#FF8552', Teal: '#3DD6C3', Blue: '#6EA8FF', Lime: '#C8E55A' }

function when(iso: string) {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? `Today, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'numeric', day: 'numeric' })

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Server can be slow
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error()
  return r.json()
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}

function App() {
  const [view, setView] = useState<View>('log')
  const [group, setGroup] = useState<Group>('chest')
  // The sidebar always starts hidden so the content gets the full width
  const [sideOpen, setSideOpen] = useState(false)
  const [entryOpen, setEntryOpen] = useState(false)
  // Bumped after each saved entry so the views reload their data
  const [rev, setRev] = useState(0)
  const [notice, setNotice] = useState('')
  const [accent, setAccent] = useState(() => {
    try {
      return localStorage.getItem('accent') ?? ACCENTS.Orange
    } catch {
      return ACCENTS.Orange
    }
  })

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(t)
  }, [notice])

  function pickAccent(color: string) {
    setAccent(color)
    try {
      localStorage.setItem('accent', color)
    } catch {
      // Storage blocked (private mode): the choice just isn't remembered
    }
  }

  return (
    <div className={sideOpen ? 'shell' : 'shell side-closed'} style={{ '--accent': accent } as CSSProperties}>
      <aside className="side" id="side">
        <div className="brand">
          <span>Koi</span>
        </div>
        <nav aria-label="Main">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              aria-label={v.label}
              aria-current={v.id === view ? 'page' : undefined}
              onClick={() => setView(v.id)}
            >
              <Icon d={v.icon} />
              <span>{v.label}</span>
            </button>
          ))}
        </nav>
        {/* An installed PWA has no browser reload button, so the app provides one */}
        <button className="reload" aria-label="Reload" onClick={() => location.reload()}>
          <Icon d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8M21 3v5h-5" />
          <span>Reload</span>
        </button>
      </aside>
      <main>
        <button
          className="burger"
          aria-label="Menu"
          aria-expanded={sideOpen}
          aria-controls="side"
          onClick={() => setSideOpen(!sideOpen)}
        >
          <Icon d="M4 7h16M4 12h16M4 17h16" />
        </button>
        {view === 'log' && <LogView group={group} onPick={setGroup} rev={rev} />}
        {view === 'stats' && <StatsView key={rev} />}
        {view === 'weight' && <WeightView />}
        {view === 'settings' && (
          <>
            <h1>Settings</h1>
            <section className="card">
              <h2>Accent color</h2>
              <div className="swatches">
                {Object.entries(ACCENTS).map(([name, color]) => (
                  <button
                    key={color}
                    aria-label={name}
                    aria-pressed={color === accent}
                    style={{ background: color }}
                    onClick={() => pickAccent(color)}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <button className="fab" aria-label="New entry" onClick={() => setEntryOpen(true)}>
        <Icon d="M12 5v14M5 12h14" />
      </button>
      <EntryDialog
        open={entryOpen}
        group={group}
        onPick={setGroup}
        onClose={() => setEntryOpen(false)}
        onSaved={(saved) => {
          setEntryOpen(false)
          setRev((r) => r + 1)
          // Built from the server's reply, so it only shows once the row is in the database
          setNotice(`Saved: ${saved.exercise}, ${saved.weight} lb`)
        }}
      />
      {notice && (
        <p role="status" className="notice">
          ✓ {notice}
        </p>
      )}
    </div>
  )
}

function GroupTabs({ value, onPick }: { value: Group; onPick: (g: Group) => void }) {
  return (
    <div className="tabs" role="group" aria-label="Muscle group">
      {GROUPS.map((g) => (
        <button key={g} type="button" aria-pressed={g === value} onClick={() => onPick(g)}>
          {g}
        </button>
      ))}
    </div>
  )
}

function LogView({ group, onPick, rev }: { group: Group; onPick: (g: Group) => void; rev: number }) {
  return (
    <>
      <header className="head">
        <h1>Log</h1>
        <GroupTabs value={group} onPick={onPick} />
      </header>
      <GroupLog key={group} group={group} rev={rev} />
    </>
  )
}

function GroupLog({ group, rev }: { group: Group; rev: number }) {
  const [logs, setLogs] = useState<Log[]>([])
  const [error, setError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(true)

  useEffect(() => {
    fetch(`/api/logs?group=${group}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setLogs)
      .catch(() => setError('Could not load logs.'))
  }, [group, rev])

  const series = sessions(logs)
  const latest = series.at(-1)
  const yMax = Math.max(50, Math.ceil(Math.max(0, ...logs.map((l) => l.weight)) / 50) * 50)

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <section className="card">
        <div>
          <p className="muted">Top weight per session</p>
          <div className="big xl">{latest ? `${latest.weight} lb` : '—'}</div>
          <p className="muted">{latest ? `${latest.exercise} · ${when(latest.logged_at)}` : 'Nothing logged'}</p>
        </div>
        <LineChart
          values={series.map((l) => l.weight)}
          labels={series.map((l) => shortDate(l.logged_at))}
          min={0}
          max={yMax}
          dots
          label={`Top ${group} weight per session, in pounds`}
          empty={`No ${group} entries yet.`}
        />
      </section>

      <section className={historyOpen ? 'card history' : 'card history closed'}>
        <h2>
          <button className="acc" aria-expanded={historyOpen} onClick={() => setHistoryOpen(!historyOpen)}>
            History
          </button>
        </h2>
        <div className="acc-body">
          <div>
            {logs.length === 0 && !error && <p className="muted">No {group} entries yet.</p>}
            <ul className="logs">
              {logs.map((l) => (
                <li key={l.id}>
                  <div>
                    <strong>{l.exercise}</strong>
                    <p className="muted">
                      <time dateTime={l.logged_at}>{when(l.logged_at)}</time>
                      {l.rest_seconds != null && ` · rest ${l.rest_seconds} s`}
                    </p>
                  </div>
                  <b>{l.weight} lb</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}

// Exercises in `names` that contain `text`, ignoring case. Empty text matches everything.
function matching(names: string[], text: string) {
  const q = text.trim().toLowerCase()
  return names.filter((n) => n.toLowerCase().includes(q))
}

function EntryDialog(props: {
  open: boolean
  group: Group
  onPick: (g: Group) => void
  onClose: () => void
  onSaved: (saved: Log) => void
}) {
  const { open, group } = props
  const dialog = useRef<HTMLDialogElement>(null)
  const weightInput = useRef<HTMLInputElement>(null)
  // Exercises already logged in a group; kept with its group so a stale list is never offered
  const [known, setKnown] = useState<{ group: Group; names: string[] }>({ group, names: [] })
  const [exercise, setExercise] = useState('')
  const [weight, setWeight] = useState('')
  const [rest, setRest] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  // Dropdown: 'all' after the arrow is pressed, 'match' while typing, null when closed
  const [list, setList] = useState<'all' | 'match' | null>(null)

  useEffect(() => {
    const d = dialog.current!
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    let stale = false
    fetch(`/api/logs?group=${group}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((logs: Log[]) => {
        if (!stale) setKnown({ group, names: [...new Set(logs.map((l) => l.exercise))] })
      })
      // Without the list the field still works as plain text
      .catch(() => {})
    return () => {
      stale = true
    }
  }, [open, group])

  async function save() {
    setSaving(true)
    setError('')
    try {
      const saved = await post<Log>('/api/logs', {
        muscle_group: group,
        exercise,
        weight: Number(weight),
        rest_seconds: rest === '' ? null : Number(rest),
      })
      setExercise('')
      setWeight('')
      setRest('')
      props.onSaved(saved)
    } catch {
      // Fields are left filled in so nothing typed is lost
      setError('Not saved. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const names = known.group === group ? known.names : []
  const options = list === 'match' ? matching(names, exercise) : names

  return (
    <dialog
      ref={dialog}
      className="entry"
      aria-labelledby="entry-title"
      onClose={props.onClose}
      // A click on the dimmed area lands on the dialog itself, not on the form inside it
      onClick={(e) => e.target === e.currentTarget && props.onClose()}
    >
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div className="head">
          <h2 id="entry-title">New entry</h2>
          <button type="button" className="icon" aria-label="Close" onClick={props.onClose}>
            <Icon d="M6 6l12 12M18 6L6 18" />
          </button>
        </div>
        <GroupTabs value={group} onPick={props.onPick} />
        <label>
          Exercise
          <div
            className="combo"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setList(null)
            }}
          >
            <input
              value={exercise}
              onChange={(e) => {
                setExercise(e.target.value)
                setList('match')
              }}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowDown') return
                e.preventDefault()
                if (list) e.currentTarget.parentElement!.querySelector<HTMLElement>('.opts button')?.focus()
                else setList('all')
              }}
              role="combobox"
              aria-expanded={list !== null}
              aria-controls="exercise-opts"
              aria-autocomplete="list"
              autoComplete="off"
              required
              maxLength={100}
            />
            <button
              type="button"
              className="icon arrow"
              aria-label="Show previous exercises"
              // Keeps focus in the field, so opening the list does not also blur-close it
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setList(list ? null : 'all')}
            >
              <Icon d="M6 9l6 6 6-6" />
            </button>
            {list && (
              <div
                className="opts"
                id="exercise-opts"
                role="listbox"
                onMouseDown={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
                  e.preventDefault()
                  const el = e.target as HTMLElement
                  const to = e.key === 'ArrowDown' ? el.nextElementSibling : el.previousElementSibling
                  ;((to ?? e.currentTarget.parentElement!.querySelector('input')) as HTMLElement).focus()
                }}
              >
                {options.map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    aria-selected={name === exercise}
                    onClick={() => {
                      setExercise(name)
                      setList(null)
                      weightInput.current?.focus()
                    }}
                  >
                    {name}
                  </button>
                ))}
                {options.length === 0 && (
                  <p className="muted">
                    {names.length ? 'No previous exercise matches. Saving adds it as new.' : `No ${group} exercises logged yet.`}
                  </p>
                )}
              </div>
            )}
          </div>
        </label>
        <div className="row2">
          <label>
            Weight (lb)
            <input
              ref={weightInput}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              type="number"
              inputMode="decimal"
              min="0"
              max="2000"
              step="any"
              required
            />
          </label>
          <label>
            Rest (sec, optional)
            <input
              value={rest}
              onChange={(e) => setRest(e.target.value)}
              type="number"
              inputMode="numeric"
              min="0"
              max="3600"
              step="1"
            />
          </label>
        </div>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'Saving…' : 'Log entry'}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </dialog>
  )
}

// One point per day with entries: that day's heaviest entry. Newest 8 days, oldest first.
function sessions(logs: Log[]) {
  const byDay = new Map<string, Log>()
  for (const l of logs) {
    const day = new Date(l.logged_at).toDateString()
    const best = byDay.get(day)
    if (!best || l.weight > best.weight) byDay.set(day, l)
  }
  // The API returns newest first, so the first 8 days are the latest 8
  return [...byDay.values()].slice(0, 8).reverse()
}

// Resample a series to a fixed number of points so two series of different lengths can be blended.
// 420 is divisible by every possible segment count (1 to 7), so the real points are hit exactly.
const STEPS = 420
function resample(v: number[]) {
  return Array.from({ length: STEPS + 1 }, (_, j) => {
    const p = (j / STEPS) * (v.length - 1)
    const i = Math.floor(p)
    return v[i] + ((v[i + 1] ?? v[i]) - v[i]) * (p - i)
  })
}

function StatsView() {
  const [data, setData] = useState<Record<Group, Log[]> | null>(null)
  const [error, setError] = useState('')
  const [group, setGroup] = useState<Group>('chest')
  // Weights currently drawn: the real points at rest, a resampled blend while animating
  const [shown, setShown] = useState<number[]>([])
  const raf = useRef(0)
  const [now] = useState(Date.now)

  useEffect(() => {
    Promise.all(
      GROUPS.map((g) => fetch(`/api/logs?group=${g}`).then((r) => (r.ok ? r.json() : Promise.reject()))),
    )
      .then((all: Log[][]) => {
        const d = Object.fromEntries(GROUPS.map((g, i) => [g, all[i]])) as Record<Group, Log[]>
        setData(d)
        setShown(sessions(d.chest).map((l) => l.weight))
      })
      .catch(() => setError('Could not load stats.'))
    return () => cancelAnimationFrame(raf.current)
  }, [])

  if (error) return <p role="alert">{error}</p>
  if (!data) return <p className="muted">Loading…</p>

  function pick(g: Group) {
    cancelAnimationFrame(raf.current)
    setGroup(g)
    const to = sessions(data![g]).map((l) => l.weight)
    if (!shown.length || !to.length || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(to)
      return
    }
    const a = resample(shown)
    const b = resample(to)
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 450)
      const ease = 1 - (1 - t) ** 3
      setShown(t < 1 ? a.map((v, i) => v + (b[i] - v) * ease) : to)
      if (t < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }

  const series = sessions(data[group])
  const latest = series.at(-1)
  const all = GROUPS.flatMap((g) => data[g])
  const yMax = Math.max(50, Math.ceil(Math.max(0, ...all.map((l) => l.weight)) / 50) * 50)
  const animating = shown.length !== series.length

  const week = all.filter((l) => now - Date.parse(l.logged_at) < 7 * 864e5)
  const heaviest = all.reduce<Log | null>((best, l) => (!best || l.weight > best.weight ? l : best), null)
  const rests = all.flatMap((l) => (l.rest_seconds == null ? [] : [l.rest_seconds]))
  const avgRest = Math.round(rests.reduce((sum, r) => sum + r, 0) / rests.length)

  return (
    <>
      <h1>Stats</h1>
      <section className="card">
        <div className="head">
          <div>
            <p className="muted">Top weight per session</p>
            <div className="big xl">{shown.length ? `${+shown.at(-1)!.toFixed(animating ? 0 : 1)} lb` : '—'}</div>
            <p className="muted">{latest ? `${latest.exercise} · ${when(latest.logged_at)}` : 'Nothing logged'}</p>
          </div>
          <GroupTabs value={group} onPick={pick} />
        </div>
        <LineChart
          values={shown}
          labels={series.map((l) => shortDate(l.logged_at))}
          min={0}
          max={yMax}
          dots={!animating}
          label={`Top ${group} weight per session, in pounds`}
          empty={`No ${group} entries yet.`}
        />
      </section>

      <div className="tiles">
        <section className="card">
          <p className="muted">Entries, last 7 days</p>
          <div className="big">{week.length}</div>
          <p className="muted">
            across {new Set(week.map((l) => new Date(l.logged_at).toDateString())).size} days
          </p>
        </section>
        <section className="card">
          <p className="muted">Heaviest lift</p>
          <div className="big">{heaviest ? `${heaviest.weight} lb` : '—'}</div>
          <p className="muted">{heaviest ? `${heaviest.exercise} · ${when(heaviest.logged_at)}` : 'Nothing logged'}</p>
        </section>
        <section className="card">
          <p className="muted">Average rest</p>
          <div className="big">
            {rests.length ? `${Math.floor(avgRest / 60)}:${String(avgRest % 60).padStart(2, '0')}` : '—'}
          </div>
          <p className="muted">between logged sets</p>
        </section>
      </div>
    </>
  )
}

function LineChart(props: {
  values: number[]
  labels: string[]
  min: number
  max: number
  dots: boolean
  label: string
  empty: string
}) {
  const { values, min, max } = props
  const x = (i: number, n: number) => (n > 1 ? (i / (n - 1)) * 100 : 50)
  const y = (v: number) => 100 - ((v - min) / (max - min)) * 100
  const points = values.map((v, i) => `${x(i, values.length)},${y(v)}`).join(' ')
  return (
    <div className="chart">
      <div className="ylabels" aria-hidden="true">
        {[1, 0.8, 0.6, 0.4, 0.2, 0].map((f) => (
          <span key={f}>{+(min + (max - min) * f).toFixed(1)}</span>
        ))}
      </div>
      <div className="plot">
        {values.length > 1 && (
          <svg role="img" aria-label={props.label} viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points={`${points} 100,100 0,100`} />
            <polyline points={points} />
          </svg>
        )}
        {props.dots &&
          values.map((v, i) => (
            <div key={i} className="dot" style={{ left: `${x(i, values.length)}%`, top: `${y(v)}%` }} />
          ))}
        {!values.length && <p className="empty">{props.empty}</p>}
      </div>
      <div className="xlabels" aria-hidden="true">
        {props.labels.map((text, i) => (
          <span key={i} style={{ left: `${x(i, props.labels.length)}%` }}>
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}

type Weight = { id: number; weight: number; logged_at: string }

function WeightView() {
  const [rows, setRows] = useState<Weight[]>([])
  const [weight, setWeight] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    fetch('/api/weight')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows)
      .catch(() => setError('Could not load weight history.'))
  }, [])

  async function save() {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = await post<Weight>('/api/weight', { weight: Number(weight) })
      setRows((old) => [saved, ...old])
      // Built from the server's reply, so it only shows once the row is in the database
      setNotice(`Saved: ${saved.weight.toFixed(1)} lb`)
      setWeight('')
    } catch {
      // The field is left filled in so nothing typed is lost
      setError('Not saved. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  // The API returns newest first; the chart shows the latest 30 entries, oldest first
  const recent = rows.slice(0, 30).reverse()
  const values = recent.map((r) => r.weight)
  const first = recent[0]
  const latest = recent.at(-1)
  const change = latest && first ? latest.weight - first.weight : 0
  // Body weight moves by a few pounds, so the scale hugs the data instead of starting at 0
  const min = Math.floor((Math.min(...values) - 2) / 5) * 5
  const max = Math.ceil((Math.max(...values) + 2) / 5) * 5

  return (
    <>
      <h1>Body weight</h1>
      <div className="cols">
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <h2>New entry</h2>
          <label>
            Weight (lb)
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              type="number"
              inputMode="decimal"
              min="1"
              max="1000"
              step="0.1"
              required
            />
          </label>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Log weight'}
          </button>
          {error && <p role="alert">{error}</p>}
          {notice && (
            <p role="status" className="notice">
              ✓ {notice}
            </p>
          )}
        </form>

        <section className="card wide">
          <div>
            <p className="muted">Latest</p>
            <div className="big xl">{latest ? `${latest.weight.toFixed(1)} lb` : '—'}</div>
            <p className="muted">
              {recent.length > 1
                ? `${change > 0 ? '+' : ''}${change.toFixed(1)} lb since ${when(first.logged_at)}`
                : latest
                  ? when(latest.logged_at)
                  : 'Nothing logged'}
            </p>
          </div>
          <LineChart
            values={values}
            labels={recent.map((r, i) => (i === 0 || i === recent.length - 1 ? shortDate(r.logged_at) : ''))}
            min={min}
            max={max}
            dots
            label="Body weight over time, in pounds"
            empty="No weight entries yet."
          />
        </section>
      </div>

      <section className="card">
        <h2>History</h2>
        <ul className="logs">
          {rows.map((r) => (
            <li key={r.id}>
              <time dateTime={r.logged_at}>{when(r.logged_at)}</time>
              <b>{r.weight.toFixed(1)} lb</b>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

export default App
