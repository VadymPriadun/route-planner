
'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface MapStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: string;
}

export interface MapNearby {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface Props {
  stops: MapStop[];
  nearby: MapNearby[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  fitKey: string | null;
  line?: [number, number][] | null;
}

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};

const isValidCoordinate = (lat: number, lon: number): boolean =>
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180;

export default function RouteMap({
                                   stops,
                                   nearby,
                                   selectedId,
                                   onSelect,
                                   fitKey,
                                   line,
                                 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);

  // Initialize the map once per component lifecycle.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setReady(false);

    const map = new maplibregl.Map({
      container,
      style: STYLE,
      center: [11.2558, 43.7696],
      zoom: 13,
    });

    mapRef.current = map;

    map.addControl(
        new maplibregl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right',
    );

    const handleLoad = () => {
      if (mapRef.current !== map) return;

      if (!map.getSource('route-line')) {
        map.addSource('route-line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [],
            },
          },
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-line',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#2563eb',
            'line-width': 4,
            'line-opacity': 0.85,
          },
        });
      }

      setReady(true);
      map.resize();
    };

    map.on('load', handleLoad);

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current === map) {
        map.resize();
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.off('load', handleLoad);

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      map.remove();

      if (mapRef.current === map) {
        mapRef.current = null;
      }

    };
  }, []);

  // Update route line and markers when route data changes.
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !ready) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const validStops = stops.filter((stop) =>
        isValidCoordinate(stop.lat, stop.lon),
    );

    const validNearby = nearby.filter((point) =>
        isValidCoordinate(point.lat, point.lon),
    );

    const source = map.getSource('route-line') as
        | maplibregl.GeoJSONSource
        | undefined;

    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates:
              line && line.length > 1
                  ? line
                  : validStops.map((stop) => [stop.lon, stop.lat]),
        },
      });
    }

    validStops.forEach((stop, index) => {
      const element = document.createElement('button');

      const kind = stop.kind.toLowerCase();

      element.type = 'button';
      element.className = [
        'marker',
        `marker-${kind}`,
        stop.id === selectedId ? 'marker-selected' : '',
      ]
          .filter(Boolean)
          .join(' ');

      element.textContent = String(index + 1);
      element.title = stop.name;
      element.setAttribute('aria-label', `Select ${stop.name}`);

      element.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelect(stop.id);
      });

      const marker = new maplibregl.Marker({
        element,
        anchor: 'center',
      })
          .setLngLat([stop.lon, stop.lat])
          .addTo(map);

      markersRef.current.push(marker);
    });

    validNearby.forEach((point) => {
      const element = document.createElement('div');

      element.className = 'marker marker-nearby';
      element.title = point.name;
      element.setAttribute('aria-label', point.name);

      const marker = new maplibregl.Marker({
        element,
        anchor: 'center',
      })
          .setLngLat([point.lon, point.lat])
          .addTo(map);

      markersRef.current.push(marker);
    });
  }, [ready, stops, nearby, selectedId, onSelect, line]);

  // Fit the map only when a different route day is selected.
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !ready) return;

    const validStops = stops.filter((stop) =>
        isValidCoordinate(stop.lat, stop.lon),
    );

    if (validStops.length === 0) return;

    if (validStops.length === 1) {
      const stop = validStops[0];

      map.easeTo({
        center: [stop.lon, stop.lat],
        zoom: 15,
        duration: 500,
      });

      return;
    }

    const bounds = new maplibregl.LngLatBounds();

    validStops.forEach((stop) => {
      bounds.extend([stop.lon, stop.lat]);
    });

    map.fitBounds(bounds, {
      padding: 70,
      maxZoom: 16,
      duration: 600,
    });
  }, [ready, fitKey]);

  return <div ref={containerRef} className="map" />;
}
