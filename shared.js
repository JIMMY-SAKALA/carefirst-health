// ===== Shared Priority Queue System (localStorage-backed) =====

const STORAGE_KEY = 'carefirst_queue';
const ID_KEY = 'carefirst_nextId';

// Severity weights
const SEVERITY_SCORE = { critical: 100, severe: 70, moderate: 40, mild: 10 };

function calculatePriority(age, severity) {
  let score = SEVERITY_SCORE[severity] || 0;
  if (age >= 65) {
    score += 50;
    if (age >= 80) score += 20;
  }
  if (age <= 5) score += 30;
  return score;
}

// Load queue from localStorage
let queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let nextId = parseInt(localStorage.getItem(ID_KEY) || '1', 10);

// Seed demo data on first visit
if (queue.length === 0 && !localStorage.getItem('carefirst_seeded')) {
  const demo = [
    { name: 'Margaret Williams', age: 78, gender: 'Female', severity: 'severe', symptoms: 'Chest pain, shortness of breath' },
    { name: 'James Carter', age: 34, gender: 'Male', severity: 'mild', symptoms: 'Minor headache, sore throat' },
    { name: 'Robert Chen', age: 82, gender: 'Male', severity: 'critical', symptoms: 'Stroke symptoms, slurred speech' },
    { name: 'Sarah Ahmed', age: 45, gender: 'Female', severity: 'moderate', symptoms: 'High fever, body aches' },
    { name: 'Dorothy Evans', age: 91, gender: 'Female', severity: 'moderate', symptoms: 'Dizziness, joint pain' },
    { name: 'Michael Torres', age: 28, gender: 'Male', severity: 'mild', symptoms: 'Sprained ankle' },
  ];
  demo.forEach(d => {
    queue.push({
      id: nextId++,
      ...d,
      priority: calculatePriority(d.age, d.severity),
      status: 'waiting',
      arrivedAt: new Date().toISOString()
    });
  });
  saveQueue();
  localStorage.setItem('carefirst_seeded', 'true');
}

function saveQueue() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  localStorage.setItem(ID_KEY, String(nextId));
}

function getPriorityClass(score) {
  if (score >= 100) return 'priority-high';
  if (score >= 60)  return 'priority-medium';
  return 'priority-low';
}

