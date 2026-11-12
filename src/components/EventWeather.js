import { useEffect, useState } from 'react';
import { Copy, Panel } from './FlowUI';
import { eventTime, sriLankaDate } from '../data/reservations';

export default function EventWeather({ event }) {
  const [message, setMessage] = useState('Loading event-hour forecast…');
  const { latitude, longitude, startDate, startTime, endTime, setting, status } = event;

  useEffect(() => {
    const now = Date.now();
    const schedule = { startDate, startTime, endTime };
    if (status === 'Cancelled' || eventTime(schedule, endTime) <= now) {
      setMessage('Forecast unavailable for this event.');
      return;
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setMessage('Forecast unavailable because the venue has no map coordinates.');
      return;
    }
    if (startDate > sriLankaDate(now + 15 * 86400000)) {
      setMessage('Check back closer to the event for a forecast.');
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=precipitation_probability,weather_code,apparent_temperature,wind_speed_10m&timezone=Asia%2FColombo&start_date=${startDate}&end_date=${startDate}`;
    let active = true;
    setMessage('Loading event-hour forecast…');
    fetch(url, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error('Forecast unavailable');
      const { hourly } = await response.json();
      const firstHour = Number(startTime.slice(0, 2));
      const lastHour = Number(endTime.slice(0, 2));
      const hours = hourly.time.map((value, index) => ({
        hour: value.slice(11), rain: hourly.precipitation_probability[index], code: hourly.weather_code[index],
        temperature: hourly.apparent_temperature[index], wind: hourly.wind_speed_10m[index],
      })).filter(({ hour }) => Number(hour.slice(0, 2)) >= firstHour && Number(hour.slice(0, 2)) <= lastHour);
      if (hours.length !== lastHour - firstHour + 1 || hours.some(({ rain, code, temperature, wind }) => ![rain, code, temperature, wind].every(Number.isFinite))) {
        throw new Error('Incomplete forecast');
      }
      const peak = hours.reduce((highest, hour) => hour.rain > highest.rain ? hour : highest);
      const advice = [peak.rain >= 60 ? 'Prepare for rain.' : peak.rain >= 30 ? 'Rain is possible. Bring rain protection.' : 'Low rain chance.'];
      if (hours.some(({ code }) => code >= 95)) advice.push('Thunderstorms are possible. Check organizer updates.');
      if (setting === 'Outdoor' && hours.some(({ temperature }) => temperature >= 32)) advice.push('Bring water.');
      if (setting === 'Outdoor' && hours.some(({ temperature, wind }) => temperature <= 20 || wind >= 30)) advice.push('Consider a jacket.');
      if (active) setMessage(`Peak hourly rain chance: ${peak.rain}% at ${peak.hour}. ${advice.join(' ')}\nSource: Open-Meteo`);
    }).catch(() => {
      if (active) setMessage('Forecast unavailable right now. Check again later.');
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [latitude, longitude, startDate, startTime, endTime, setting, status]);

  return <Panel title="Weather at the venue"><Copy>{message}</Copy></Panel>;
}
