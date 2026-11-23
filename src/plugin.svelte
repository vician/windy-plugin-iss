<div class="plugin__mobile-header">
    { title }
</div>
<section class="plugin__content">
    <div
        class="plugin__title plugin__title--chevron-back"
        on:click={ () => bcast.emit('rqstOpen', 'menu') }
    >
    { title }
    </div>
    
    {#if error}
        <div class="error-message">
            <p><strong>Error:</strong> {error}</p>
        </div>
    {/if}

    {#if status}
        <div class="status-message">
            <p>{status}</p>
        </div>
    {/if}

    <div class="iss-info">
        <p><strong>Current ISS Position:</strong></p>
        <p>Latitude: {currentLat != null ? currentLat.toFixed(4) + '°' : 'Loading...'}</p>
        <p>Longitude: {currentLon != null ? currentLon.toFixed(4) + '°' : 'Loading...'}</p>
        <p>Altitude: {currentAlt != null ? `${currentAlt.toFixed(2)} km` : 'Loading...'}</p>
        <p>Velocity: {currentVel != null ? `${currentVel.toFixed(2)} km/h` : 'Loading...'}</p>
        <p>Last Updated: {lastUpdated ?? 'Not yet'}</p>
    </div>

    <div class="actions">
        <button
            class="button button--variant-orange size-s"
            on:click={ centerOnISS }
            disabled={ currentLat == null || currentLon == null }
        >
            Center map on ISS
        </button>
    </div>
</section>

<script lang="ts">
    import bcast from "@windy/broadcast";
    import { map } from '@windy/map';
    import { onDestroy, onMount } from 'svelte';

    import config from './pluginConfig';

    const { title } = config;

    let currentLat: number | null = null;
    let currentLon: number | null = null;
    let currentAlt: number | null = null;
    let currentVel: number | null = null;
    let lastUpdated: string | null = null;
    let status: string = 'Initializing...';
    let error: string | null = null;

    let issMarker: any = null;
    let trajectoryLine: any = null;
    let intervalId: number | null = null;
    let hasInitialCentered: boolean = false;

    const centerOnISS = () => {
        if (currentLat != null && currentLon != null && map && map.setView) {
            map.setView([currentLat, currentLon], Math.max(map.getZoom?.() ?? 3, 3));
        }
    };

    /**
     * Splits coordinates into separate segments whenever crossing the International Date Line (±180°),
     * preventing unsightly horizontal wrapping lines across the world map.
     */
    const segmentCoordinates = (coords: [number, number][]): [number, number][][] => {
        if (coords.length === 0) return [];
        const segments: [number, number][][] = [];
        let currentSegment: [number, number][] = [coords[0]];

        for (let i = 1; i < coords.length; i++) {
            const prevLon = coords[i - 1][1];
            const currLon = coords[i][1];

            if (Math.abs(currLon - prevLon) > 180) {
                segments.push(currentSegment);
                currentSegment = [];
            }
            currentSegment.push(coords[i]);
        }
        if (currentSegment.length > 0) {
            segments.push(currentSegment);
        }
        return segments;
    };

    const fetchISSData = async () => {
        try {
            error = null;
            status = 'Fetching ISS position...';

            // 1. Fetch current position & telemetry
            const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
            if (!response.ok) {
                throw new Error(`Position API error: ${response.status}`);
            }

            const data = await response.json();
            currentLat = data.latitude;
            currentLon = data.longitude;
            currentAlt = data.altitude;
            currentVel = data.velocity;
            lastUpdated = new Date().toLocaleTimeString();

            if (!map || !map.setView) {
                status = 'Waiting for map...';
                return;
            }

            const L = (window as any).L;
            if (!L) {
                throw new Error('Leaflet library is not available');
            }

            // 2. Update or create ISS marker
            const popupContent = `
                <div style="font-family: sans-serif; min-width: 150px;">
                    <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">🛰️ ISS (ZARYA)</div>
                    <div>Lat: ${currentLat.toFixed(4)}°</div>
                    <div>Lon: ${currentLon.toFixed(4)}°</div>
                    <div>Alt: ${currentAlt.toFixed(1)} km</div>
                    <div>Speed: ${currentVel.toFixed(1)} km/h</div>
                </div>
            `;

            if (issMarker) {
                issMarker.setLatLng([currentLat, currentLon]);
                issMarker.setPopupContent(popupContent);
            } else {
                const issIcon = L.divIcon({
                    className: 'iss-marker-container',
                    html: '<div class="iss-marker-icon">🛰️</div>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                    popupAnchor: [0, -16],
                });

                issMarker = new L.Marker([currentLat, currentLon], {
                    icon: issIcon,
                    title: 'International Space Station',
                }).addTo(map);

                issMarker.bindPopup(popupContent);
            }

            // Center map on first successful load
            if (!hasInitialCentered) {
                centerOnISS();
                hasInitialCentered = true;
            }

            // 3. Fetch trajectory
            // Note: api.wheretheiss.at enforces a maximum of 10 timestamps per request.
            // We sample 10 timestamps over ~90 minutes (an orbital period) spaced 10 minutes apart:
            // -45m to +45m around the current time.
            status = 'Fetching trajectory...';
            const now = Math.floor(Date.now() / 1000);
            const timestamps: number[] = [];
            for (let i = -2700; i <= 2700; i += 600) {
                timestamps.push(now + i);
            }

            try {
                const trajUrl = `https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=${timestamps.join(',')}`;
                const trajResponse = await fetch(trajUrl);

                if (trajResponse.ok) {
                    const trajData = await trajResponse.json();

                    if (Array.isArray(trajData)) {
                        // Extract points and insert current live position
                        const points: { time: number; coords: [number, number] }[] = trajData
                            .filter((pos: any) => pos && typeof pos.latitude === 'number' && typeof pos.longitude === 'number')
                            .map((pos: any) => ({
                                time: pos.timestamp,
                                coords: [pos.latitude, pos.longitude] as [number, number],
                            }));

                        points.push({ time: now, coords: [currentLat, currentLon] });
                        points.sort((a, b) => a.time - b.time);

                        const segmented = segmentCoordinates(points.map(p => p.coords));

                        if (trajectoryLine) {
                            trajectoryLine.setLatLngs(segmented);
                        } else {
                            trajectoryLine = new L.Polyline(segmented, {
                                color: '#ff3838',
                                weight: 2.5,
                                opacity: 0.85,
                                dashArray: '6, 6',
                            }).addTo(map);
                        }
                    }
                } else {
                    console.warn(`Trajectory fetch failed: ${trajResponse.status}`);
                }
            } catch (trajErr) {
                console.warn('Non-fatal error fetching trajectory:', trajErr);
            }

            status = 'ISS tracker active';

        } catch (err: any) {
            console.error('Error fetching ISS data:', err);
            error = err.message || 'Unknown error occurred';
            status = '';
        }
    };

    const cleanup = () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        if (issMarker && map) {
            try {
                map.removeLayer(issMarker);
            } catch (e) {
                console.warn('Could not remove marker:', e);
            }
            issMarker = null;
        }
        if (trajectoryLine && map) {
            try {
                map.removeLayer(trajectoryLine);
            } catch (e) {
                console.warn('Could not remove trajectory:', e);
            }
            trajectoryLine = null;
        }
    };

    export const onopen = (_params: unknown) => {
        console.log('ISS Tracker plugin opened');
        status = 'Plugin opened, fetching data...';
        hasInitialCentered = false;
        fetchISSData();

        if (!intervalId) {
            intervalId = window.setInterval(fetchISSData, 30000);
        }
    };

    export const onclose = () => {
        console.log('ISS Tracker plugin closed');
        cleanup();
    };

    onMount(() => {
        console.log('ISS Tracker mounted');
        status = 'Initializing...';

        setTimeout(() => {
            fetchISSData();
            if (!intervalId) {
                intervalId = window.setInterval(fetchISSData, 30000);
            }
        }, 500);
    });

    onDestroy(() => {
        console.log('ISS Tracker destroyed');
        cleanup();
    });
</script>

<style lang="less">
    .iss-info {
        margin-top: 15px;
        p {
            margin: 8px 0;
            font-size: 14px;
        }
    }

    .actions {
        margin-top: 20px;
        .button {
            cursor: pointer;
            width: 100%;
            text-align: center;
            display: block;
        }
    }

    .error-message {
        background-color: #ffcccc;
        border: 1px solid #ff6666;
        padding: 10px;
        margin-bottom: 15px;
        border-radius: 4px;
        color: #cc0000;
        
        p {
            margin: 0;
        }
    }

    .status-message {
        background-color: #ccf0ff;
        border: 1px solid #6699ff;
        padding: 8px;
        margin-bottom: 15px;
        border-radius: 4px;
        color: #0066cc;
        font-size: 12px;
        
        p {
            margin: 0;
        }
    }

    :global(.iss-marker-container) {
        background: transparent !important;
        border: none !important;
    }

    :global(.iss-marker-icon) {
        font-size: 26px;
        line-height: 1;
        text-align: center;
        filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.6));
        cursor: pointer;
        user-select: none;
        transition: transform 0.15s ease-out;

        &:hover {
            transform: scale(1.3);
        }
    }
</style>
