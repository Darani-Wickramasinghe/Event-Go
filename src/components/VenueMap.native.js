import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function VenueMap({ events, center, location, follow, onPan, onBounds, onOpen }) {
  const map = useRef(null);
  useEffect(() => {
    map.current?.animateToRegion({ ...center, latitudeDelta: 0.28, longitudeDelta: 0.28 });
  }, [center]);

  useEffect(() => {
    if (follow && location) map.current?.animateToRegion({ ...location, latitudeDelta: 0.28, longitudeDelta: 0.28 });
  }, [follow, location]);

  return (
    <MapView
      ref={map}
      style={styles.map}
      initialRegion={{ ...center, latitudeDelta: 0.28, longitudeDelta: 0.28 }}
      onPanDrag={onPan}
      onRegionChangeComplete={(region) => onBounds({
        south: region.latitude - region.latitudeDelta / 2,
        north: region.latitude + region.latitudeDelta / 2,
        west: region.longitude - region.longitudeDelta / 2,
        east: region.longitude + region.longitudeDelta / 2,
      })}
    >
      {events.map((event) => (
        <Marker key={event.id} title={event.title} coordinate={{ latitude: event.latitude, longitude: event.longitude }} pinColor="#5145E5" onPress={() => onOpen(event)} />
      ))}
      {location && <Marker title="Your location" coordinate={location} pinColor="#007BBA" />}
    </MapView>
  );
}

const styles = StyleSheet.create({ map: { width: '100%', height: 310, borderRadius: 16 } });
