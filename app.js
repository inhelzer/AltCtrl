const list = document.querySelector('#project-list');
const filters = document.querySelector('#filters');
const palette = {blue:'#4386eb',red:'#ff1010',green:'#25ad27',ice:'#7ea9e9'};
const sheetURL = 'https://docs.google.com/spreadsheets/d/1RyGqS-XI7gXp1W2PajUgS17Sys045HKsb23dl8lYoiI/gviz/tq?tqx=out:csv&sheet=Projects&headers=1';
const reviewAll = location.hostname === 'localhost' && new URLSearchParams(location.search).get('preview') === 'all';
let projects = [];
let selectedTag = null;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const hasContent = value => String(value ?? '').trim() !== '';

// CSV cells can contain commas, escaped quotes, and multiple lines.
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(cell); cell = '';
      if (char !== ',') {
        rows.push(row); row = [];
        if (char === '\r' && text[i + 1] === '\n') i++;
      }
    } else cell += char;
  }
  if (quoted) throw new Error('Incomplete CSV response');
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function sheetProjects(text) {
  const [headers, ...rows] = parseCSV(text);
  const required = ['ID','Project Name','Subtitle','Description','How it works','Credits','Year','Tag 1','Tag 2','Tag 3','Tag 4','Media Folder','Order','Published'];
  const columns = (headers || []).map(header => header.trim());
  if (required.some(header => !columns.includes(header))) throw new Error('Missing Projects sheet columns');
  const accents = new Map((window.PROJECTS || []).map(project => [project.id, project.accent]));
  return rows.map((row, rowIndex) => {
    const get = header => row[columns.indexOf(header)] ?? '';
    const order = get('Order').trim();
    return {
      id:get('ID'), name:get('Project Name'), subtitle:get('Subtitle'),
      description:get('Description'), how:get('How it works'), credits:get('Credits'),
      year:get('Year'), mediaFolder:get('Media Folder'),
      tags:[...new Set(['Tag 1','Tag 2','Tag 3','Tag 4'].map(get).map(tag => tag.trim()).filter(Boolean))],
      accent:accents.get(get('ID')) || 'blue', rowIndex,
      order:order !== '' && Number.isFinite(Number(order)) ? Number(order) : null,
      published:get('Published').trim().toUpperCase() === 'TRUE',
      extraPairs:row.slice(columns.indexOf('Published') + 1).reduce((pairs, value, i, cells) => {
        if (i % 2 === 0 && hasContent(value)) pairs.push({label:String(value).trim(), value:cells[i + 1] || ''});
        return pairs;
      }, [])
    };
  }).filter(project => hasContent(project.name) && (project.published || reviewAll)).sort((a, b) => {
    if (a.order === null && b.order === null) return a.rowIndex - b.rowIndex;
    if (a.order === null) return 1;
    if (b.order === null) return -1;
    return a.order - b.order || a.rowIndex - b.rowIndex;
  });
}

