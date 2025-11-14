import { FormEvent, useEffect, useRef, useState } from 'react';
import type { PlaceResult, WaypointRole } from '../types';
import { searchPlaces } from '../lib/nominatim';

interface SearchPanelProps {
  onSelectPlace: (place: PlaceResult) => void;
  onSetWaypoint: (place: PlaceResult, role: WaypointRole) => void;
}

const RECENT_KEY = 'mymap_recent_places';
const CACHE_KEY = 'mymap_search_cache';

const SearchPanel = ({ onSelectPlace, onSetWaypoint }: SearchPanelProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentPlaces, setRecentPlaces] = useState<PlaceResult[]>([]);
  const cacheRef = useRef<Record<string, PlaceResult[]>>({});

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedRecents = window.localStorage.getItem(RECENT_KEY);
    if (storedRecents) {
      try {
        setRecentPlaces(JSON.parse(storedRecents));
      } catch {
        setRecentPlaces([]);
      }
    }
    const storedCache = window.localStorage.getItem(CACHE_KEY);
    if (storedCache) {
      try {
        cacheRef.current = JSON.parse(storedCache);
      } catch {
        cacheRef.current = {};
      }
    }
  }, []);

  const rememberPlace = (place: PlaceResult) => {
    setRecentPlaces((prev) => {
      const filtered = prev.filter((item) => item.id !== place.id);
      const next = [place, ...filtered].slice(0, 6);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleClearHistory = () => {
    setRecentPlaces([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(RECENT_KEY);
    }
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    if (cacheRef.current[normalized]) {
      setResults(cacheRef.current[normalized]);
      setIsLoading(false);
      return;
    }

    try {
      const matches = await searchPlaces(query);
      setResults(matches);
      cacheRef.current[normalized] = matches;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(cacheRef.current));
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Search failed. Try again in a moment.';
      setError(reason);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultSelect = (place: PlaceResult) => {
    rememberPlace(place);
    onSelectPlace(place);
  };

  const handleWaypointSelect = (place: PlaceResult, role: WaypointRole) => {
    rememberPlace(place);
    onSetWaypoint(place, role);
  };

  const placeholder = 'Search any city, landmark, or coordinates';

  return (
    <section className="glass-panel" aria-label="Search places">
      <form onSubmit={handleSearch} className="search-form">
        <h2 className="panel-title">Explore the planet</h2>
        <input
          className="input-field"
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search"
        />
        <button className="primary-btn" type="submit" disabled={isLoading}>
          {isLoading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {recentPlaces.length > 0 && (
        <div className="history-chips">
          <div className="history-header">
            <span>Recent</span>
            <button type="button" className="chip-clear" onClick={handleClearHistory}>
              Clear
            </button>
          </div>
          <div className="history-scroll">
            {recentPlaces.map((place) => (
              <button
                key={place.id}
                type="button"
                className="chip-btn history-chip"
                onClick={() => handleResultSelect(place)}
              >
                {place.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="status-banner">{error}</p>}

      <ul className="list-reset" aria-live="polite">
        {results.map((place) => (
          <li
            key={place.id}
            className="result-item"
            role="button"
            tabIndex={0}
            onClick={() => handleResultSelect(place)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleResultSelect(place);
              }
            }}
          >
            <div>
              <strong className="result-title">{place.name}</strong>
              <p className="result-description">{place.description}</p>
            </div>
            <div className="action-row">
              <button
                type="button"
                className="chip-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  handleWaypointSelect(place, 'origin');
                }}
              >
                Set origin
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  handleWaypointSelect(place, 'destination');
                }}
              >
                Set destination
              </button>
            </div>
          </li>
        ))}

        {!results.length && !isLoading && !error && (
          <li className="result-item muted">
            Start typing to discover places or reuse a recent search above.
          </li>
        )}
      </ul>
    </section>
  );
};

export default SearchPanel;
