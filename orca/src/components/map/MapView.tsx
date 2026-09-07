import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline, GeoJSON, LayersControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { cn } from '@/lib/utils'

// Custom Leaflet icons to preserve the premium aesthetic
const createUserIcon = () => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <svg width="24" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-red-500 fill-red-500/20 drop-shadow-md">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
    `,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
  })
}

const createPfzIcon = (isSelected: boolean = false) => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div class="flex flex-col items-center justify-center gap-1">
        <div class="w-5 h-5 rounded-full ${isSelected ? 'bg-green-400 border-white ring-green-400/40 scale-125' : 'bg-green-500/80 border-white/80 ring-green-500/20'} border-2 shadow-md ring-4 transition-all duration-300 ${isSelected ? 'animate-pulse' : ''}"></div>
        <span class="text-xs font-bold ${isSelected ? 'text-foreground' : 'text-foreground/70'} drop-shadow-md" style="text-shadow: 0px 2px 4px rgba(0,0,0,0.5);">PFZ</span>
      </div>
    `,
    iconSize: [60, 40],
    iconAnchor: [30, 20],
  })
}

interface Location {
  lat: number;
  lon: number;
}

interface MapViewProps {
  className?: string;
  userLocation?: Location;
  clickedLocation?: Location;
  onMapClick?: (location: Location) => void;
  pfzLocations?: { id: string, location: Location }[];
  selectedPfzIndex?: number;
  onPfzClick?: (index: number) => void;
  route?: { latitude: number; longitude: number; status: string }[];
  showMPAs?: boolean;
  showEEZ?: boolean;
  showIMBL?: boolean;
  boundariesData?: {
    mpas: any | null;
    eez: any | null;
    imbl: any | null;
  };
  pfzLines?: any | null;
}

