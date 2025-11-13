import { FormEvent, useState } from 'react';
import type { PlaceResult, WaypointRole } from '../types';
import { searchPlaces } from '../lib/nominatim';

interface SearchPanelProps {
  onSelectPlace: (place: PlaceResult) => void;
  onSetWaypoint: (place: PlaceResult, role: WaypointRole) => void;
}

const SearchPanel = ({ onSelectPlace, onSetWaypoint }: SearchPanelProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const matches = await searchPlaces(query);
      setResults(matches);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Search failed. Try again in a moment.';
      setError(reason);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
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

      {error && <p className="status-banner">{error}</p>}

      <ul className="list-reset" aria-live="polite">
        {results.map((place) => (
          <li
            key={place.id}
            className="result-item"
            role="button"
            tabIndex={0}
            onClick={() => onSelectPlace(place)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onSelectPlace(place);
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
                  onSetWaypoint(place, 'origin');
                }}
              >
                Set origin
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  onSetWaypoint(place, 'destination');
                }}
              >
                Set destination
              </button>
            </div>
          </li>
        ))}

        {!results.length && !isLoading && !error && (
          <li className="result-item muted">Start typing to discover places.</li>
        )}
      </ul>
    </section>
  );
};

export default SearchPanel;
