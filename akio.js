(function () {
  const desktop = document.getElementById('desktop');
  const dock = document.getElementById('dock');
  const desktopShortcuts = document.getElementById('desktopShortcuts');
  const clock = document.getElementById('clock');
  const activeAppName = document.getElementById('activeAppName');
  const chatMessages = document.getElementById('chatMessages');
  const menuPopover = document.getElementById('menuPopover');
  const controlCenter = document.getElementById('controlCenter');
  const controlCenterButton = document.getElementById('controlCenterButton');
  const aiComposer = document.getElementById('aiComposer');
  const aiPrompt = document.getElementById('aiPrompt');
  const aiSendButton = document.getElementById('aiSendButton');
  const aiModelStatus = document.getElementById('aiModelStatus');
  const windows = {
    akio: document.getElementById('akio-window'),
    about: document.getElementById('about-window'),
    tech: document.getElementById('tech-window'),
    projects: document.getElementById('projects-window'),
    social: document.getElementById('social-window'),
    resume: document.getElementById('resume-window'),
    tetris: document.getElementById('tetris-window'),
    music: document.getElementById('music-window'),
    contact: document.getElementById('contact-window')
  };
  const appNames = { akio: 'Akio AI', about: 'About Me', tech: 'Technologies', projects: 'Projects', social: 'Loopline — Safari', resume: 'Resume', tetris: 'Tetris', music: 'Music', contact: 'Contact' };

  const desktopLauncherQuery = window.matchMedia('(min-width: 721px)');
  const dockReturnAnchor = dock.querySelector('.dock-item[data-window="about"]');
  function syncResponsiveLaunchers() {
    ['tetris', 'music', 'resume'].forEach(id => {
      const item = document.querySelector(`.dock-item[data-window="${id}"], .desktop-shortcut[data-window="${id}"]`);
      if (!item) return;
      if (desktopLauncherQuery.matches) {
        item.classList.replace('dock-item', 'desktop-shortcut');
        desktopShortcuts.appendChild(item);
      } else {
        item.classList.replace('desktop-shortcut', 'dock-item');
        dock.insertBefore(item, dockReturnAnchor);
      }
    });
    const techLauncher = dock.querySelector('.dock-item[data-window="tech"]');
    if (techLauncher) techLauncher.hidden = true;
  }
  syncResponsiveLaunchers();
  desktopLauncherQuery.addEventListener('change', syncResponsiveLaunchers);
  let topZ = 100;
  let responseTimer = null;
  let aiBusy = false;
  let aiRequestController = null;
  let conversation = [];
  let activeMenu = null;

  const responses = {
    about: `I'm **Akio Zaki Salomon**, a full-stack web developer based in **Santa Rosa City, Philippines**. I build websites and web applications, working on both the customer-facing pages and the systems behind them.`,
    tech: `Akio works with **HTML, CSS, JavaScript, React, Vite, Next.js, Node.js, Express, C#, SQL, PostgreSQL, MySQL, SQLite, Git, and GitHub**. Open the Technologies app to see the full visual toolkit.`,
    what: `Akio builds **customer-facing websites and web applications**. He handles the interface, server-side code, APIs, and databases, then connects everything into a complete working product.`,
    services: `Akio is open to **part-time and full-time work**. His entry-level rates are **₱15,000/month** for up to 20 hours per week, **₱30,000/month** for full-time Philippine roles, and **$800 USD/month** for full-time international remote roles. Rates are negotiable based on responsibilities. Open the **Contact app** to discuss an opportunity.`,
    contact: `Use the **Contact app** in the Dock to send Akio a message. It asks for your email and what you would like to discuss.`
  };

  const userPrompts = {
    about: 'Tell me about Akio.',
    tech: 'What technologies does Akio use?',
    what: 'What does Akio do?',
    services: 'How can I work with Akio?'
  };

  const guideAnswers = {
    about: {
      label: 'ABOUT AKIO',
      title: 'Akio Zaki Salomon',
      body: 'Akio is a full-stack web developer based in Santa Rosa City, Philippines. He works on both the pages people use and the systems behind them.',
      action: 'about',
      actionLabel: 'Open About Me'
    },
    tech: {
      label: 'TECHNOLOGIES',
      title: 'A complete web development toolkit',
      body: 'Akio uses HTML, CSS, JavaScript, React, Vite, Next.js, Node.js, Express, C#, SQL, PostgreSQL, MySQL, SQLite, Git, and GitHub.',
      action: 'tech',
      actionLabel: 'View all technologies'
    },
    what: {
      label: 'WHAT HE BUILDS',
      title: 'Websites and full web applications',
      body: 'Akio builds customer-facing websites and web applications. He handles the interface, server code, APIs, and databases, then connects them into one working product.'
    },
    services: {
      label: 'WORK WITH AKIO',
      title: 'Start with a clear message',
      body: 'Akio is available for part-time and full-time roles. His listed entry-level rates are ₱15,000/month part-time, ₱30,000/month full-time in the Philippines, and $800 USD/month for an international remote role. Rates are negotiable based on responsibilities.',
      action: 'contact',
      actionLabel: 'Open Contact'
    }
  };

  function updateClock() {
    const now = new Date();
    const compact = window.matchMedia('(max-width: 540px)').matches;
    clock.textContent = new Intl.DateTimeFormat('en-US', compact
      ? { hour: 'numeric', minute: '2-digit' }
      : { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    ).format(now).replace(/,/g, '');
    clock.dateTime = now.toISOString();
  }

  async function updateBattery() {
    if (!navigator.getBattery) return;
    try {
      const battery = await navigator.getBattery();
      const render = () => {
        const percent = Math.round(battery.level * 100);
        document.getElementById('batteryText').textContent = `${percent}%`;
        document.getElementById('batteryStatus').setAttribute('aria-label', `Battery ${percent} percent`);
        document.getElementById('batteryLevel').style.transform = `scaleX(${Math.max(.04, battery.level)})`;
        document.getElementById('batteryLevel').style.transformOrigin = '3px center';
      };
      render();
      battery.addEventListener('levelchange', render);
      battery.addEventListener('chargingchange', render);
    } catch (_) {}
  }

  function primaryDockItem(id) {
    return document.querySelector(`.dock-item[data-window="${id}"], .desktop-shortcut[data-window="${id}"]`);
  }

  function focusWindow(win) {
    document.querySelectorAll('.window').forEach(item => item.classList.remove('frontmost'));
    win.classList.add('frontmost');
    win.style.zIndex = ++topZ;
    const id = win.id.replace('-window', '');
    primaryDockItem(id)?.classList.add('active');
    activeAppName.textContent = appNames[id] || 'Portfolio';
  }

  function focusNextWindow() {
    const openWindows = [...document.querySelectorAll('.window.open')]
      .filter(win => !win.classList.contains('minimizing'))
      .sort((a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0));
    if (openWindows[0]) focusWindow(openWindows[0]);
    else activeAppName.textContent = 'Portfolio';
    desktop.classList.toggle('app-open', openWindows.length > 0);
  }

  function openWindow(id) {
    const win = windows[id];
    if (!win) return;
    win.classList.remove('minimizing');
    win.classList.add('open');
    win.dataset.minimized = 'false';
    focusWindow(win);
    desktop.classList.add('app-open');
    if (!desktopLauncherQuery.matches) {
      primaryDockItem(id)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    win.dispatchEvent(new CustomEvent('akio:window-open'));
    if (id === 'akio' && chatMessages.children.length === 0) showGreeting();
  }

  function closeWindow(id) {
    const win = windows[id];
    if (!win) return;
    win.classList.remove('open', 'frontmost', 'maximized', 'minimizing');
    win.dataset.minimized = 'false';
    primaryDockItem(id)?.classList.remove('active');
    win.dispatchEvent(new CustomEvent('akio:window-close'));
    focusNextWindow();
  }

  function minimizeWindow(win) {
    if (!win?.classList.contains('open')) return;
    win.classList.add('minimizing');
    win.dataset.minimized = 'true';
    window.setTimeout(() => {
      win.classList.remove('open', 'frontmost', 'minimizing');
      focusNextWindow();
    }, 280);
  }

  function toggleMaximize(win) {
    if (!win?.classList.contains('open') || win.hasAttribute('data-no-maximize')) return;
    win.classList.toggle('maximized');
    focusWindow(win);
  }

  function setGuideBusy(busy) {
    aiBusy = busy;
    document.querySelectorAll('.guide-question').forEach(button => button.disabled = busy);
    document.querySelectorAll('.ai-nav-button[data-ai-topic]').forEach(button => button.disabled = busy);
    aiPrompt.disabled = busy;
    aiSendButton.disabled = busy;
    if (busy) aiModelStatus.textContent = 'Thinking · trying available models';
  }

  function showGreeting() {
    chatMessages.innerHTML = `<div class="ai-empty-state"><span class="ai-empty-mark"><img src="images/AkioAI.png" alt=""></span><span><strong>How can I help?</strong><p>Akio AI is working through available models. Ask about Akio or anything else—some replies may take a moment.</p></span></div>`;
    aiModelStatus.textContent = 'AI is working · replies may take a moment';
  }

  function appendInlineMarkdown(parent, source) {
    const pattern = /(\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)]+)\)|\*\*([^*\n]+)\*\*|`([^`\n]+)`|\*([^*\n]+)\*)/g;
    let cursor = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      if (match.index > cursor) parent.appendChild(document.createTextNode(source.slice(cursor, match.index)));
      let element;
      if (match[2] && match[3]) {
        element = document.createElement('a');
        element.textContent = match[2];
        element.href = match[3];
        element.target = '_blank';
        element.rel = 'noopener noreferrer';
      } else if (match[4]) {
        element = document.createElement('strong');
        element.textContent = match[4];
      } else if (match[5]) {
        element = document.createElement('code');
        element.textContent = match[5];
      } else {
        element = document.createElement('em');
        element.textContent = match[6];
      }
      parent.appendChild(element);
      cursor = pattern.lastIndex;
    }
    if (cursor < source.length) parent.appendChild(document.createTextNode(source.slice(cursor)));
  }

  function renderMarkdown(container, source) {
    const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
    let paragraph = [];
    let list = null;
    let codeLines = null;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      const element = document.createElement('p');
      appendInlineMarkdown(element, paragraph.join(' '));
      container.appendChild(element);
      paragraph = [];
    };
    const closeList = () => { list = null; };
    const appendCode = () => {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = codeLines.join('\n');
      pre.appendChild(code);
      container.appendChild(pre);
      codeLines = null;
    };

    const tableCells = line => line.trim().slice(1, -1).split('|').map(cell => cell.trim());
    const isTableRow = line => {
      const trimmed = line.trim();
      return trimmed.startsWith('|') && trimmed.endsWith('|') && tableCells(line).length > 1;
    };
    const appendTableRow = (section, cells, cellTag) => {
      const row = document.createElement('tr');
      cells.forEach(value => {
        const cell = document.createElement(cellTag);
        appendInlineMarkdown(cell, value);
        row.appendChild(cell);
      });
      section.appendChild(row);
    };

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      if (/^\s*```/.test(line)) {
        if (codeLines) appendCode();
        else { flushParagraph(); closeList(); codeLines = []; }
        continue;
      }
      if (codeLines) { codeLines.push(line); continue; }
      if (!line.trim()) { flushParagraph(); closeList(); continue; }

      if (isTableRow(line) && lineIndex + 1 < lines.length && isTableRow(lines[lineIndex + 1])) {
        flushParagraph(); closeList();
        const rows = [];
        while (lineIndex < lines.length && isTableRow(lines[lineIndex])) {
          rows.push(tableCells(lines[lineIndex]));
          lineIndex += 1;
        }
        lineIndex -= 1;
        const table = document.createElement('table');
        const head = document.createElement('thead');
        const body = document.createElement('tbody');
        appendTableRow(head, rows[0], 'th');
        const hasDivider = rows[1]?.every(cell => /^:?-{3,}:?$/.test(cell));
        rows.slice(hasDivider ? 2 : 1).forEach(cells => appendTableRow(body, cells, 'td'));
        table.append(head, body);
        const wrapper = document.createElement('div');
        wrapper.className = 'ai-table-wrap';
        wrapper.appendChild(table);
        container.appendChild(wrapper);
        continue;
      }

      const heading = line.match(/^\s*(#{1,6})\s+(.+)$/);
      if (heading) {
        flushParagraph(); closeList();
        const element = document.createElement(`h${Math.min(heading[1].length + 1, 4)}`);
        appendInlineMarkdown(element, heading[2]);
        container.appendChild(element);
        continue;
      }

      const unordered = line.match(/^\s*[-*]\s+(.+)$/);
      const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (unordered || ordered) {
        flushParagraph();
        const type = unordered ? 'ul' : 'ol';
        if (!list || list.tagName.toLowerCase() !== type) {
          list = document.createElement(type);
          container.appendChild(list);
        }
        const item = document.createElement('li');
        appendInlineMarkdown(item, (unordered || ordered)[1]);
        list.appendChild(item);
        continue;
      }

      closeList();
      paragraph.push(line.trim());
    }
    if (codeLines) appendCode();
    flushParagraph();
  }

  function friendlyModelName(model) {
    const names = {
      'openai/gpt-oss-120b': 'GPT-OSS 120B',
      'nvidia/nemotron-3-ultra-550b-a55b': 'Nemotron 3 Ultra',
      'openai/gpt-oss-20b': 'GPT-OSS 20B',
      'meta/llama-3.1-8b-instruct': 'Llama 3.1 8B',
      'nvidia/nemotron-3-super-120b-a12b': 'Nemotron 3 Super'
    };
    return names[model] || model || 'NVIDIA NIM';
  }

  function appendAiMessage(role, text, options = {}) {
    chatMessages.querySelector('.ai-empty-state')?.remove();
    const row = document.createElement('article');
    row.className = `ai-message ${role}`;
    if (role === 'assistant') {
      const avatar = document.createElement('span');
      avatar.className = 'ai-message-avatar';
      avatar.innerHTML = '<img src="images/AkioAI.png" alt="">';
      row.appendChild(avatar);
    }
    const content = document.createElement('div');
    content.className = 'ai-message-content';
    if (options.loading) {
      content.innerHTML = '<div class="ai-thinking"><i></i><i></i><i></i></div>';
      row.dataset.loading = 'true';
    } else {
      if (role === 'assistant') renderMarkdown(content, text);
      else {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        content.appendChild(paragraph);
      }
      if (options.model) {
        const meta = document.createElement('small');
        meta.textContent = `Answered by ${friendlyModelName(options.model)}`;
        content.appendChild(meta);
      }
    }
    row.appendChild(content);
    chatMessages.appendChild(row);
    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return row;
  }

  async function sendAiMessage(text) {
    const prompt = text.trim();
    if (!prompt || aiBusy) return;
    conversation.push({ role: 'user', content: prompt });
    appendAiMessage('user', prompt);
    const loading = appendAiMessage('assistant', '', { loading: true });
    setGuideBusy(true);
    aiRequestController = new AbortController();
    try {
      const apiBaseUrl = String(window.__AKIO_API_BASE_URL__ || '').replace(/\/+$/, '');
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation.slice(-12) }),
        signal: aiRequestController.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Akio AI could not respond.');
      const answer = String(payload.message || '').trim();
      if (!answer) throw new Error('The model returned an empty response.');
      conversation.push({ role: 'assistant', content: answer });
      loading.remove();
      appendAiMessage('assistant', answer, { model: payload.model || 'NVIDIA NIM' });
      aiModelStatus.textContent = `Ready · ${friendlyModelName(payload.model)}`;
    } catch (error) {
      loading.remove();
      if (error.name !== 'AbortError') {
        appendAiMessage('error', error.message || 'Akio AI is temporarily unavailable.');
        aiModelStatus.textContent = 'Unavailable · check server configuration';
      }
    } finally {
      setGuideBusy(false);
      aiRequestController = null;
      aiPrompt.focus();
    }
  }

  function handlePrompt(promptId) {
    if (aiBusy || !userPrompts[promptId]) return;
    document.querySelectorAll('.guide-question').forEach(button => button.classList.toggle('selected', button.dataset.prompt === promptId));
    document.querySelectorAll('.ai-nav-button').forEach(button => button.classList.toggle('active', button.dataset.aiTopic === promptId));
    sendAiMessage(userPrompts[promptId]);
  }

  function newChat() {
    window.clearTimeout(responseTimer);
    aiRequestController?.abort();
    aiRequestController = null;
    conversation = [];
    setGuideBusy(false);
    document.querySelectorAll('.guide-question').forEach(button => button.classList.remove('selected'));
    document.querySelectorAll('.ai-nav-button').forEach(button => button.classList.toggle('active', button.dataset.aiView === 'overview'));
    aiPrompt.value = '';
    aiPrompt.style.height = '';
    aiModelStatus.textContent = 'Ready · automatic model fallback';
    showGreeting();
  }

  function showToast(title, detail) {
    document.querySelector('.desktop-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'desktop-toast';
    toast.innerHTML = `<strong>${title}</strong><span>${detail}</span>`;
    desktop.appendChild(toast);
    window.setTimeout(() => toast.classList.add('show'), 10);
    window.setTimeout(() => toast.remove(), 2800);
  }

  const menuDefinitions = {
    apple: [
      ['About This Portfolio', 'aboutCurrent'], ['divider'], ['System Settings…', 'settings'], ['divider'], ['Restart Desktop', 'restart']
    ],
    app: [
      ['About This Portfolio', 'aboutCurrent'], ['Reset Akio AI', 'newChat']
    ],
    file: [
      ['Open Projects', 'projects'], ['Open Resume', 'resume'], ['Open Contact', 'contact'], ['divider'], ['Close Window', 'close']
    ],
    edit: [
      ['Reset Guide', 'clearChat', '⌘R']
    ],
    view: [
      ['Toggle Dock', 'toggleDock'], ['Enter Full Screen', 'fullscreen', '⌃⌘F'], ['divider'], ['Actual Size', 'actualSize', '⌘0']
    ],
    window: [
      ['Minimize', 'minimize', '⌘M'], ['Zoom', 'maximize'], ['divider'], ['Akio AI', 'akio'], ['Resume', 'resume'], ['Music', 'music'], ['Technologies', 'tech'], ['Contact', 'contact']
    ],
    help: [
      ['Portfolio Guide', 'guide'], ['Send Akio a Message', 'contact']
    ]
  };

  function frontmostWindow() {
    return document.querySelector('.window.frontmost');
  }

  function runMenuAction(action) {
    const active = frontmostWindow();
    const activeId = active?.id.replace('-window', '');
    if (windows[action]) openWindow(action);
    else if (action === 'newChat') { openWindow('akio'); newChat(); }
    else if (action === 'clearChat') newChat();
    else if (action === 'close' && activeId) closeWindow(activeId);
    else if (action === 'minimize') minimizeWindow(active);
    else if (action === 'maximize') toggleMaximize(active);
    else if (action === 'settings') toggleControlCenter(true);
    else if (action === 'restart') window.location.reload();
    else if (action === 'toggleDock') dock.classList.toggle('dock-hidden');
    else if (action === 'fullscreen') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});
    else if (action === 'actualSize') showToast('Actual Size', 'The desktop is already shown at 100%.');
    else if (action === 'guide') showToast('Portfolio Guide', 'Start with Akio’s profile on the desktop. Use the Dock for AI, contact, and social links.');
    else if (action === 'aboutCurrent') showToast(`About ${activeAppName.textContent}`, 'A custom portfolio app built for Akio Zaki Salomon.');
  }

  function closeMenu() {
    menuPopover.classList.remove('open');
    menuPopover.setAttribute('aria-hidden', 'true');
    document.querySelectorAll('.menu-button.menu-open').forEach(button => button.classList.remove('menu-open'));
    activeMenu = null;
  }

  function openMenu(button) {
    const name = button.dataset.menu;
    if (activeMenu === name) { closeMenu(); return; }
    activeMenu = name;
    document.querySelectorAll('.menu-button.menu-open').forEach(item => item.classList.remove('menu-open'));
    button.classList.add('menu-open');
    menuPopover.replaceChildren();
    const currentAppMenu = activeAppName.textContent === 'Akio AI'
      ? [['About Akio AI', 'aboutCurrent'], ['Reset Guide', 'newChat']]
      : [[`About ${activeAppName.textContent}`, 'aboutCurrent'], ['divider'], ['Open Projects', 'projects'], ['Open Resume', 'resume'], ['Open Contact', 'contact']];
    const entries = name === 'app' ? currentAppMenu : (menuDefinitions[name] || []);
    entries.forEach(item => {
      if (item[0] === 'divider') {
        const divider = document.createElement('div');
        divider.className = 'menu-divider';
        menuPopover.appendChild(divider);
        return;
      }
      const menuItem = document.createElement('button');
      menuItem.type = 'button';
      menuItem.setAttribute('role', 'menuitem');
      menuItem.innerHTML = `<span>${item[0]}</span>${item[2] ? `<span class="shortcut">${item[2]}</span>` : ''}`;
      menuItem.addEventListener('click', () => { closeMenu(); runMenuAction(item[1]); });
      menuPopover.appendChild(menuItem);
    });
    const rect = button.getBoundingClientRect();
    menuPopover.style.left = `${Math.min(rect.left, window.innerWidth - 238)}px`;
    menuPopover.classList.add('open');
    menuPopover.setAttribute('aria-hidden', 'false');
  }

  function toggleControlCenter(forceOpen) {
    const open = typeof forceOpen === 'boolean' ? forceOpen : !controlCenter.classList.contains('open');
    controlCenter.classList.toggle('open', open);
    controlCenter.setAttribute('aria-hidden', String(!open));
    controlCenterButton.setAttribute('aria-expanded', String(open));
    if (open) closeMenu();
  }

  document.querySelectorAll('.guide-question').forEach(button => button.addEventListener('click', () => handlePrompt(button.dataset.prompt)));
  document.querySelectorAll('.ai-nav-button[data-ai-topic]').forEach(button => button.addEventListener('click', () => handlePrompt(button.dataset.aiTopic)));
  document.getElementById('newChatButton').addEventListener('click', newChat);
  aiComposer.addEventListener('submit', event => {
    event.preventDefault();
    const prompt = aiPrompt.value;
    if (!prompt.trim() || aiBusy) return;
    aiPrompt.value = '';
    aiPrompt.style.height = '';
    sendAiMessage(prompt);
  });
  aiPrompt.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      aiComposer.requestSubmit();
    }
  });
  aiPrompt.addEventListener('input', () => {
    aiPrompt.style.height = 'auto';
    aiPrompt.style.height = `${Math.min(aiPrompt.scrollHeight, 110)}px`;
  });
  document.querySelectorAll('[data-open-contact]').forEach(button => button.addEventListener('click', () => openWindow('contact')));
  document.querySelectorAll('[data-open-resume]').forEach(button => button.addEventListener('click', () => openWindow('resume')));
  document.querySelectorAll('[data-open-tech]').forEach(button => button.addEventListener('click', () => openWindow('tech')));
  document.querySelectorAll('[data-open-projects]').forEach(button => button.addEventListener('click', () => openWindow('projects')));
  document.querySelectorAll('[data-open-ai]').forEach(button => button.addEventListener('click', () => openWindow('akio')));
  document.querySelectorAll('[data-open-window]').forEach(button => button.addEventListener('click', () => openWindow(button.dataset.openWindow)));
  document.querySelector('.safari-reload')?.addEventListener('click', () => document.getElementById('socialFrame').contentWindow.location.reload());
  document.querySelectorAll('[data-ai-ask]').forEach(button => button.addEventListener('click', () => {
    openWindow('akio');
    sendAiMessage(button.dataset.aiAsk);
  }));

  const contactForm = document.getElementById('contactForm');
  const contactFrame = document.getElementById('contactSubmitFrame');
  const contactButton = contactForm.querySelector('button[type="submit"]');
  const contactStatus = document.getElementById('contactStatus');
  let contactSubmissionPending = false;
  let contactSubmissionTimeout = null;

  contactForm.addEventListener('submit', () => {
    if (!contactForm.checkValidity()) return;
    contactSubmissionPending = true;
    contactForm.classList.add('is-sending');
    contactButton.disabled = true;
    contactButton.innerHTML = 'Sending…';
    contactStatus.textContent = 'Sending your message securely…';
    window.clearTimeout(contactSubmissionTimeout);
    contactSubmissionTimeout = window.setTimeout(() => {
      if (!contactSubmissionPending) return;
      contactSubmissionPending = false;
      contactForm.classList.remove('is-sending');
      contactButton.disabled = false;
      contactButton.innerHTML = 'Send Message <svg class="button-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11 11 5m-5 0h5v5"/></svg>';
      contactStatus.textContent = 'This is taking longer than expected. Please try again.';
    }, 15000);
  });

  contactFrame.addEventListener('load', () => {
    if (!contactSubmissionPending) return;
    contactSubmissionPending = false;
    window.clearTimeout(contactSubmissionTimeout);
    contactForm.classList.remove('is-sending');
    contactButton.disabled = false;
    contactButton.innerHTML = 'Send Message <svg class="button-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11 11 5m-5 0h5v5"/></svg>';
    contactStatus.textContent = 'Message sent. Thank you — Akio will receive it by email.';
    contactForm.reset();
  });

  document.querySelectorAll('.dock-item, .desktop-shortcut').forEach(item => {
    if (item.hidden && item.dataset.window !== 'tech') return;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', item.querySelector('.label')?.textContent || item.dataset.appName || 'Open app');
    const activate = () => {
      item.classList.remove('bouncing');
      void item.offsetWidth;
      item.classList.add('bouncing');
      window.setTimeout(() => item.classList.remove('bouncing'), 680);
      if (item.dataset.url) { window.open(item.dataset.url, '_blank', 'noopener,noreferrer'); return; }
      openWindow(item.dataset.window);
    };
    item.addEventListener('click', activate);
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
  });

  dock.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    document.querySelectorAll('.dock-item').forEach(item => {
      const rect = item.getBoundingClientRect();
      const distance = Math.abs(event.clientX - (rect.left + rect.width / 2));
      const influence = Math.max(0, 1 - distance / 125);
      item.style.setProperty('--dock-scale', (1 + influence * influence * .42).toFixed(3));
      item.style.setProperty('--dock-lift', `${(-influence * influence * 14).toFixed(1)}px`);
    });
  });
  dock.addEventListener('pointerleave', () => document.querySelectorAll('.dock-item').forEach(item => {
    item.style.setProperty('--dock-scale', '1');
    item.style.setProperty('--dock-lift', '0px');
  }));

  const profilePanel = document.querySelector('.desktop-profile');
  const profileDragHandle = profilePanel?.querySelector('[data-profile-drag-handle]');
  profileDragHandle?.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || window.matchMedia('(max-width: 720px)').matches) return;
    const rect = profilePanel.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    profilePanel.style.left = `${rect.left}px`;
    profilePanel.style.top = `${rect.top}px`;
    profilePanel.style.transform = 'none';
    profilePanel.classList.add('is-dragging');
    profileDragHandle.setPointerCapture(event.pointerId);
    const move = moveEvent => {
      const maxX = Math.max(0, window.innerWidth - profilePanel.offsetWidth);
      const maxY = Math.max(30, window.innerHeight - profilePanel.offsetHeight - 88);
      profilePanel.style.left = `${Math.min(maxX, Math.max(0, moveEvent.clientX - offsetX))}px`;
      profilePanel.style.top = `${Math.min(maxY, Math.max(30, moveEvent.clientY - offsetY))}px`;
    };
    const stop = () => {
      profilePanel.classList.remove('is-dragging');
      profileDragHandle.removeEventListener('pointermove', move);
      profileDragHandle.removeEventListener('pointerup', stop);
      profileDragHandle.removeEventListener('pointercancel', stop);
    };
    profileDragHandle.addEventListener('pointermove', move);
    profileDragHandle.addEventListener('pointerup', stop);
    profileDragHandle.addEventListener('pointercancel', stop);
  });
  profileDragHandle?.addEventListener('dblclick', () => {
    if (window.matchMedia('(max-width: 720px)').matches) return;
    profilePanel.style.left = '50%';
    profilePanel.style.top = '36px';
    profilePanel.style.transform = 'translateX(-50%)';
  });

  document.querySelectorAll('.window').forEach(win => {
    const id = win.id.replace('-window', '');
    const header = win.querySelector('.win-header');
    win.addEventListener('pointerdown', () => focusWindow(win));
    win.querySelector('.close').addEventListener('click', event => { event.stopPropagation(); closeWindow(id); });
    win.querySelectorAll('.min, .max').forEach(control => {
      const isSafariControl = id === 'social' && control.dataset.action;
      if (isSafariControl) {
        control.disabled = false;
        control.tabIndex = 0;
        control.removeAttribute('aria-hidden');
        control.addEventListener('click', event => {
          event.stopPropagation();
          if (control.dataset.action === 'minimize') minimizeWindow(win);
          if (control.dataset.action === 'maximize') toggleMaximize(win);
        });
        return;
      }
      control.disabled = true;
      control.tabIndex = -1;
      control.setAttribute('aria-hidden', 'true');
      control.removeAttribute('title');
    });
    if (id === 'social') {
      header.addEventListener('dblclick', event => {
        if (event.target.closest('.dots') || window.matchMedia('(max-width: 720px)').matches) return;
        toggleMaximize(win);
      });
    }
    header.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || window.matchMedia('(max-width: 720px)').matches || event.button !== 0 || event.target.closest('.dots, .new-chat-button') || win.classList.contains('maximized')) return;
      focusWindow(win);
      const rect = win.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      win.style.left = `${rect.left}px`;
      win.style.top = `${rect.top}px`;
      win.style.transform = 'none';
      header.setPointerCapture(event.pointerId);
      const move = moveEvent => {
        const maxX = Math.max(0, window.innerWidth - win.offsetWidth);
        const maxY = Math.max(30, window.innerHeight - 115);
        win.style.left = `${Math.min(maxX, Math.max(0, moveEvent.clientX - offsetX))}px`;
        win.style.top = `${Math.min(maxY, Math.max(30, moveEvent.clientY - offsetY))}px`;
      };
      const stop = () => {
        header.removeEventListener('pointermove', move);
        header.removeEventListener('pointerup', stop);
        header.removeEventListener('pointercancel', stop);
      };
      header.addEventListener('pointermove', move);
      header.addEventListener('pointerup', stop);
      header.addEventListener('pointercancel', stop);
    });
  });

  document.querySelectorAll('.menu-button[data-menu]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    openMenu(button);
  }));
  controlCenterButton.addEventListener('click', event => { event.stopPropagation(); toggleControlCenter(); });
  controlCenter.addEventListener('click', event => event.stopPropagation());
  document.querySelectorAll('[data-setting]').forEach(button => button.addEventListener('click', () => {
    const enabled = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(enabled));
    button.classList.toggle('enabled', enabled);
    const small = button.querySelector('small');
    if (small) small.textContent = enabled ? (button.dataset.setting === 'wifi' ? 'Connected' : 'On') : 'Off';
  }));
  document.getElementById('brightnessControl').addEventListener('input', event => {
    desktop.style.filter = `brightness(${event.target.value}%)`;
  });
  document.querySelectorAll('[data-quick]').forEach(button => button.addEventListener('click', () => {
    toggleControlCenter(false);
    openWindow(button.dataset.quick);
  }));
  document.addEventListener('click', () => { closeMenu(); toggleControlCenter(false); });
  window.addEventListener('resize', closeMenu);

  updateClock();
  window.setInterval(updateClock, 1000);
  updateBattery();
  activeAppName.textContent = 'Portfolio';
  desktop.classList.add('ready');
})();
