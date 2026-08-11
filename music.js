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
  const apiBaseUrl = String(window.__AKIO_API_BASE_URL__ || '').trim().replace(/\/+$/, '');

  let tracks = [];
  let currentIndex = -1;
  let initialized = false;
  let loading = false;
  let shuffle = false;
  let repeat = false;
  let playRequest = 0;

  function musicApiUrl(action, params = {}) {
    const endpoint = new URL(`${apiBaseUrl}/api/music`, window.location.origin);
    endpoint.searchParams.set('action', action);
    for (const [name, value] of Object.entries(params)) endpoint.searchParams.set(name, String(value));
    return endpoint.toString();
  }

  async function fetchMusic(action, params) {
    const response = await fetch(musicApiUrl(action, params), { headers: { Accept: 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error || `Music request failed with ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
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

  function playableTracks(items) {
    return (items || []).filter(track => track
      && track.isStreamable !== false
      && track.isStreamable !== 'false'
      && track.isStreamGated !== true
      && !track.streamConditions);
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
    if (!track || loading) return;
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
      const streamUrl = musicApiUrl('stream', { id: track.id });
      if (requestId !== playRequest) return;
      audio.src = streamUrl;
      audio.volume = Number(volume.value);
      try {
        await audio.play();
        setStatus('');
      } catch (error) {
        if (error?.name === 'NotAllowedError') {
          setStatus('The track is ready. Press Play to start listening.');
          return;
        }
        throw error;
      }
    } catch (error) {
      if (requestId !== playRequest) return;
      setStatus('This track is unavailable from Audius. Try another result.', 'error');
    }
  }

  async function loadTrending() {
    if (loading) return;
    loading = true;
    trendingButton.classList.add('active');
    eyebrow.textContent = 'DISCOVER';
    resultsTitle.textContent = 'Trending this week';
    setStatus('Loading trending tracks…');
    try {
      const response = await fetchMusic('trending');
      tracks = playableTracks(response?.data);
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
    if (loading) return;
    const cleanQuery = query.trim().slice(0, 80);
    if (!cleanQuery) return loadTrending();
    loading = true;
    trendingButton.classList.remove('active');
    eyebrow.textContent = 'SEARCH RESULTS';
    resultsTitle.textContent = cleanQuery;
    setStatus(`Searching Audius for “${cleanQuery}”…`);
    try {
      const response = await fetchMusic('search', { query: cleanQuery });
      tracks = playableTracks(response?.data);
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
    try {
      setStatus('Connecting to the Audius music catalog…');
      await loadTrending();
    } catch (_) {
      setStatus('The music service could not load. Check your connection and reopen Music.', 'error');
    }
  }

  searchForm.addEventListener('submit', event => {
    event.preventDefault();
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