// Keep Sheet text escaped, including when making its HTTP(S) links clickable.
function linkedText(value) {
  const text = String(value ?? '');
  let html = '', cursor = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    html += escapeHTML(text.slice(cursor, match.index));
    const url = escapeHTML(match[0]);
    html += `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    cursor = match.index + match[0].length;
  }
  return html + escapeHTML(text.slice(cursor));
}
function paragraph(value, className = '') {
  return hasContent(value) ? `<p${className ? ` class="${className}"` : ''}>${linkedText(value)}</p>` : '';
}
// Only published assets live here. Drive folders remain the source/archive.
// Immutable media release: update alongside the hero URLs in index.html.
const mediaBase = 'https://raw.githubusercontent.com/inhelzer/AltCtrl-media/237c5f692869cfb8eecbb31b39167ba2ba4c362f/';
const mediaURL = path => mediaBase + path.split('/').map(encodeURIComponent).join('/');
function projectVideo(path, label, className = '') {
  return `<video class="project-media ${className}" controls playsinline preload="none" poster="${mediaURL(path.replace('.mp4', '-poster.jpg'))}" aria-label="${escapeHTML(label)}"><source src="${mediaURL(path)}" type="video/mp4">Your browser does not support video playback. <a href="${mediaURL(path)}">Download video</a></video>`;
}
function projectImage(path, alt) {
  return `<img class="project-media" src="${mediaURL(path)}" alt="${escapeHTML(alt)}" loading="lazy" decoding="async">`;
}
function safeLink(value) {
  try {
    const url = new URL(String(value).trim());
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
function graphicTitle(project, file, className) {
  const src = mediaURL(`${project.id}/${file}`);
  return `<h2 class="${className}"><span class="sr-only">${escapeHTML(project.name)}</span><img src="${src}" alt="" aria-hidden="true"></h2>`;
}
function studentWork(project, file, key, image = false) {
  const entry = (project.extraPairs || []).find(pair => new RegExp('\\b' + key + '\\b', 'i').test(pair.label));
  const name = entry?.label || '';
  const url = safeLink(entry?.value);
  const media = image ? projectImage(`008/${file}`, 'Mango King game artwork') : projectVideo(`008/${file}`, name || 'Student game demonstration');
  return `<figure class="student-work">${url ? `<a class="play-game" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" aria-label="PRESS TO PLAY — ${escapeHTML(name)}">PRESS TO PLAY</a>` : ''}${media}${name ? `<figcaption>${escapeHTML(name)}</figcaption>` : ''}</figure>`;
}
function presentation(project) {
  const pairs = project.extraPairs || [];
  const supplied = pairs.find(pair => /embed/i.test(pair.label))?.value || '';
  const iframeSrc = supplied.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || supplied.trim();
  let embed = '';
  try {
    const url = new URL(iframeSrc.replace(/&amp;/g, '&'));
    if (url.protocol === 'https:' && url.hostname === 'www.canva.com' && /^\/design\/[^/]+\/[^/]+\/view$/.test(url.pathname) && url.searchParams.has('embed') && !url.username && !url.password) embed = url.href;
  } catch {}
  const publicURL = safeLink(pairs.find(pair => /link\s*1|public/i.test(pair.label))?.value);
  return `${embed ? `<div class="presentation-frame"><iframe src="${escapeHTML(embed)}" title="${escapeHTML(project.name)} presentation" loading="lazy" allow="fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : '<p class="presentation-unavailable">The supplied presentation embed could not be validated.</p>'}${publicURL ? `<p class="presentation-link"><a href="${escapeHTML(publicURL)}" target="_blank" rel="noopener noreferrer">Open the presentation</a></p>` : ''}`;
}
// Supplied Unity graphics are served from the pinned media release.
function unityGraphic(color) {
  const src = mediaURL(`009/unity logo ${color}.png`);
  return `<img src="${src}" alt="Unity" loading="lazy" decoding="async">`;
}
function unityTitle(project) {
  return `<h2 class="unity-title"><span class="sr-only">${escapeHTML(project.name)}</span>${unityGraphic('black')}<span aria-hidden="true">${escapeHTML(project.name.replace(/^unity\s*/i, ''))}</span></h2>`;
}
function projectHeading(project) {
  return `${hasContent(project.name) ? (project.id === '009' ? unityTitle(project) : project.id === '008' ? graphicTitle(project, 'p5 headline.png', 'p5-title') : project.id === '010' ? graphicTitle(project, 'drum headline.png', 'drum-title') : project.id === '011' ? graphicTitle(project, 'headline.png', 'guitar-title') : project.id === '006' ? `<h2 class="snow-title"><span class="sr-only">${escapeHTML(project.name)}</span><img src="${mediaURL('006/head line.png')}" alt="" aria-hidden="true"></h2>` : `<h2>${escapeHTML(project.name)}</h2>`) : ''}${paragraph(project.subtitle, 'subtitle')}${paragraph(project.description)}`;
}
function projectExplanation(project) {
  return hasContent(project.how) ? `<h3>How it Works?</h3>${paragraph(project.how)}` : '';
}
function renderProject(project) {
  const up = '<a class="up" href="#projects" aria-label="Back to projects">⌃</a>';
  if (project.id === '001') {
    return `<article class="project project-kayak" data-project-id="001" style="--accent:${palette.green}">
      <div class="copy kayak-copy">${projectHeading(project)}${projectExplanation(project)}</div>
      ${projectVideo('001/kanu2.mp4', 'Kayak Workout gameplay', 'kayak-gameplay')}
      ${projectVideo('001/kanu1.mp4', 'Kayak Workout classroom demonstration', 'kayak-classroom')}
      <div class="kayak-detail">${projectVideo('001/kanu3.mp4', 'Kayak Workout paddle demonstration')}<div class="copy">${paragraph(project.credits, 'credits')}</div></div>${up}</article>`;
  }
  if (project.id === '002') {
    return `<article class="project project-gun" data-project-id="002" style="--accent:${palette.blue}">
      <div class="copy gun-heading">${projectHeading(project)}</div>
      <div class="gun-gallery">${projectImage('002/3.gif', 'Animated aiming targets in the game')}${projectImage('002/2.gif', 'Player aiming with a smartphone controller')}${projectImage('002/1.jpg', 'Examples of smartphone gun controllers')}</div>
      ${projectVideo('002/gun1.mp4', 'SmartPhone Gun demonstration', 'gun-video')}
      <div class="copy gun-explanation">${projectExplanation(project)}${paragraph(project.credits, 'credits')}</div>${up}</article>`;
  }
  const heading = `<div class="copy section-heading">${projectHeading(project)}</div>`;
  const details = `<div class="copy section-details">${projectExplanation(project)}${paragraph(project.credits, 'credits')}</div>`;
  const img = (name, alt) => projectImage(`${project.id}/${name}`, alt);
  const video = (name, label) => projectVideo(`${project.id}/${name}`, label);
  const layouts = {
    '003': {name:'football', accent:'red', content:`<div class="copy football-copy">${projectHeading(project)}${projectExplanation(project)}${paragraph(project.credits, 'credits')}</div><div class="football-gallery">${img('2.gif','Projected football game')}${img('1.gif','Outdoor kicking controller')}${img('4.gif','Football target controller detail')}${img('3.jpg','Football Kicker game screen')}</div>`},
    '004': {name:'drive', accent:'blue', content:`${heading}<div class="drive-demos">${video('drive.mp4','Driving controller demonstration')}${video('drive2.mp4','Driving steering demonstration')}</div><div class="copy">${projectExplanation(project)}</div>${video('driving-web.mp4','Drive Simulator gameplay')}<div class="copy">${paragraph(project.credits,'credits')}</div>`},
    '005': {name:'bike', accent:'red', content:`${heading}<div class="bike-details">${img('3.jpg','Bike Race classroom controller')}${img('2.gif','Pedaling the bike controller')}</div><div class="bike-main">${img('1.gif','Bike Race demonstration')}</div><div class="bike-explanation">${details}<div class="bike-tools">${img('micro1.png','Microbit')}</div></div>`},
    '006': {name:'snow', accent:'ice', content:`${heading}<div class="snow-gallery">${img('2.gif','Snowboarding gameplay')}${img('1.png','Snowboard controller player movements')}</div><div class="snow-explanation"><div class="copy">${projectExplanation(project)}</div>${img('3.png','Snowboard controller mechanism drawing')}</div><div class="copy">${paragraph(project.credits,'credits')}</div>`},
    '007': {name:'ddr', accent:'blue', content:`<div class="copy ddr-copy">${projectHeading(project)}${projectExplanation(project)}</div><div class="ddr-gallery"><div class="ddr-top">${img('2.jpg','Two players on the DDR platforms')}${img('1.jpg','Dance Dance Revolution and Simon game combination')}</div><div class="ddr-build">${img('5.gif','DDR platform in use')}<div>${img('3.jpg','Building the platform controller')}${img('4.jpg','Assembling the DDR platforms')}</div></div><div class="ddr-videos">${video('ddr2.mp4','DDR platform demonstration')}${video('dd1.mp4','Two player DDR and Simon demonstration')}</div></div><div class="copy ddr-credits">${paragraph(project.credits,'credits')}</div>`},
    '008': {name:'p5-experiments', accent:'blue', content:`${heading}<div class="p5-gallery">${studentWork(project,'liad.mp4','liad')}${studentWork(project,'liron.mp4','liron')}${studentWork(project,'tavor eviatar.mp4','tavor')}${studentWork(project,'yehonatan.mp4','yehonatan')}${studentWork(project,'Ron.mp4','ron')}${studentWork(project,'itai daniel.jpg','itai',true)}</div>${details}`},
    '009': {name:'avatars', accent:'blue', content:`${heading}<div class="avatar-creation"><div class="pose-source">${img('a5.png','MediaPipe pose tracking example')}</div><div class="avatar-models"><div class="avatar-portrait">${img('a4.png','Rabbit character model')}</div><div class="avatar-portrait">${img('a3.gif','Rotating rabbit character model')}<div class="avatar-overlay tripo-overlay">${img('tripo logo.png','Tripo')}</div></div><div class="avatar-portrait">${img('a2.png','Character rig controls')}<div class="avatar-overlay mixamo-overlay">${img('Mixamo logo.webp','Mixamo')}</div></div><div class="avatar-portrait">${img('a1.png','Character skeleton settings')}<div class="avatar-overlay unity-overlay">${unityGraphic('pink')}</div></div></div></div><div class="avatar-tests">${['b1','b2','b3','c1','c2','c3'].map((name,i)=>`<div class="avatar-test">${video(name+'.mp4','Body tracking game experiment '+(i+1))}${i===0 ? `<div class="avatar-overlay unity-overlay">${unityGraphic('pink')}</div>` : ''}</div>`).join('')}</div>${details}`},
    '010': {name:'drums', accent:'green', content:`${heading}<div class="drum-hero">${video('drum2.mp4','Drum Hero classroom demonstration')}</div><div class="drum-details">${img('2.jpg','DIY drum controller and electronics')}${img('1.gif','Drum Hero rhythm gameplay')}</div>${details}`},
    '011': {name:'guitar', accent:'green', content:`${heading}<div class="guitar-lineup">${img('a1.png','Collection of handmade guitar controllers')}</div><div class="guitar-gallery">${img('b3.png','Rock and Roll guitar design')}${img('b2.png','Guitar Hero Game Jam controllers')}${img('b1.png','Pink guitar controller gameplay')}</div><div class="copy guitar-how">${projectExplanation(project)}</div><div class="guitar-videos">${video('guitar2.mp4','Guitar Hero arcade demonstration')}${video('guitar1.mp4','Guitar controller player demonstration')}</div><div class="copy">${paragraph(project.credits,'credits')}</div>`},
    '012': {name:'piano', accent:'red', content:`${heading}<div class="piano-logo">${img('logo.png','Makey Makey')}</div><div class="piano-gallery">${img('3.png','Students playing the floor piano')}${img('2.JPG','Conductive piano keys and connections')}${img('1.jpg','Group floor piano activity')}</div><div class="piano-videos">${video('organ2.mp4','Floor piano performance')}${video('organ1.mp4','Group floor piano performance')}</div><div class="piano-bottom">${img('last.gif','Floor piano film reference')}${details}</div>`},
    '013': {name:'pose-bridge', accent:'ice', content:`<div class="copy pose-bridge-copy">${projectHeading(project)}${projectExplanation(project)}${paragraph(project.credits,'credits')}</div>${video('mediaPipe1.mp4','Unity 2D and MediaPipe prototype demonstration')}`},
    '014': {name:'presentation', accent:'blue', content:`${heading}${presentation(project)}${details}`}
  };
  const layout = layouts[project.id];
  if (layout) return `<article class="project project-${layout.name}" data-project-id="${escapeHTML(project.id)}" style="--accent:${palette[layout.accent]}">${layout.content}${up}</article>`;
  return `<article class="project project-simple" data-project-id="${escapeHTML(project.id)}" style="--accent:${palette[project.accent] || palette.blue}">${heading}${details}${up}</article>`;
}
function render(items) {
  list.innerHTML = items.map(renderProject).join('');
}
function renderFilters() {
  const tags = [...new Set(projects.flatMap(project => project.tags || []))];
  filters.replaceChildren();
  [null, ...tags].forEach(tag => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = tag === null ? 'ALL' : tag;
    button.classList.toggle('active', tag === selectedTag);
    button.setAttribute('aria-pressed', String(tag === selectedTag));
    button.addEventListener('click', () => {
      selectedTag = tag;
      renderFilters();
      render(tag === null ? projects : projects.filter(project => project.tags.includes(tag)));
    });
    filters.append(button);
  });
}
async function loadProjects() {
  try {
    const response = await fetch(sheetURL, {credentials:'omit', signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error(`Sheet returned HTTP ${response.status}`);
    projects = sheetProjects(await response.text());
    list.dataset.source = 'sheet';
  } catch (error) {
    console.warn('Could not load Projects sheet; using local fallback.', error);
    projects = (window.PROJECTS || []).filter(project => hasContent(project.name) && (project.published || reviewAll));
    list.dataset.source = 'fallback';
  }
  if (reviewAll) {
    const note = document.createElement('p');
    note.className = 'review-note';
    note.textContent = 'Local review · All named projects, including unpublished Sheet rows';
    filters.before(note);
  }
  renderFilters();
  render(projects);
}
// Pointer hover is the only trigger; the poster is the resting state.
const hands = document.querySelector('#hero-hands');
if (hands) {
  hands.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') hands.play().catch(() => {});
  });
  hands.addEventListener('pointerleave', () => {
    hands.pause();
    hands.load();
  });
}
loadProjects();
