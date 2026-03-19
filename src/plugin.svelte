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
        <p>Latitude: {currentLat?.toFixed(4) ?? 'Loading...'}</p>
        <p>Longitude: {currentLon?.toFixed(4) ?? 'Loading...'}</p>
        <p>Altitude: {currentAlt ? `${currentAlt.toFixed(2)} km` : 'Loading...'}</p>
        <p>Velocity: {currentVel ? `${currentVel.toFixed(2)} km/h` : 'Loading...'}</p>
        <p>Last Updated: {lastUpdated ?? 'Not yet'}</p>
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

    const fetchISSData = async () => {
        try {
            error = null;
            status = 'Fetching ISS position...';
            
            // Fetch current position
            const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            currentLat = data.latitude;
            currentLon = data.longitude;
            currentAlt = data.altitude;
            currentVel = data.velocity;
            lastUpdated = new Date().toLocaleTimeString();

            // Check if map is available
            if (!map || !map.setView) {
                error = 'Map not available yet';
                status = 'Waiting for map...';
                return;
            }

            status = 'Updating map markers...';

            // Update marker
            if (issMarker) {
                issMarker.setLatLng([currentLat, currentLon]);
            } else {
                const L = (window as any).L;
                if (!L || !L.Marker) {
                    throw new Error('Leaflet not available');
                }
                issMarker = new L.Marker([currentLat, currentLon], {
                    title: 'International Space Station'
                }).addTo(map);
            }

            // Fetch trajectory - simplified to just timestamps
            status = 'Fetching trajectory...';
            const now = Math.floor(Date.now() / 1000);
            const timestamps = [];
            for (let i = -7200; i <= 7200; i += 600) { // every 10 minutes
                timestamps.push(now + i);
            }
            
            const trajUrl = `https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=${timestamps.join(',')}`;
            const trajResponse = await fetch(trajUrl);
            
            if (!trajResponse.ok) {
                throw new Error(`Trajectory API error: ${trajResponse.status}`);
            }
            
            const trajData = await trajResponse.json();

            if (!Array.isArray(trajData)) {
                throw new Error('Unexpected trajectory data format');
            }

            const positions: [number, number][] = trajData
                .filter((pos: any) => pos && pos.latitude && pos.longitude)
                .map((pos: any) => [pos.latitude, pos.longitude]);

            if (positions.length === 0) {
                throw new Error('No valid trajectory positions');
            }

            // Update trajectory line
            status = 'Drawing trajectory...';
            const L = (window as any).L;
            
            if (trajectoryLine) {
                trajectoryLine.setLatLngs(positions);
            } else {
                trajectoryLine = new L.Polyline(positions, {
                    color: 'red',
                    weight: 2,
                    opacity: 0.7
                }).addTo(map);
            }

            // Center map on current position
            map.setView([currentLat, currentLon], 3);
            status = 'ISS tracker active';

        } catch (err: any) {
            console.error('Error fetching ISS data:', err);
            error = err.message || 'Unknown error occurred';
            status = '';
        }
    };

    export const onopen = (_params: unknown) => {
        console.log('ISS Tracker plugin opened');
        status = 'Plugin opened, fetching data...';
        fetchISSData();
    };

    onMount(() => {
        console.log('ISS Tracker mounted');
        status = 'Initializing...';
        
        // Wait a moment for map to be ready
        setTimeout(() => {
            fetchISSData();
            intervalId = window.setInterval(fetchISSData, 30000); // Update every 30 seconds
        }, 500);
    });

    onDestroy(() => {
        console.log('ISS Tracker destroyed');
        if (intervalId) {
            clearInterval(intervalId);
        }
        if (issMarker && map) {
            try {
                map.removeLayer(issMarker);
            } catch (e) {
                console.log('Could not remove marker:', e);
            }
        }
        if (trajectoryLine && map) {
            try {
                map.removeLayer(trajectoryLine);
            } catch (e) {
                console.log('Could not remove trajectory:', e);
            }
        }
    });
</script>

<style lang="less">
    .iss-info {
        margin-top: 20px;
        p {
            margin: 8px 0;
            font-size: 14px;
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
</style>
