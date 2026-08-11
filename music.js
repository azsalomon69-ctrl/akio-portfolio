(function () {
  const musicWindow = document.getElementById('music-window');
  if (!musicWindow) return;

  const audio = document.getElementById('musicAudio');
  const results = document.getElementById('musicResults');
  const status = document.getElementById('musicStatus');
  const searchForm = document.getElementById('musicSearchForm');
  const searchInput = document.getElementById('musicSearchInput');
  const trendingButton = document.getElementById('musicTrendingButton');
  const resultsTitle = document.getElementById('musicResultsTitle');
  const eyebrow = document.getElementById('musicEyebrow');
  const playerArt = document.getElementById('musicPlayerArt');
  const playerTitle = document.getElementById('musicPlayerTitle');
  const playerArtist = document.getElementById('musicPlayerArtist');
  const playPause = document.getElementById('musicPlayPause');
  const previousButton = document.getElementById('musicPrevious');
  const nextButton = document.getElementById('musicNext');
  const shuffleButton = document.getElementById('musicShuffle');
  const repeatButton = document.getElementById('musicRepeat');
  const progress = document.getElementById('musicProgress');
  const currentTime = document.getElementById('musicCurrentTime');
  const duration = document.getElementById('musicDuration');
  const volume = document.getElementById('musicVolume');
  const trackLink = document.getElementById('musicTrackLink');
  const apiKey = String(window.__AUDIUS_API_KEY__ || '').trim();

  let audius = null;
  let tracks = [];
  let currentIndex = -1;
  let initialized = false;
  let loading = false;
  let shuffle = false;
  let repeat = false;
  let playRequest = 0;
  let sdkLoadPromise = null;

  function loadAudiusSdk() {
    if (typeof window.audiusSdk === 'function') return Promise.resolve();
    if (sdkLoadPromise) return sdkLoadPromise;
    sdkLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@audius/sdk@16.0.0/dist/sdk.min.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.audiusSdk = 'true';
      script.addEventListener('load', () => {
        if (typeof window.audiusSdk === 'function') resolve();
        else reject(new Error('Audius SDK did not initialize'));
      }, { once: true });
      script.addEventListener('error', () => reject(new Error('Audius SDK could not load')), { once: true });
      document.head.appendChild(script);
    });
    return sdkLoadPromise;
  }

  function formatTime(value) {
    const total = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    const minutes = Math.floor(total / 60);
    return `${minutes}:${String(total % 60).padStart(2, '0')}`;
  }

  function artworkFor(track) {
    const artwork = track?.artwork || {};
    return artwork._480x480 || artwork['480x480'] || artwork._150x150 || artwork['150x150'] || '';
  }

  function artistFor(track) {
    return track?.user?.name || track?.user?.handle || 'Audius artist';
  }

  function audiusLinkFor(track) {
    const value = String(track?.permalink || '');
    return /^https:\/\/(www\.)?audius\.co\//i.test(value) ? value : 'https://audius.co';
  }

  function setStatus(message, kind = '') {
    status.textContent = message;
    status.dataset.kind = kind;
    status.hidden = !message;
  }

  function showSetupMessage() {
    results.replaceChildren();
    const card = document.createElement('div');
    card.className = 'music-setup-card';
    const mark = document.createElement('span');
    mark.textContent = '♪';
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = 'Connect the free music catalog';
    const body = document.createElement('p');
    body.textContent = 'Add your Audius API key in Vercel to enable live search, trending tracks, and playback.';
    const link = document.createElement('a');
    link.href = 'https://api.audius.co/plans';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Create a free Audius API key ↗';
    copy.append(title, body, link);
    card.append(mark, copy);
    results.appendChild(card);
    setStatus('Music player setup is required.', 'setup');
  }

  function renderTracks() {
    results.replaceChildren();
    if (!tracks.length) {
      const empty = document.createElement('div');
      empty.className = 'music-empty';
      empty.innerHTML = '<span>⌕</span><strong>No tracks found</strong><p>Try another song, artist, genre, or mood.</p>';
      results.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    tracks.forEach((track, index) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'music-track-row';
      row.dataset.trackId = String(track.id || '');
      row.setAttribute('aria-label', `Play ${track.title || 'track'} by ${artistFor(track)}`);

      const number = document.createElement('span');
      number.className = 'music-track-number';
      number.textContent = String(index + 1).padStart(2, '0');

      const art = document.createElement('span');
      art.className = 'music-track-art';
      const artUrl = artworkFor(track);
      if (artUrl) {
        const image = document.createElement('img');
        image.src = artUrl;
        image.alt = '';
        image.loading = 'lazy';
        art.appendChild(image);
      } else {
        art.textContent = '♪';
      }

      const identity = document.createElement('span');
      identity.className = 'music-track-identity';
      const title = document.createElement('strong');
      title.textContent = track.title || 'Untitled track';
      const artist = document.createElement('small');
      artist.textContent = artistFor(track);
      identity.append(title, artist);

      const genre = document.createElement('span');
      genre.className = 'music-track-genre';
      genre.textContent = track.genre || track.mood || 'Music';

      const length = document.createElement('span');
      length.className = 'music-track-duration';
      length.textContent = formatTime(Number(track.duration));

      const action = document.createElement('span');
      action.className = 'music-track-action';
      action.textContent = '▶';

      row.append(number, art, identity, genre, length, action);
      row.addEventListener('click', () => playTrack(index));
      fragment.appendChild(row);
    });
    results.appendChild(fragment);
    highlightCurrentTrack();
  }

  function highlightCurrentTrack() {
    const currentId = String(tracks[currentIndex]?.id || '');
    results.querySelectorAll('.music-track-row').forEach(row => {
      const active = Boolean(currentId) && row.dataset.trackId === currentId;
      row.classList.toggle('playing', active);
      const action = row.querySelector('.music-track-action');
      if (action) action.textContent = active && !audio.paused ? '❚❚' : '▶';
    });
  }

  function renderNowPlaying(track) {
    if (!track) return;
    playerTitle.textContent = track.title || 'Untitled track';
    playerArtist.textContent = artistFor(track);
    const artUrl = artworkFor(track);
    const fallback = playerArt.parentElement.querySelector('i');
    if (artUrl) {
      playerArt.src = artUrl;
      playerArt.hidden = false;
      fallback.hidden = true;
    } else {
      playerArt.removeAttribute('src');
      playerArt.hidden = true;
      fallback.hidden = false;
    }
    duration.textContent = formatTime(Number(track.duration));
    trackLink.href = audiusLinkFor(track);
  }

  async function playTrack(index) {
    const track = tracks[index];
    if (!track || !audius || loading) return;
    if (index === currentIndex && audio.src) {
      if (audio.paused) await audio.play().catch(() => setStatus('Press play again to start this track.', 'error'));
      else audio.pause();
      return;
    }

    currentIndex = index;
    audio.dataset.trackId = String(track.id || '');
    renderNowPlaying(track);
    highlightCurrentTrack();
    setStatus(`Loading “${track.title || 'track'}”…`);
    const requestId = ++playRequest;
    try {
      const streamUrl = await audius.tracks.getTrackStreamUrl({ trackId: track.id });
      if (requestId !== playRequest) return;
      audio.src = streamUrl;
      audio.volume = Number(volume.value);
      await audio.play();
      setStatus('');
    } catch (_) {
      if (requestId !== playRequest) return;
      setStatus('This track could not be played. Try another result.', 'error');
    }
  }

  async function loadTrending() {
    if (!audius || loading) return;
    loading = true;
    trendingButton.classList.add('active');
    eyebrow.textContent = 'DISCOVER';
    resultsTitle.textContent = 'Trending this week';
    setStatus('Loading trending tracks…');
    try {
      const response = await audius.tracks.getTrendingTracks({ time: 'week', limit: 24 });
      tracks = (response?.data || []).filter(track => track?.isStreamable !== false && track?.isStreamable !== 'false');
      currentIndex = tracks.findIndex(track => String(track.id) === String(audio.dataset.trackId || ''));
      renderTracks();
      setStatus(tracks.length ? '' : 'No trending tracks are available right now.');
    } catch (_) {
      setStatus('Audius could not load trending music. Please try again.', 'error');
    } finally {
      loading = false;
    }
  }

  async function searchTracks(query) {
    if (!audius || loading) return;
    const cleanQuery = query.trim().slice(0, 80);
    if (!cleanQuery) return loadTrending();
    loading = true;
    trendingButton.classList.remove('active');
    eyebrow.textContent = 'SEARCH RESULTS';
    resultsTitle.textContent = cleanQuery;
    setStatus(`Searching Audius for “${cleanQuery}”…`);
    try {
      const response = await audius.tracks.searchTracks({ query: cleanQuery, limit: 24, sortMethod: 'relevant' });
      tracks = (response?.data || []).filter(track => track?.isStreamable !== false && track?.isStreamable !== 'false');
      currentIndex = tracks.findIndex(track => String(track.id) === String(audio.dataset.trackId || ''));
      renderTracks();
      setStatus(tracks.length ? '' : `No music matched “${cleanQuery}”.`);
    } catch (_) {
      setStatus('Search is temporarily unavailable. Please try again.', 'error');
    } finally {
      loading = false;
    }
  }

  function nextTrack(direction = 1) {
    if (!tracks.length) return;
    let nextIndex;
    if (shuffle && tracks.length > 1) {
      do nextIndex = Math.floor(Math.random() * tracks.length);
      while (nextIndex === currentIndex);
    } else if (currentIndex < 0) {
      nextIndex = direction < 0 ? tracks.length - 1 : 0;
    } else {
      nextIndex = (currentIndex + direction + tracks.length) % tracks.length;
    }
    playTrack(nextIndex);
  }

  async function initialize() {
    if (initialized) return;
    initialized = true;
    if (!apiKey) {
      showSetupMessage();
      return;
    }
    try {
      setStatus('Connecting to the Audius music catalog…');
      await loadAudiusSdk();
      audius = window.audiusSdk({ apiKey });
      await loadTrending();
    } catch (_) {
      setStatus('The music service could not load. Check your connection and reopen Music.', 'error');
    }
  }

  searchForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!apiKey) return showSetupMessage();
    searchTracks(searchInput.value);
  });
  trendingButton.addEventListener('click', () => loadTrending());
  playPause.addEventListener('click', () => {
    if (!audio.src) {
      if (tracks.length) playTrack(currentIndex >= 0 ? currentIndex : 0);
      return;
    }
    if (audio.paused) audio.play().catch(() => setStatus('Playback could not start.', 'error'));
    else audio.pause();
  });
  previousButton.addEventListener('click', () => nextTrack(-1));
  nextButton.addEventListener('click', () => nextTrack(1));
  shuffleButton.addEventListener('click', () => {
    shuffle = !shuffle;
    shuffleButton.classList.toggle('active', shuffle);
    shuffleButton.setAttribute('aria-pressed', String(shuffle));
  });
  repeatButton.addEventListener('click', () => {
    repeat = !repeat;
    repeatButton.classList.toggle('active', repeat);
    repeatButton.setAttribute('aria-pressed', String(repeat));
  });
  volume.addEventListener('input', () => { audio.volume = Number(volume.value); });
  progress.addEventListener('input', () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = (Number(progress.value) / 1000) * audio.duration;
  });

  audio.addEventListener('play', () => {
    playPause.textContent = '❚❚';
    playPause.setAttribute('aria-label', 'Pause');
    playPause.title = 'Pause';
    highlightCurrentTrack();
  });
  audio.addEventListener('pause', () => {
    playPause.textContent = '▶';
    playPause.setAttribute('aria-label', 'Play');
    playPause.title = 'Play';
    highlightCurrentTrack();
  });
  audio.addEventListener('loadedmetadata', () => {
    duration.textContent = formatTime(audio.duration || Number(tracks[currentIndex]?.duration));
  });
  audio.addEventListener('timeupdate', () => {
    currentTime.textContent = formatTime(audio.currentTime);
    progress.value = Number.isFinite(audio.duration) && audio.duration > 0
      ? String(Math.round((audio.currentTime / audio.duration) * 1000))
      : '0';
  });
  audio.addEventListener('ended', () => {
    if (repeat) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      nextTrack(1);
    }
  });
  audio.addEventListener('error', () => {
    if (audio.src) setStatus('Playback stopped because the audio stream became unavailable.', 'error');
  });

  musicWindow.addEventListener('keydown', event => {
    if (!musicWindow.classList.contains('frontmost') || event.target.matches('input, button, a')) return;
    if (event.code === 'Space') {
      event.preventDefault();
      playPause.click();
    } else if (event.key === 'ArrowRight' && audio.src) {
      audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 5);
    } else if (event.key === 'ArrowLeft' && audio.src) {
      audio.currentTime = Math.max(0, audio.currentTime - 5);
    }
  });
  musicWindow.addEventListener('akio:window-open', initialize);
  musicWindow.addEventListener('akio:window-close', () => audio.pause());
})();