function sortQueue() {
  queue.sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (b.status === 'done' && a.status !== 'done') return -1;
    if (a.status === 'serving' && b.status !== 'serving') return -1;
    if (b.status === 'serving' && a.status !== 'serving') return 1;
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.id - b.id;
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Animated counter
function animateCounter(el, target) {
  if (!el) return;
  const current = parseInt(el.textContent, 10) || 0;
  if (current === target) { el.textContent = target; return; }
  const diff = Math.abs(target - current);
  const step = target > current ? 1 : -1;
  const speed = Math.max(30, Math.min(80, 300 / diff));
  let val = current;
  const interval = setInterval(() => {
    val += step;
    el.textContent = val;
    if (val === target) clearInterval(interval);
  }, speed);
}

// Update just the stats (used on home page)
function updateStats() {
  const totalEl = document.getElementById('totalCount');
  const criticalEl = document.getElementById('criticalCount');
  const elderEl = document.getElementById('elderCount');
  const active = queue.filter(p => p.status !== 'done');
  animateCounter(totalEl, active.length);
  animateCounter(criticalEl, active.filter(p => p.severity === 'critical').length);
  animateCounter(elderEl, active.filter(p => p.age >= 65).length);
}

// Render the queue table (only on queue.html)
function renderQueue() {
  const tbody = document.getElementById('queueBody');
  updateStats();

  if (!tbody) return;

  if (queue.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No patients in the queue yet. <a href="register.html" style="color:var(--clr-primary);font-weight:700;">Register a patient</a>.</td></tr>';
    return;
  }

  sortQueue();

  tbody.innerHTML = queue.map((p, i) => {
    const prioClass = getPriorityClass(p.priority);
    const badgeClass = `badge-${p.severity}`;
    let statusClass, statusLabel;
    if (p.status === 'serving') { statusClass = 'status-serving'; statusLabel = 'Serving'; }
    else if (p.status === 'done') { statusClass = 'status-done'; statusLabel = 'Completed'; }
    else { statusClass = 'status-waiting'; statusLabel = 'Waiting'; }

    const elderTag = p.age >= 65 ? ' <span class="elder-tag">Elder</span>' : '';

    let actions = '';
    if (p.status === 'waiting') {
      actions = `<button class="btn btn-sm btn-success" onclick="servePatient(${p.id})">Serve</button>`;
    } else if (p.status === 'serving') {
      actions = `<button class="btn btn-sm btn-danger" onclick="completePatient(${p.id})">Done</button>`;
    } else {
      actions = '<span style="color:#b2bec3;">—</span>';
    }

    return `<tr>
      <td><strong>${i + 1}</strong></td>
      <td>${escapeHtml(p.name)}${elderTag}</td>
      <td>${p.age}</td>
      <td>${p.gender}</td>
      <td><span class="badge ${badgeClass}">${p.severity}</span></td>
      <td><span class="priority-score ${prioClass}">${p.priority}</span></td>
      <td><span class="${statusClass}">${statusLabel}</span></td>
      <td>${actions}</td>
    </tr>`;
  }).join('');
}

// Render a mini preview table (for home page)
function renderMiniQueue() {
  const tbody = document.getElementById('miniQueueBody');
  if (!tbody) return;

  const active = queue.filter(p => p.status !== 'done');
  sortQueue();
  const top5 = active.slice(0, 5);

  if (top5.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No patients yet. <a href="register.html" style="color:var(--clr-primary);font-weight:700;">Register one now</a>.</td></tr>';
    return;
  }

  tbody.innerHTML = top5.map((p, i) => {
    const badgeClass = `badge-${p.severity}`;
    const prioClass = getPriorityClass(p.priority);
    const elderTag = p.age >= 65 ? ' <span class="elder-tag">Elder</span>' : '';
    let statusClass, statusLabel;
    if (p.status === 'serving') { statusClass = 'status-serving'; statusLabel = 'Serving'; }
    else { statusClass = 'status-waiting'; statusLabel = 'Waiting'; }

    return `<tr>
      <td><strong>${i + 1}</strong></td>
      <td>${escapeHtml(p.name)}${elderTag}</td>
      <td><span class="badge ${badgeClass}">${p.severity}</span></td>
      <td><span class="priority-score ${prioClass}">${p.priority}</span></td>
      <td><span class="${statusClass}">${statusLabel}</span></td>
    </tr>`;
  }).join('');
}

// Add patient
function addPatient(name, age, gender, severity, symptoms) {
  const priority = calculatePriority(age, severity);
  queue.push({
    id: nextId++,
    name, age, gender, severity, symptoms, priority,
    status: 'waiting',
    arrivedAt: new Date().toISOString()
  });
  saveQueue();
}

// Serve patient
window.servePatient = function(id) {
  const p = queue.find(x => x.id === id);
  if (p) { p.status = 'serving'; saveQueue(); renderQueue(); }
};

// Complete patient
window.completePatient = function(id) {
  const p = queue.find(x => x.id === id);
  if (p) { p.status = 'done'; saveQueue(); renderQueue(); }
};

// ===== Mobile Nav Toggle =====
document.querySelector('.nav-toggle').addEventListener('click', function() {
  document.querySelector('.navbar').classList.toggle('open');
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('.navbar').classList.remove('open');
  });
});

// ===== Navbar scroll effect =====
window.addEventListener('scroll', () => {
  document.querySelector('.navbar').classList.toggle('scrolled', window.scrollY > 20);
});

// ===== Scroll-triggered fade-up animations =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.fade-up, .fade-left, .fade-right, .scale-in').forEach(el => observer.observe(el));