// Helper component to center map on markers
function MapController({ userLocation, pfzLocations }: { userLocation?: Location, pfzLocations?: { location: Location }[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (userLocation && pfzLocations && pfzLocations.length > 0) {
      // Create bounds containing user and all PFZs
      const bounds = L.latLngBounds([userLocation.lat, userLocation.lon], [userLocation.lat, userLocation.lon]);
      pfzLocations.forEach(p => bounds.extend([p.location.lat, p.location.lon]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else if (userLocation) {
      map.setView([userLocation.lat, userLocation.lon], 11);
    } else if (pfzLocations && pfzLocations.length > 0) {
      map.setView([pfzLocations[0].location.lat, pfzLocations[0].location.lon], 11);
    }
  }, [map, userLocation, pfzLocations]);

  return null;
}

// Custom Zoom Controls using existing design
function CustomZoomControls() {
  const map = useMap();
  return (
    <div className="absolute top-6 right-6 flex flex-col bg-card/80 backdrop-blur-md rounded-2xl shadow-xl border border-border/50 overflow-hidden z-400 pointer-events-auto">
      <button 
        onClick={() => map.zoomIn()} 
        className="w-12 h-12 flex items-center justify-center text-foreground hover:bg-muted/50 transition-colors border-b border-border/50 cursor-pointer"
        aria-label="Zoom In"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <button 
        onClick={() => map.zoomOut()} 
        className="w-12 h-12 flex items-center justify-center text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
        aria-label="Zoom Out"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
  );
}

function MapClickHandler({ onMapClick }: { onMapClick?: (location: Location) => void }) {
  useMapEvents({
    click: (event) => onMapClick?.({ lat: event.latlng.lat, lon: event.latlng.lng }),
  });

  return null;
}

export function MapView({ 
  className, userLocation, clickedLocation, onMapClick, pfzLocations, onPfzClick, selectedPfzIndex = 0, route,
  showMPAs = false, showEEZ = false, showIMBL = false, boundariesData, pfzLines
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);
  const [userIcon, setUserIcon] = useState<L.DivIcon | null>(null);
  const [pfzIconSelected, setPfzIconSelected] = useState<L.DivIcon | null>(null);
  const [pfzIconNormal, setPfzIconNormal] = useState<L.DivIcon | null>(null);

  useEffect(() => {
    setMounted(true);
    setUserIcon(createUserIcon());
    setPfzIconSelected(createPfzIcon(true));
    setPfzIconNormal(createPfzIcon(false));
  }, []);

  if (!mounted) return null;

  const defaultCenter: [number, number] = [17.6868, 83.2185]; // Visakhapatnam

  // Calculate a bounding box around the selected PFZ (approx 2 degree radius) to restrict weather data
  const selectedPfz = pfzLocations?.[selectedPfzIndex];
  const weatherBounds = selectedPfz ? (
    L.latLngBounds(
      [selectedPfz.location.lat - 1.5, selectedPfz.location.lon - 1.5],
      [selectedPfz.location.lat + 1.5, selectedPfz.location.lon + 1.5]
    )
  ) : undefined;

  return (
    <div className={cn("relative z-0 w-full h-full", className)}>
      <MapContainer 
        center={userLocation ? [userLocation.lat, userLocation.lon] : defaultCenter} 
        zoom={8} 
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={false} // Disable default zoom control to use our custom aesthetic
      >
        <LayersControl position="topleft">
          <LayersControl.BaseLayer checked name="Map (CartoDB)">
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
              url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${import.meta.env.VITE_CARTO_API_KEY || ''}`}
            />
          </LayersControl.BaseLayer>
          <LayersControl.Overlay name="Weather Hazards (Precipitation)">
            <TileLayer 
              url={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/weather-tile/precipitation_new/{z}/{x}/{y}`} 
              opacity={0.65} 
              bounds={weatherBounds}
            />
          </LayersControl.Overlay>
          <LayersControl.Overlay name="Wind & Storms">
            <TileLayer 
              url={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/weather-tile/wind_new/{z}/{x}/{y}`} 
              opacity={0.6} 
              bounds={weatherBounds}
            />
          </LayersControl.Overlay>
          {showMPAs && boundariesData?.mpas && (
            <LayersControl.Overlay checked name="Marine Protected Areas">
              <GeoJSON
                data={boundariesData.mpas}
                style={{ color: '#ef4444', weight: 1, fillColor: '#ef4444', fillOpacity: 0.2 }}
                onEachFeature={(feature, layer) => {
                  const name = feature.properties?.NAME;
                  layer.bindPopup(name ? `MPA: ${name}` : 'Marine Protected Area');
                }}
              />
            </LayersControl.Overlay>
          )}
          {showEEZ && boundariesData?.eez && (
            <LayersControl.Overlay checked name="India EEZ Boundary">
              <GeoJSON
                data={boundariesData.eez}
                style={{ color: '#3b82f6', weight: 2, fillOpacity: 0, dashArray: '5, 5' }}
                onEachFeature={(_, layer) => layer.bindPopup('India EEZ Boundary')}
              />
            </LayersControl.Overlay>
          )}
          {showIMBL && boundariesData?.imbl && (
            <LayersControl.Overlay checked name="IMBL Boundary">
              <GeoJSON
                data={boundariesData.imbl}
                style={{ color: '#f59e0b', weight: 3, fillOpacity: 0, dashArray: '10, 5' }}
                onEachFeature={(_, layer) => layer.bindPopup('IMBL (International Maritime Boundary Line)')}
              />
            </LayersControl.Overlay>
          )}
        </LayersControl>
        
        <MapController userLocation={userLocation} pfzLocations={pfzLocations} />
        <MapClickHandler onMapClick={onMapClick} />
        <CustomZoomControls />

        {userLocation && userIcon && (
          <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}>
            <Popup>Your Location</Popup>
          </Marker>
        )}

        {clickedLocation && (
          <Marker position={[clickedLocation.lat, clickedLocation.lon]}>
            <Popup>
              Selected location<br />
              {clickedLocation.lat.toFixed(5)}, {clickedLocation.lon.toFixed(5)}
            </Popup>
          </Marker>
        )}

        {pfzLocations && pfzIconSelected && pfzIconNormal && pfzLocations.map((pfz, index) => (
          <Marker 
            key={pfz.id} 
            position={[pfz.location.lat, pfz.location.lon]} 
            icon={index === selectedPfzIndex ? pfzIconSelected : pfzIconNormal}
            eventHandlers={{
              click: () => onPfzClick?.(index)
            }}
          >
            <Popup>PFZ: {pfz.id}</Popup>
          </Marker>
        ))}

        {route && route.length > 0 && (
          <Polyline 
            positions={route.map(p => [p.latitude, p.longitude])} 
            pathOptions={{ 
              color: '#3b82f6', 
              weight: 4, 
              dashArray: '10, 10', 
              opacity: 0.8,
              lineCap: 'round'
            }}
          />
        )}

        {pfzLines && (
          <GeoJSON
            key="pfz-lines-layer"
            data={pfzLines}
            style={{ color: '#16a34a', weight: 3, opacity: 0.85 }}
            onEachFeature={(feature, layer) => {
              const properties = feature.properties as Record<string, unknown> | null;
              const label = properties
                ? Object.entries(properties)
                    .filter(([, value]) => value !== null && value !== undefined && value !== '')
                    .map(([name, value]) => `${name}: ${value}`)
                    .join('<br />')
                : '';
              layer.bindPopup(label || 'Potential Fishing Zone');
            }}
          />
        )}

      </MapContainer>
    </div>
  )
}
