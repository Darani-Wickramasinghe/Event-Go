export const categories = [
  { label: 'All', icon: 'apps-outline', color: '#EAE7FF', ink: '#4438C7' },
  { label: 'Music', icon: 'musical-notes-outline', color: '#FFE0D6', ink: '#9D3829' },
  { label: 'IT', icon: 'code-slash-outline', color: '#D9FAEE', ink: '#11634D' },
  { label: 'Food', icon: 'restaurant-outline', color: '#FFF0D3', ink: '#855309' },
  { label: 'Art', icon: 'color-palette-outline', color: '#FFE1EF', ink: '#9B3566' },
  { label: 'Education', icon: 'school-outline', color: '#DFEBFF', ink: '#254F9B' },
  { label: 'Sports', icon: 'football-outline', color: '#E7F2D9', ink: '#415D24' },
];

// These sample events let us build and test the UI before the API is ready.
export const events = [
  {
    id: 'sunset-sessions',
    title: 'Sunset Sessions',
    category: 'Music',
    city: 'Colombo',
    venue: 'Viharamahadevi Park',
    organizer: 'Colombo Live',
    startDate: '2026-11-21',
    startTime: '17:30',
    endTime: '21:00',
    latitude: 6.9152,
    longitude: 79.8617,
    capacity: 80,
    setting: 'Outdoor',
    day: '21',
    date: 'Sat, 21 Nov · 5:30 PM',
    price: 1500,
    image: require('../../assets/music.jpg'),
    description: 'Spend an evening outdoors with live sets from local artists. Bring a picnic blanket and arrive early to find your spot.',
  },
  {
    id: 'tech-connect',
    title: 'Tech Connect',
    category: 'IT',
    city: 'Kelaniya',
    venue: 'University of Kelaniya',
    organizer: 'Kelaniya Computing Society',
    startDate: '2026-11-22',
    startTime: '10:00',
    endTime: '13:00',
    latitude: 6.9737,
    longitude: 79.9153,
    capacity: 12,
    setting: 'Indoor',
    day: '22',
    date: 'Sun, 22 Nov · 10:00 AM',
    price: 0,
    image: require('../../assets/tech.jpg'),
    description: 'Meet local developers, see student projects, and join a beginner-friendly discussion about building your first app.',
  },
  {
    id: 'street-food-social',
    title: 'Street Food Social',
    category: 'Food',
    city: 'Kelaniya',
    venue: 'Kelaniya Public Grounds',
    organizer: 'Kelaniya Food Collective',
    startDate: '2026-11-28',
    startTime: '16:00',
    endTime: '20:00',
    latitude: 6.9553,
    longitude: 79.9224,
    capacity: null,
    setting: 'Outdoor',
    day: '28',
    date: 'Sat, 28 Nov · 4:00 PM',
    price: 0,
    image: require('../../assets/food.jpg'),
    description: 'Explore Sri Lankan street food and meet independent food vendors at an open-air market. Admission is free. Food is sold separately.',
  },
  {
    id: 'weekend-gallery',
    title: 'Weekend Gallery',
    category: 'Art',
    city: 'Kandy',
    venue: 'Kandy City Centre',
    organizer: 'Kandy Arts Collective',
    startDate: '2026-11-29',
    startTime: '11:00',
    endTime: '15:00',
    latitude: 7.2919,
    longitude: 80.6373,
    capacity: 4,
    setting: 'Indoor',
    day: '29',
    date: 'Sun, 29 Nov · 11:00 AM',
    price: 0,
    image: require('../../assets/art.jpg'),
    description: 'Discover work from emerging artists and hear the stories behind their pieces at this weekend exhibition.',
  },
];

export function formatPrice(price) {
  return price === 0 ? 'Free' : `LKR ${price.toLocaleString('en-LK')}`;
}

export const eventImages = {
  Music: require('../../assets/music.jpg'),
  IT: require('../../assets/tech.jpg'),
  Food: require('../../assets/food.jpg'),
  Art: require('../../assets/art.jpg'),
};

export function formatEventDate(date, time) {
  const instant = new Date(`${date}T${time}:00+05:30`);
  const format = new Intl.DateTimeFormat('en-LK', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    hour12: true, timeZone: 'Asia/Colombo',
  });
  return format.format(instant);
}
