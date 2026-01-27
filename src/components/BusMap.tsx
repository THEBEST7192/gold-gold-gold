"use client";

import type L from "leaflet";
import { useEffect, useRef } from "react";
import type { StopInfo } from "@/app/types";

type BusMapProps = {
  latitude: number;
  longitude: number;
  stops?: StopInfo[];
  trackEnabled: boolean;
};

export default function BusMap({ latitude, longitude, stops, trackEnabled }: BusMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const stopsLayerRef = useRef<L.LayerGroup | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);
  const stopsIndexRef = useRef<Map<string, L.Layer>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }
    let isMounted = true;

    const setup = async () => {
      const leafletModule = await import("leaflet");
      const leaflet = leafletModule.default as typeof import("leaflet");
      if (!isMounted || !containerRef.current) {
        return;
      }
      const map = leaflet.map(containerRef.current, {
        center: [latitude, longitude],
        zoom: 14,
        zoomControl: false,
        attributionControl: true,
      });
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        })
        .addTo(map);

      const stopsLayer = leaflet.layerGroup().addTo(map);

      const trail = leaflet
        .polyline([], {
          color: "#b91c1c",
          weight: 3,
          opacity: 0.9,
          dashArray: "6 4",
        })
        .addTo(map);

      const marker = leaflet
        .circleMarker([latitude, longitude], {
          color: "#92400e",
          fillColor: "#fbbf24",
          fillOpacity: 0.9,
          radius: 8,
        })
        .addTo(map);

      leafletRef.current = leaflet;
      mapRef.current = map;
      markerRef.current = marker;
      stopsLayerRef.current = stopsLayer;
      trailRef.current = trail;
    };

    setup();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
      }
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
      stopsLayerRef.current = null;
      trailRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) {
      return;
    }
    const center: [number, number] = [latitude, longitude];
    mapRef.current.setView(center);
    markerRef.current.setLatLng(center);
    if (trailRef.current && trackEnabled) {
      trailRef.current.addLatLng([latitude, longitude]);
    }
    markerRef.current.bringToFront();
  }, [latitude, longitude, trackEnabled]);

  useEffect(() => {
    if (!trailRef.current) {
      return;
    }
    if (trackEnabled) {
      trailRef.current.setLatLngs([]);
    }
  }, [trackEnabled]);

  useEffect(() => {
    if (!mapRef.current || !stopsLayerRef.current || !leafletRef.current) {
      return;
    }
    const leaflet = leafletRef.current;
    const destinationIcon = leaflet.divIcon({
      className: "",
      html: "🚩",
      iconSize: [16, 16],
      iconAnchor: [8, 16],
    });
    const index = stopsIndexRef.current;
    const nextIds = new Set<string>((stops ?? []).map((s) => s.id));
    // Remove markers that are no longer present
    index.forEach((layer, id) => {
      if (!nextIds.has(id)) {
        (stopsLayerRef.current as L.LayerGroup).removeLayer(layer);
        index.delete(id);
      }
    });
    // Add or update markers for current stops
    (stops ?? []).forEach((stop) => {
      const stopLatitude = stop.latitude;
      const stopLongitude = stop.longitude;
      if (!Number.isFinite(stopLatitude) || !Number.isFinite(stopLongitude)) {
        return;
      }
      const existing = index.get(stop.id);
      const isDestination = !!stop.isDestination;
      if (!existing) {
        const layer = isDestination
          ? leaflet
              .marker([stopLatitude, stopLongitude], {
                icon: destinationIcon,
              })
              .addTo(stopsLayerRef.current as L.LayerGroup)
          : leaflet
              .circleMarker([stopLatitude, stopLongitude], {
                color: "#1e3a8a",
                fillColor: "#93c5fd",
                fillOpacity: 0.9,
                radius: 3,
              })
              .addTo(stopsLayerRef.current as L.LayerGroup);
        index.set(stop.id, layer);
      } else {
        // Update position; if destination flag toggled, replace layer
        const isMarker = "setLatLng" in (existing as any) && "getLatLng" in (existing as any);
        if (isMarker) {
          (existing as any).setLatLng([stopLatitude, stopLongitude]);
          const hadIcon = typeof (existing as any).options?.icon !== "undefined";
          if (hadIcon !== isDestination) {
            (stopsLayerRef.current as L.LayerGroup).removeLayer(existing);
            index.delete(stop.id);
            const layer = isDestination
              ? leaflet
                  .marker([stopLatitude, stopLongitude], {
                    icon: destinationIcon,
                  })
                  .addTo(stopsLayerRef.current as L.LayerGroup)
              : leaflet
                  .circleMarker([stopLatitude, stopLongitude], {
                    color: "#1e3a8a",
                    fillColor: "#93c5fd",
                    fillOpacity: 0.9,
                    radius: 3,
                  })
                  .addTo(stopsLayerRef.current as L.LayerGroup);
            index.set(stop.id, layer);
          }
        }
      }
    });
    if (markerRef.current) {
      markerRef.current.bringToFront();
    }
  }, [stops]);

  return <div ref={containerRef} style={{ height: 180, width: "100%" }} />;
}
