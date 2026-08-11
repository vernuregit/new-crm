import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons when bundling with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

const DEFAULT_CENTER = [17.385, 78.4867]
const DEFAULT_ZOOM = 15

/**
 * Clickable map to pick office lat/lng. Shows optional radius circle.
 */
export const OfficeLocationPickerMap = ({
  lat,
  lng,
  radiusMeters = 200,
  onPick,
  className = '',
}) => {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)
  const onPickRef = useRef(onPick)

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const hasPoint = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
    const center = hasPoint ? [Number(lat), Number(lng)] : DEFAULT_CENTER

    const map = L.map(containerRef.current, {
      center,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    map.on('click', (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng
      onPickRef.current?.(clickLat, clickLng)
    })

    mapRef.current = map

    // Leaflet needs a resize after mount in flex/hidden panels
    const t = setTimeout(() => map.invalidateSize(), 80)

    return () => {
      clearTimeout(t)
      map.remove()
      mapRef.current = null
      markerRef.current = null
      circleRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, [])

  // Sync marker + circle when lat/lng/radius change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const hasPoint = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
    if (!hasPoint) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current)
        markerRef.current = null
      }
      if (circleRef.current) {
        map.removeLayer(circleRef.current)
        circleRef.current = null
      }
      return
    }

    const point = [Number(lat), Number(lng)]
    const radius = Math.max(50, Number(radiusMeters) || 200)

    if (!markerRef.current) {
      markerRef.current = L.marker(point).addTo(map)
    } else {
      markerRef.current.setLatLng(point)
    }

    if (!circleRef.current) {
      circleRef.current = L.circle(point, {
        radius,
        color: '#34d399',
        fillColor: '#34d399',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map)
    } else {
      circleRef.current.setLatLng(point)
      circleRef.current.setRadius(radius)
    }

    map.setView(point, map.getZoom() || DEFAULT_ZOOM)
    setTimeout(() => map.invalidateSize(), 50)
  }, [lat, lng, radiusMeters])

  // When panel expands, invalidate size
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const t = setTimeout(() => map.invalidateSize(), 120)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`space-y-1.5 ${className}`}>
      <p className="text-[11px] text-slate-400">
        Click the map to set the office pin. Adjust radius below, then save.
      </p>
      <div
        ref={containerRef}
        className="w-full h-64 rounded-xl overflow-hidden border border-slate-700 z-0"
      />
    </div>
  )
}
