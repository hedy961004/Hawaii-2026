// Home-only itinerary presentation. Records and permissions remain in Supabase.
export function hawaiiClock(now = new Date()) {
  const fields = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Pacific/Honolulu', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).map(p => [p.type, p.value]));
  return {date: `${fields.year}-${fields.month}-${fields.day}`, minutes: Number(fields.hour) * 60 + Number(fields.minute)};
}
export function homeTripPhase(now, dates) {
  const clock = hawaiiClock(now);
  if (clock.date < dates[0]) return {...clock, status: 'before', index: -1};
  if (clock.date > dates.at(-1)) return {...clock, status: 'after', index: -1};
  return {...clock, status: 'during', index: dates.indexOf(clock.date)};
}
export function renderHomeTrip({now = new Date(), dates, days, activities, focusIds, overview, reference, escape: esc, mapLink, action}) {
  const phase = homeTripPhase(now, dates);
  if (phase.status === 'before') return overview();
  if (phase.status === 'after') return `<section class="card home-trip-ended" data-trip-phase="after"><h2>旅行已结束</h2><p class="muted">完整 8 天行程与预订仍保留在「行程」中。</p>${action('overview-day', 0, '查看完整行程', 'secondary')}</section>`;
  const index = phase.index, day = days[index] || {}, items = activities.filter(a => a.day === index);
  const focus = (focusIds[index] || []).map(id => items.find(a => a.id === id)).filter(Boolean);
  const highlights = (focus.length ? focus : items).slice(0, 3);
  const timed = items.map(item => ({item, ref: reference(item)})).filter(({ref}) => /^([01]\d|2[0-3]):[0-5]\d$/.test(ref.time || '') && (!ref.date || ref.date === phase.date)).map(row => ({...row, minutes: Number(row.ref.time.slice(0, 2)) * 60 + Number(row.ref.time.slice(3))})).sort((a, b) => a.minutes - b.minutes);
  const next = timed.find(a => a.minutes >= phase.minutes);
  const unknown = items.find(a => {const ref = reference(a); return !ref.time && (!ref.date || ref.date === phase.date);});
  const weekday = new Intl.DateTimeFormat('zh-CN', {weekday: 'long', timeZone: 'UTC'}).format(new Date(phase.date + 'T12:00:00Z'));
  const nextHtml = next ? `<p class="home-next-stop"><span>下一站 · ${esc(next.ref.time)} HST</span>${mapLink(next.item)}</p>` : unknown ? `<p class="home-next-stop"><span>下一站时间待定 · 请核对当天安排</span>${mapLink(unknown)}</p>` : `<p class="muted">${timed.length ? '今天已知时间的安排已过；未据此认定活动已完成。' : '当天活动待补。'}</p>`;
  return `<section class="home-today" data-trip-phase="during" aria-labelledby="home-today-heading"><div class="section-head"><h2 id="home-today-heading">今日行程</h2><span class="muted">按夏威夷日期 · HST</span></div><article class="card home-today-card"><div class="home-day-meta"><b>Day ${index + 1}</b><time datetime="${phase.date}">${phase.date.slice(5).replace('-', '/')} ${weekday}</time></div><p class="home-today-region">${esc(day.place || '区域待定')}</p><h3>${esc(day.title || '当天安排待定')}</h3><p class="muted">${esc(day.summary || '当天概要待补')}</p>${highlights.length ? `<p class="home-today-highlights">${highlights.map(mapLink).join(' · ')}</p>` : ''}${nextHtml}<div class="home-today-actions">${action('overview-day', index, '查看今天的行程', 'primary')}</div></article></section>`;
}
