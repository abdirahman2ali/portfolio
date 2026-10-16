const SVG_NS = 'http://www.w3.org/2000/svg';

const DETAILS = {
  src_db: 'Source. Operational database tables replicated into the warehouse.',
  src_saas: 'Source. Third-party SaaS data pulled in through connectors like Fivetran.',
  src_events: 'Source. Product and web events landing from a stream or batch export.',
  stg_db: 'Staging. One to one with the source: renames, casts and dedupe, no business logic.',
  stg_saas: 'Staging. Standardizes each vendor schema before anything is joined.',
  stg_events: 'Staging. Flattens raw event payloads into typed, queryable columns.',
  int_customers: 'Intermediate. Joins customer records across systems into one identity.',
  int_revenue: 'Intermediate. Reconciles orders and payments into revenue-ready rows.',
  int_sessions: 'Intermediate. Sessionizes raw events and attaches user context.',
  dim_customers: 'Mart. One row per customer with descriptive attributes.',
  fct_orders: 'Mart. One row per order, additive measures only.',
  fct_sessions: 'Mart. One row per session at the lowest grain.',
  dash: 'BI. Dashboards built on tested marts, never on raw tables.',
  explores: 'BI. Governed Explores so non-technical teams can answer their own questions.',
};

const EDGES = [
  ['src_db', 'stg_db'],
  ['src_saas', 'stg_saas'],
  ['src_events', 'stg_events'],
  ['stg_db', 'int_customers'],
  ['stg_saas', 'int_customers'],
  ['stg_db', 'int_revenue'],
  ['stg_saas', 'int_revenue'],
  ['stg_events', 'int_sessions'],
  ['stg_events', 'int_customers'],
  ['int_customers', 'dim_customers'],
  ['int_customers', 'fct_sessions'],
  ['int_revenue', 'fct_orders'],
  ['int_sessions', 'fct_sessions'],
  ['dim_customers', 'dash'],
  ['dim_customers', 'explores'],
  ['fct_orders', 'dash'],
  ['fct_orders', 'explores'],
  ['fct_sessions', 'explores'],
];

const graph = document.getElementById('lineage');
const detail = document.getElementById('lineage-detail');

if (graph && detail) {
  const svg = graph.querySelector('.lineage-edges');
  const nodes = new Map([...graph.querySelectorAll('.node')].map((el) => [el.dataset.id, el]));
  const defaultText = detail.textContent;
  const isMotionAllowed = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isHorizontalQuery = window.matchMedia('(min-width: 960px)');
  let edgeEls = [];
  let activeId = null;

  function collectLineage(id) {
    const lit = new Set([id]);
    const walk = (from, to) => {
      const queue = [id];
      while (queue.length) {
        const current = queue.shift();
        EDGES.forEach((edge) => {
          if (edge[from] === current && !lit.has(edge[to])) {
            lit.add(edge[to]);
            queue.push(edge[to]);
          }
        });
      }
    };
    walk(1, 0);
    walk(0, 1);
    return lit;
  }

  function buildPath(fromEl, toEl, origin) {
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    if (isHorizontalQuery.matches) {
      const x1 = a.right - origin.left;
      const y1 = a.top + a.height / 2 - origin.top;
      const x2 = b.left - origin.left;
      const y2 = b.top + b.height / 2 - origin.top;
      const mid = (x1 + x2) / 2;
      return `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
    }
    const x1 = a.left + a.width / 2 - origin.left;
    const y1 = a.bottom - origin.top;
    const x2 = b.left + b.width / 2 - origin.left;
    const y2 = b.top - origin.top;
    const mid = (y1 + y2) / 2;
    return `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`;
  }

  function addPulse(path, index) {
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('r', '3');
    dot.setAttribute('class', 'pulse');
    dot.setAttribute('visibility', 'hidden');
    const reveal = document.createElementNS(SVG_NS, 'set');
    reveal.setAttribute('attributeName', 'visibility');
    reveal.setAttribute('to', 'visible');
    reveal.setAttribute('begin', `${(index % 6) * 0.5}s`);
    dot.appendChild(reveal);
    const motion = document.createElementNS(SVG_NS, 'animateMotion');
    motion.setAttribute('dur', '3s');
    motion.setAttribute('begin', `${(index % 6) * 0.5}s`);
    motion.setAttribute('repeatCount', 'indefinite');
    motion.setAttribute('path', path);
    dot.appendChild(motion);
    svg.appendChild(dot);
  }

  function drawEdges() {
    svg.replaceChildren();
    const origin = graph.getBoundingClientRect();
    edgeEls = EDGES.map(([from, to], index) => {
      const d = buildPath(nodes.get(from), nodes.get(to), origin);
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'edge');
      svg.appendChild(path);
      if (isMotionAllowed) addPulse(d, index);
      return { from, to, path };
    });
    applyActive();
  }

  function applyActive() {
    const lit = activeId ? collectLineage(activeId) : null;
    graph.classList.toggle('has-active', Boolean(lit));
    nodes.forEach((el, id) => {
      el.classList.toggle('is-active', id === activeId);
      el.classList.toggle('is-lit', Boolean(lit) && lit.has(id));
    });
    edgeEls.forEach(({ from, to, path }) => {
      path.classList.toggle('is-lit', Boolean(lit) && lit.has(from) && lit.has(to));
    });
    detail.textContent = activeId ? DETAILS[activeId] : defaultText;
  }

  function setActive(id) {
    activeId = id;
    applyActive();
  }

  nodes.forEach((el, id) => {
    el.setAttribute('aria-describedby', detail.id);
    el.addEventListener('mouseenter', () => setActive(id));
    el.addEventListener('focus', () => {
      if (el.matches(':focus-visible')) setActive(id);
    });
    el.addEventListener('click', () => setActive(id));
  });
  graph.addEventListener('mouseleave', () => setActive(null));
  graph.addEventListener('focusout', (event) => {
    if (!graph.contains(event.relatedTarget)) setActive(null);
  });
  document.addEventListener('pointerdown', (event) => {
    if (!graph.contains(event.target)) setActive(null);
  });

  let lastWidth = 0;
  new ResizeObserver(() => {
    const width = Math.round(graph.getBoundingClientRect().width);
    if (width === lastWidth) return;
    lastWidth = width;
    drawEdges();
  }).observe(graph);
  isHorizontalQuery.addEventListener('change', drawEdges);
}
