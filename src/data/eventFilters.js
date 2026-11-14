export const defaultFilters = {
  city: '',
  from: '',
  to: '',
  price: 'Any',
  setting: 'Any',
  availability: 'Any',
};

export function filterEvents(events, search, category, filters) {
  const query = search.trim().toLowerCase();
  const city = filters.city.trim().toLowerCase();

  return events.filter((event) => {
    const searchable = [event.title, event.city, event.venue, event.category, event.organizer];
    return searchable.join(' ').toLowerCase().includes(query)
      && (category === 'All' || event.category === category)
      && (!city || event.city.toLowerCase().includes(city))
      && (!filters.from || event.startDate >= filters.from)
      && (!filters.to || event.startDate <= filters.to)
      && (filters.price === 'Any' || (filters.price === 'Free' ? event.price === 0 : event.price > 0))
      && (filters.setting === 'Any' || event.setting === filters.setting)
      && (filters.availability !== 'Available' || event.available);
  });
}

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function dateRangeError(from, to) {
  if ((from && !isDate(from)) || (to && !isDate(to))) {
    return 'Enter a valid date in YYYY-MM-DD format.';
  }
  if (from && to && from > to) return 'The end date must be on or after the start date.';
  return '';
}
