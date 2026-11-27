const KEY = 'road_issues_data';
const CREWS = ['Unassigned', 'Road Crew A', 'Signal Team B', 'Maintenance Team C'];
const STATUSES = ['Reported', 'Assigned', 'In Progress', 'Resolved'];
const RANK = { High: 1, Medium: 2, Low: 3 };

const $ = (id) => document.getElementById(id);
const form = $('report-form');
const banner = $('status-banner');
const resolveDialog = $('resolve-dialog');
const tabs = [...document.querySelectorAll('[role="tab"]')];

let issues = [];
let photoData = '';
let resolveTarget = null;

function starterData() {
  return [
    { id: 'ISS-1', type: 'Broken Signal', location: 'Main St & 5th Ave', severity: 'High', description: 'Traffic signal is out at intersection.', photo: '', status: 'Assigned', crew: 'Signal Team B', reportedDate: '2026-11-24', resolutionNote: '', resolvedDate: '' },
    { id: 'ISS-2', type: 'Pothole', location: 'Elm Blvd near Oak Park', severity: 'Medium', description: 'Deep pothole in the right lane.', photo: '', status: 'Reported', crew: 'Unassigned', reportedDate: '2026-11-25', resolutionNote: '', resolvedDate: '' },
    { id: 'ISS-3', type: 'Damaged Road', location: 'River Rd Bridge', severity: 'High', description: 'Cracked pavement near bridge entrance.', photo: '', status: 'Resolved', crew: 'Road Crew A', reportedDate: '2026-11-20', resolutionNote: 'Filled cracks and repaved.', resolvedDate: '2026-11-22' }
  ];
}

function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function make(tag, text, cls) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (cls) el.className = cls;
  return el;
}

function makeTime(dateStr) {
  const t = make('time', dateStr);
  t.setAttribute('datetime', dateStr);
  return t;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(issues));
    return true;
  } catch {
    banner.textContent = 'Storage full. Please use a smaller photo.';
    return false;
  }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(saved)) { issues = saved; return; }
  } catch { /* fall back to starter */ }
  issues = starterData();
  save();
}

function commit(msg) {
  save();
  renderAll();
  banner.textContent = msg;
}

// Tabs
function openTab(target) {
  tabs.forEach((btn) => {
    const on = btn === target;
    btn.setAttribute('aria-selected', String(on));
    btn.tabIndex = on ? 0 : -1;
    $(btn.getAttribute('aria-controls')).hidden = !on;
  });
}

tabs.forEach((btn, i) => {
  btn.addEventListener('click', () => openTab(btn));
  btn.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    openTab(next);
    next.focus();
  });
});

// Photo preview
$('issue-photo').addEventListener('change', function () {
  const file = this.files[0];
  if (!file || !file.type.startsWith('image/')) {
    photoData = '';
    $('photo-preview').hidden = true;
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    photoData = e.target.result;
    $('photo-img').src = photoData;
    $('photo-caption').textContent = file.name;
    $('photo-preview').hidden = false;
  };
  reader.readAsDataURL(file);
});

// Submit issue
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const nextNum = issues.reduce((m, x) => Math.max(m, Number(x.id.replace('ISS-', '')) || 0), 0) + 1;
  const issue = {
    id: 'ISS-' + nextNum,
    type: $('issue-type').value,
    location: $('issue-location').value.trim(),
    severity: document.querySelector('input[name="severity"]:checked').value,
    description: $('issue-description').value.trim(),
    photo: photoData,
    status: 'Reported',
    crew: 'Unassigned',
    reportedDate: today(),
    resolutionNote: '',
    resolvedDate: ''
  };

  issues.unshift(issue);
  if (!save()) { issues.shift(); return; }
  photoData = '';
  $('photo-preview').hidden = true;
  form.reset();
  renderAll();
  openTab($('tab-queue'));
  banner.textContent = 'Issue ' + issue.id + ' submitted to Priority Queue.';
});

