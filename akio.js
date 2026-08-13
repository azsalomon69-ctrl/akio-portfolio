(function () {
    'use strict';

    const appWindows = {
        akio: document.getElementById('akio-window'),
        tetris: document.getElementById('tetris-window'),
        music: document.getElementById('music-window')
    };

    let activeWindow = null;
    let previousFocus = null;

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
        '#akio-ai': 'akio',
        '#browser-tetris': 'tetris',
        '#akio-music': 'music'
    };
    if (hashApps[window.location.hash]) openApp(hashApps[window.location.hash]);

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

    function appendMessage(role, content, loading = false) {
        const article = document.createElement('article');
        article.className = `chat-message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
        if (loading) article.classList.add('is-loading');

        const avatar = document.createElement('span');
        avatar.textContent = role === 'user' ? 'YOU' : 'AI';
        const text = document.createElement('p');
        text.textContent = content;
        article.append(avatar, text);
        chatMessages.appendChild(article);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return article;
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
            return 'Akio’s featured work includes an AI-assisted recruitment application, Loopline Community, Akio AI, Browser Tetris, and Akio Music. The recruitment application covered frontend, backend, APIs, database integration, and security-related implementation.';
        }
        if (/experience|company|professional|career|work/.test(value)) {
            return 'Akio is a full-stack web developer with one year of professional company experience. He built an AI-assisted recruitment application and worked across its frontend, backend, APIs, database integration, and security-related implementation.';
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
            return 'Akio Zaki Salomon is a full-stack web developer based in Santa Rosa City, Philippines. He builds customer-facing interfaces and the server, API, and database systems behind them.';
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
        modelStatus.textContent = 'Akio AI is thinking…';
        const loadingMessage = appendMessage('assistant', 'Thinking…', true);

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
            loadingMessage.querySelector('p').textContent = answer;
            loadingMessage.classList.remove('is-loading');
            conversation.push({ role: 'assistant', content: answer });
            modelStatus.textContent = payload.model ? `Answered by ${payload.model}` : 'Ready';
        } catch (error) {
            const answer = localPortfolioAnswer(message);
            loadingMessage.querySelector('p').textContent = answer;
            loadingMessage.classList.remove('is-loading');
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
