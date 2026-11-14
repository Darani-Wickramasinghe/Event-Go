import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Copy } from './FlowUI';
import { eventTime, sriLankaDate } from '../data/reservations';
import { colors, headingFont } from '../theme';

export default function EventWeather({ event }) {
  const [message, setMessage] = useState('Checking the forecast…');
  const [forecast, setForecast] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const { latitude, longitude, startDate, startTime, endTime, setting, status } = event;

  useEffect(() => {
    setForecast(null);
    setExpanded(false);
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
    setMessage('Checking the forecast…');
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
      if (active) setForecast({ peak, hours });
    }).catch(() => {
      if (active) setMessage('Forecast unavailable right now. Check again later.');
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [latitude, longitude, startDate, startTime, endTime, setting, status]);

  const rain = forecast?.peak.rain;
  const storms = forecast?.hours.some(({ code }) => code >= 95);
  const advice = [];
  if (rain >= 30) advice.push('Bring rain protection');
  if (setting === 'Outdoor' && forecast?.hours.some(({ temperature }) => temperature >= 32)) advice.push('Bring water');
  if (setting === 'Outdoor' && forecast?.hours.some(({ temperature, wind }) => temperature <= 20 || wind >= 30)) advice.push('Consider a jacket');

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>Weather at the venue</Text>
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Ionicons name={storms ? 'thunderstorm-outline' : rain >= 30 ? 'rainy-outline' : 'cloud-outline'} size={26} color={colors.purpleDark} />
          <View style={styles.summaryText} accessibilityLiveRegion="polite">
            {forecast ? (
              <>
                <Text style={styles.headline}>{storms ? 'Thunderstorms possible' : rain >= 60 ? 'Rain likely' : rain >= 30 ? 'Rain possible' : 'Low chance of rain'}</Text>
                <Text style={styles.caption}>During the event</Text>
              </>
            ) : <Copy>{message}</Copy>}
          </View>
          {forecast && (
            <View style={styles.metric}>
              <Text style={styles.percent}>{rain}%</Text>
              <Text style={styles.caption}>Peak rain chance</Text>
            </View>
          )}
        </View>
        {storms && <Text style={styles.advice}>Check organizer updates.</Text>}
        {advice.length > 0 && <Text style={styles.advice}>{advice.join(' · ')}</Text>}
        {forecast && (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Hide forecast details' : 'Forecast details'}
              accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.toggle}>
              <Text style={styles.toggleText}>{expanded ? 'Hide forecast details' : 'Forecast details'}</Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.purpleDark} />
            </Pressable>
            {expanded && (
              <View style={styles.details}>
                <Copy>Highest hourly rain chance at {forecast.peak.hour} (Sri Lanka time)</Copy>
                <Copy>Feels like {Math.round(Math.min(...forecast.hours.map(({ temperature }) => temperature)))}–{Math.round(Math.max(...forecast.hours.map(({ temperature }) => temperature)))}°C</Copy>
                <Copy>Wind up to {Math.round(Math.max(...forecast.hours.map(({ wind }) => wind)))} km/h</Copy>
                <Text style={styles.caption}>Source: Open-Meteo</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 9 },
  title: { color: colors.ink, fontSize: 17, fontFamily: headingFont },
  summary: { backgroundColor: '#F3F2FF', borderRadius: 16, padding: 14, gap: 7 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryText: { flex: 1, gap: 3 },
  headline: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  metric: { alignItems: 'flex-end', flexShrink: 0 },
  percent: { color: colors.purpleDark, fontSize: 27, fontFamily: headingFont },
  caption: { color: colors.muted, fontSize: 12 },
  advice: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  toggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 },
  toggleText: { color: colors.purpleDark, fontSize: 14, fontWeight: '700' },
  details: { borderTopWidth: 1, borderColor: colors.line, paddingTop: 8, gap: 4 },
});
