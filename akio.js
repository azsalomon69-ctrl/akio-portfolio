(function () {
    'use strict';

    const appWindows = {
        recruitment: document.getElementById('recruitment-window'),
        resume: document.getElementById('resume-window'),
        contactSuccess: document.getElementById('contact-success-window'),
        akio: document.getElementById('akio-window'),
        tetris: document.getElementById('tetris-window'),
        music: document.getElementById('music-window')
    };

    let activeWindow = null;
    let previousFocus = null;

    function ageOnDate(birthYear, birthMonth, birthDay, today = new Date()) {
        let age = today.getFullYear() - birthYear;
        const birthdayPassed = today.getMonth() > birthMonth
            || (today.getMonth() === birthMonth && today.getDate() >= birthDay);
        if (!birthdayPassed) age -= 1;
        return age;
    }

    function experienceSince(startYear, startMonth, today = new Date()) {
        const totalMonths = Math.max(0, (today.getFullYear() - startYear) * 12 + today.getMonth() - startMonth);
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        const parts = [];
        if (years) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
        if (months) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
        return parts.length ? parts.join(' ') : 'Less than 1 month';
    }

    const currentAge = ageOnDate(2005, 4, 30);
    const currentExperience = experienceSince(2026, 6);
    document.querySelectorAll('#currentAge').forEach(element => { element.textContent = String(currentAge); });
    document.querySelectorAll('#heroExperienceDuration, #aboutExperienceDuration, #experienceDuration')
        .forEach(element => { element.textContent = currentExperience; });

    function closeApp(appWindow = activeWindow) {
        if (!appWindow) return;
        appWindow.classList.remove('open', 'frontmost');
        appWindow.hidden = true;
        appWindow.dispatchEvent(new CustomEvent('akio:window-close'));
        if (activeWindow === appWindow) activeWindow = null;
        document.body.classList.toggle('modal-open', Boolean(activeWindow));
        if (!activeWindow && previousFocus) previousFocus.focus({ preventScroll: true });
    }

    function openApp(name) {
        const appWindow = appWindows[name];
        if (!appWindow) return;
        if (activeWindow && activeWindow !== appWindow) closeApp(activeWindow);
        previousFocus = document.activeElement;
        appWindow.hidden = false;
        appWindow.classList.add('open', 'frontmost');
        activeWindow = appWindow;
        document.body.classList.add('modal-open');
        appWindow.dispatchEvent(new CustomEvent('akio:window-open'));
        const preferredFocus = appWindow.querySelector('textarea, canvas[tabindex], input, button');
        preferredFocus?.focus({ preventScroll: true });
    }

    document.querySelectorAll('[data-open-app]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            openApp(link.dataset.openApp);
        });
    });

    // Make each project card act as one large, keyboard-accessible link.
    document.querySelectorAll('.project-card').forEach(card => {
        const projectLink = card.querySelector('.project-link');
        const projectName = card.querySelector('h3')?.textContent.trim() || 'project';
        if (!projectLink) return;

        card.tabIndex = 0;
        card.setAttribute('role', 'link');
        card.setAttribute('aria-label', `${projectLink.textContent.trim()} — ${projectName}`);
        projectLink.tabIndex = -1;

        card.addEventListener('click', event => {
            if (event.target.closest('a, button')) return;
            projectLink.click();
        });

        card.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            projectLink.click();
        });
    });

    document.querySelectorAll('[data-close-app]').forEach(control => {
        control.addEventListener('click', () => closeApp(control.closest('.project-modal')));
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && activeWindow) {
            event.preventDefault();
            closeApp(activeWindow);
        }
    });

    const hashApps = {
        '#recruitment-application': 'recruitment',
        '#akio-ai': 'akio',
        '#resume': 'resume',
        '#browser-tetris': 'tetris',
        '#akio-music': 'music'
    };
    if (hashApps[window.location.hash]) openApp(hashApps[window.location.hash]);

    // Contact form: submit to the deployed Google Apps Script without leaving the portfolio.
    const contactForm = document.getElementById('contactForm');
    const contactFormStatus = document.getElementById('contactFormStatus');
    const contactSubmitFrame = document.getElementById('contactSubmitFrame');
    const contactSubmitButton = contactForm?.querySelector('button[type="submit"]');
    let contactSubmissionPending = false;
    let contactSubmissionTimeout;

    contactForm?.addEventListener('submit', () => {
        if (!contactForm.checkValidity()) return;

        contactSubmissionPending = true;
        contactForm.classList.add('is-sending');
        contactSubmitButton.disabled = true;
        contactSubmitButton.textContent = 'Sending...';

        contactFormStatus.textContent = 'Sending your message...';
        window.clearTimeout(contactSubmissionTimeout);
        contactSubmissionTimeout = window.setTimeout(() => {
            if (!contactSubmissionPending) return;
            contactSubmissionPending = false;
            contactForm.classList.remove('is-sending');
            contactSubmitButton.disabled = false;
            contactSubmitButton.textContent = 'Send Message';
            contactFormStatus.textContent = 'This is taking longer than expected. Please try again.';
        }, 15000);
    });

    contactSubmitFrame?.addEventListener('load', () => {
        if (!contactSubmissionPending) return;

        contactSubmissionPending = false;
        window.clearTimeout(contactSubmissionTimeout);
        contactForm.classList.remove('is-sending');
        contactSubmitButton.disabled = false;
        contactSubmitButton.textContent = 'Send Message';
        contactFormStatus.textContent = 'Message sent. Thank you — Akio will receive it shortly.';
        contactForm.reset();
        openApp('contactSuccess');
    });

    const resumePanel = document.querySelector('.resume-modal-panel');
    const resumeFullscreen = document.getElementById('resumeFullscreen');
    resumeFullscreen?.addEventListener('click', async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await resumePanel.requestFullscreen();
        } catch {
            window.open('images/Akio-Zaki-Salomon-Resume.pdf', '_blank', 'noopener,noreferrer');
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (resumeFullscreen) resumeFullscreen.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
    });

    // Akio AI chatbot
    const chatMessages = document.getElementById('chatMessages');
    const composer = document.getElementById('aiComposer');
    const promptInput = document.getElementById('aiPrompt');
    const sendButton = document.getElementById('aiSendButton');
    const modelStatus = document.getElementById('aiModelStatus');
    const newChatButton = document.getElementById('newChatButton');
    const apiBaseUrl = String(window.__AKIO_API_BASE_URL__ || '').trim().replace(/\/+$/, '');
    const conversation = [];
    let sending = false;

    function appendInlineMarkdown(parent, value) {
        const source = String(value || '');
        const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)]+\)|<br\s*\/?>|\*[^*\n]+\*|_[^_\n]+_)/gi;
        let cursor = 0;

        for (const match of source.matchAll(pattern)) {
            if (match.index > cursor) parent.append(document.createTextNode(source.slice(cursor, match.index)));
            const token = match[0];

            if (/^<br/i.test(token)) {
                parent.append(document.createElement('br'));
            } else if (token.startsWith('**') || token.startsWith('__')) {
                const strong = document.createElement('strong');
                strong.textContent = token.slice(2, -2);
                parent.append(strong);
            } else if (token.startsWith('`')) {
                const code = document.createElement('code');
                code.textContent = token.slice(1, -1);
                parent.append(code);
            } else if (token.startsWith('[')) {
                const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                const link = document.createElement('a');
                link.textContent = linkMatch[1];
                link.href = linkMatch[2];
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                parent.append(link);
            } else {
                const emphasis = document.createElement('em');
                emphasis.textContent = token.slice(1, -1);
                parent.append(emphasis);
            }
            cursor = match.index + token.length;
        }

        if (cursor < source.length) parent.append(document.createTextNode(source.slice(cursor)));
    }

    function pipeCells(line) {
        return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
    }

    function isTableDivider(line) {
        const cells = pipeCells(line);
        return cells.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
    }

    function renderMarkdown(target, markdown) {
        const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
        const fragment = document.createDocumentFragment();
        let index = 0;

        const addTextBlock = (tag, text, className = '') => {
            const element = document.createElement(tag);
            if (className) element.className = className;
            appendInlineMarkdown(element, text);
            fragment.append(element);
        };

        while (index < lines.length) {
            const line = lines[index];
            const trimmed = line.trim();
            if (!trimmed) {
                index += 1;
                continue;
            }

            const fence = trimmed.match(/^```([\w-]*)\s*$/);
            if (fence) {
                const codeLines = [];
                index += 1;
                while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
                    codeLines.push(lines[index]);
                    index += 1;
                }
                if (index < lines.length) index += 1;
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                if (fence[1]) code.dataset.language = fence[1];
                code.textContent = codeLines.join('\n');
                pre.append(code);
                fragment.append(pre);
                continue;
            }

            if (trimmed.includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
                const wrapper = document.createElement('div');
                wrapper.className = 'chat-table-wrap';
                const table = document.createElement('table');
                const head = document.createElement('thead');
                const headRow = document.createElement('tr');
                pipeCells(line).forEach(cell => {
                    const heading = document.createElement('th');
                    appendInlineMarkdown(heading, cell);
                    headRow.append(heading);
                });
                head.append(headRow);
                table.append(head);

                index += 2;
                const body = document.createElement('tbody');
                while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
                    const row = document.createElement('tr');
                    pipeCells(lines[index]).forEach(cell => {
                        const data = document.createElement('td');
                        appendInlineMarkdown(data, cell);
                        row.append(data);
                    });
                    body.append(row);
                    index += 1;
                }
                table.append(body);
                wrapper.append(table);
                fragment.append(wrapper);
                continue;
            }

            const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
            if (heading) {
                addTextBlock(`h${heading[1].length}`, heading[2]);
                index += 1;
                continue;
            }

            if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
                fragment.append(document.createElement('hr'));
                index += 1;
                continue;
            }

            const listMatch = trimmed.match(/^(?:([-*+])|(\d+)\.)\s+(.+)$/);
            if (listMatch) {
                const ordered = Boolean(listMatch[2]);
                const list = document.createElement(ordered ? 'ol' : 'ul');
                while (index < lines.length) {
                    const itemMatch = lines[index].trim().match(/^(?:([-*+])|(\d+)\.)\s+(.+)$/);
                    if (!itemMatch || Boolean(itemMatch[2]) !== ordered) break;
                    const item = document.createElement('li');
                    appendInlineMarkdown(item, itemMatch[3]);
                    list.append(item);
                    index += 1;
                }
                fragment.append(list);
                continue;
            }

            if (trimmed.startsWith('>')) {
                const quoteLines = [];
                while (index < lines.length && lines[index].trim().startsWith('>')) {
                    quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
                    index += 1;
                }
                addTextBlock('blockquote', quoteLines.join(' '));
                continue;
            }

            const paragraphLines = [trimmed];
            index += 1;
            while (index < lines.length) {
                const next = lines[index].trim();
                if (!next || /^```/.test(next) || /^(#{1,4})\s+/.test(next) || /^(?:[-*+]|\d+\.)\s+/.test(next) || next.startsWith('>')) break;
                if (next.includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1])) break;
                paragraphLines.push(next);
                index += 1;
            }
            addTextBlock('p', paragraphLines.join(' '));
        }

        target.replaceChildren(fragment);
    }

    function appendMessage(role, content, loading = false) {
        const article = document.createElement('article');
        article.className = `chat-message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
        if (loading) article.classList.add('is-loading');

        const avatar = document.createElement('span');
        avatar.className = `chat-avatar ${role === 'user' ? 'user-avatar' : 'assistant-avatar'}`;
        if (role === 'user') {
            avatar.textContent = 'YOU';
        } else {
            const logo = document.createElement('img');
            logo.src = 'images/AkioAI.png';
            logo.alt = 'Akio AI';
            avatar.appendChild(logo);
        }
        const text = document.createElement('div');
        text.className = 'chat-content';
        renderMarkdown(text, content);
        article.append(avatar, text);
        chatMessages.appendChild(article);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return article;
    }

    async function revealResponse(article, answer) {
        const target = article.querySelector('.chat-content');
        const pieces = String(answer).match(/\S+\s*/g) || [String(answer)];
        const wordsPerFrame = Math.max(1, Math.ceil(pieces.length / 150));
        let visible = '';
        article.classList.remove('is-loading');
        article.classList.add('is-streaming');

        for (let index = 0; index < pieces.length; index += wordsPerFrame) {
            visible += pieces.slice(index, index + wordsPerFrame).join('');
            renderMarkdown(target, visible);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            await new Promise(resolve => window.setTimeout(resolve, 20));
        }

        renderMarkdown(target, answer);
        article.classList.remove('is-streaming');
    }

    function resetChat() {
        conversation.length = 0;
        chatMessages.replaceChildren();
        appendMessage('assistant', 'Hi, I’m Akio AI. Ask me anything about Akio’s background, work, skills, or projects.');
        modelStatus.textContent = 'Ready';
        promptInput.value = '';
        promptInput.style.height = '';
        promptInput.focus();
    }

    function localPortfolioAnswer(question) {
        const value = question.toLowerCase();
        if (/tech|stack|language|framework|tool/.test(value)) {
            return 'Akio works with HTML, CSS, JavaScript, React, Vite, Next.js, Node.js, Express, C#, SQL, PostgreSQL, MySQL, SQLite, Git, and GitHub.';
        }
        if (/project|built|portfolio|tetris|music|loopline|recruit/.test(value)) {
            return '**Akio’s featured projects:**\n\n- **Recruitment Application** — an AI-assisted platform for campaign management, applicant assessment, scoring, and recommendations.\n- **Loopline Community** — a social application with profiles, posts, comments, follows, private messages, notifications, and moderation.\n- **Akio AI** — this portfolio chatbot, powered by five configured NVIDIA-hosted AI models.\n- **Browser Tetris** — a canvas game with scoring, levels, combos, hold, ghost pieces, and touch controls.\n- **Akio Music** — an Audius-powered application for discovering, searching, and playing music.';
        }
        if (/experience|company|professional|career|work/.test(value)) {
            return `Akio is a self-taught full-stack web developer with ${currentExperience} of professional experience since July 2026. Frontend development is his strongest area, and he also works on backend systems, APIs, and databases.`;
        }
        if (/contact|email|github|linkedin|reach/.test(value)) {
            return 'You can email Akio at azsalomon69@gmail.com, visit GitHub at github.com/azsalomon69-ctrl, or open the LinkedIn button at the top of this portfolio.';
        }
        if (/available|hire|remote|schedule|start/.test(value)) {
            return 'Akio is open to part-time, full-time, contract, and freelance work, with a preference for freelance opportunities. He is available for remote work and can start with one week’s notice.';
        }
        if (/rate|salary|cost|compensation/.test(value)) {
            return 'Akio’s listed entry-level rates are PHP 15,000 monthly for part-time work up to 20 hours per week, PHP 30,000 monthly for Philippine full-time roles, and USD 800 monthly for international remote roles. Compensation is negotiable.';
        }
        if (/who|about|background|akio/.test(value)) {
            return `Akio Zaki Salomon is a ${currentAge}-year-old self-taught web developer based in Santa Rosa City, Philippines. Frontend development is his strongest area, and he also builds backend systems, APIs, and databases.`;
        }
        return 'I can tell you about Akio’s experience, technology stack, projects, availability, rates, and contact details. Try asking “What projects has Akio built?” or “What technologies does he use?”';
    }

    async function sendMessage(value) {
        const message = String(value || '').trim();
        if (!message || sending) return;

        sending = true;
        sendButton.disabled = true;
        promptInput.disabled = true;
        appendMessage('user', message);
        conversation.push({ role: 'user', content: message });
        promptInput.value = '';
        promptInput.style.height = '';
        modelStatus.textContent = 'Connecting to Akio AI…';
        const loadingMessage = appendMessage('assistant', '', true);

        try {
            const response = await fetch(`${apiBaseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ messages: conversation.slice(-12) })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || `Chat request failed (${response.status})`);

            const answer = String(payload.message || '').trim();
            if (!answer) throw new Error('Akio AI returned an empty response.');
            modelStatus.textContent = 'Akio AI is responding…';
            await revealResponse(loadingMessage, answer);
            conversation.push({ role: 'assistant', content: answer });
            modelStatus.textContent = payload.model ? `Answered by ${payload.model}` : 'Ready';
        } catch (error) {
            const answer = localPortfolioAnswer(message);
            modelStatus.textContent = 'Akio AI is responding…';
            await revealResponse(loadingMessage, answer);
            conversation.push({ role: 'assistant', content: answer });
            modelStatus.textContent = 'Portfolio knowledge mode';
        } finally {
            sending = false;
            sendButton.disabled = false;
            promptInput.disabled = false;
            promptInput.focus();
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    composer?.addEventListener('submit', event => {
        event.preventDefault();
        sendMessage(promptInput.value);
    });

    promptInput?.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            composer.requestSubmit();
        }
    });

    promptInput?.addEventListener('input', () => {
        promptInput.style.height = 'auto';
        promptInput.style.height = `${Math.min(promptInput.scrollHeight, 130)}px`;
    });

    document.querySelectorAll('[data-question]').forEach(button => {
        button.addEventListener('click', () => sendMessage(button.dataset.question));
    });

    newChatButton?.addEventListener('click', resetChat);
})();