function makeSelect(id, labelText, list, current, onChange) {
  const wrap = make('div');
  const label = make('label', labelText);
  label.htmlFor = id;
  const select = make('select');
  select.id = id;
  list.forEach((v) => {
    const opt = make('option', v);
    opt.value = v;
    if (v === current) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => onChange(select));
  wrap.append(label, select);
  return wrap;
}

// Priority Queue
function renderQueue() {
  const sevF = $('filter-severity').value;
  const statF = $('filter-status').value;
  const list = $('queue-list');

  const active = issues
    .filter((i) => i.status !== 'Resolved' && (sevF === 'All' || i.severity === sevF) && (statF === 'All' || i.status === statF))
    .sort((a, b) => RANK[a.severity] - RANK[b.severity] || b.reportedDate.localeCompare(a.reportedDate));

  list.textContent = '';
  $('queue-empty').hidden = active.length > 0;

  active.forEach((issue) => {
    const card = make('article', '', 'box');
    card.append(
      make('h3', issue.type + ' - ' + issue.location),
      make('span', issue.severity, 'badge ' + issue.severity.toLowerCase()),
      make('p', issue.description)
    );

    const dl = make('dl');
    [['Location', issue.location], ['Status', issue.status], ['Crew', issue.crew], ['Reported', makeTime(issue.reportedDate)]].forEach(([k, v]) => {
      const box = make('div');
      const dd = make('dd');
      if (typeof v === 'string') dd.textContent = v;
      else dd.appendChild(v);
      box.append(make('dt', k), dd);
      dl.appendChild(box);
    });
    card.appendChild(dl);

    if (issue.photo) {
      const fig = make('figure');
      const img = make('img');
      img.src = issue.photo;
      img.alt = issue.type + ' at ' + issue.location;
      fig.append(img, make('figcaption', 'Photo for ' + issue.id));
      card.appendChild(fig);
    }

    const row = make('div', '', 'row');
    const resBtn = make('button', 'Mark Resolved', 'blue');
    resBtn.type = 'button';
    resBtn.addEventListener('click', () => openResolve(issue, null));

    row.append(
      makeSelect('assign-' + issue.id, 'Work Assignment', CREWS, issue.crew, (s) => {
        issue.crew = s.value;
        if (issue.crew !== 'Unassigned' && issue.status === 'Reported') issue.status = 'Assigned';
        else if (issue.crew === 'Unassigned' && issue.status === 'Assigned') issue.status = 'Reported';
        commit('Assigned ' + issue.id + ' to ' + issue.crew + '.');
      }),
      makeSelect('status-' + issue.id, 'Status', STATUSES, issue.status, (s) => {
        if (s.value === 'Resolved') return openResolve(issue, s);
        issue.status = s.value;
        commit('Updated ' + issue.id + ' status to ' + issue.status + '.');
      }),
      resBtn
    );
    card.appendChild(row);
    list.appendChild(card);
  });
}

// Resolution Records
function renderRecords() {
  const tbody = $('records-tbody');
  const done = issues.filter((i) => i.status === 'Resolved').sort((a, b) => b.resolvedDate.localeCompare(a.resolvedDate));
  tbody.textContent = '';
  $('records-box').hidden = done.length === 0;
  $('records-empty').hidden = done.length > 0;

  done.forEach((issue) => {
    const tr = make('tr');
    const photoTd = make('td');
    if (issue.photo) {
      const img = make('img', '', 'thumb');
      img.src = issue.photo;
      img.alt = issue.type + ' at ' + issue.location;
      photoTd.appendChild(img);
    } else {
      photoTd.textContent = 'No photo';
    }
    const dateTd = make('td');
    dateTd.appendChild(makeTime(issue.resolvedDate));
    tr.append(make('td', issue.type), make('td', issue.location), photoTd, make('td', issue.crew), make('td', issue.resolutionNote), dateTd);
    tbody.appendChild(tr);
  });
}

// Resolve dialog
function openResolve(issue, selectEl) {
  resolveTarget = { issue, selectEl };
  $('resolve-summary').textContent = issue.type + ' - ' + issue.location;
  $('resolution-note').value = '';
  resolveDialog.returnValue = '';
  resolveDialog.showModal();
}

resolveDialog.addEventListener('close', () => {
  const ans = resolveDialog.returnValue;
  resolveDialog.returnValue = '';
  if (!resolveTarget) return;
  const { issue, selectEl } = resolveTarget;
  resolveTarget = null;

  if (ans === 'confirm') {
    issue.status = 'Resolved';
    issue.resolutionNote = $('resolution-note').value.trim();
    issue.resolvedDate = today();
    commit('Moved ' + issue.id + ' to Resolution Records.');
  } else if (selectEl) {
    selectEl.value = issue.status;
  }
});

function renderAll() {
  const activeCount = issues.filter((i) => i.status !== 'Resolved').length;
  $('queue-count').textContent = activeCount;
  $('records-count').textContent = issues.length - activeCount;
  renderQueue();
  renderRecords();
}

$('filter-severity').addEventListener('change', renderQueue);
$('filter-status').addEventListener('change', renderQueue);

load();
renderAll();
