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
    <div class="iss-info">
        <p>Current ISS Position:</p>
        <p>Latitude: {currentLat?.toFixed(4) ?? 'Loading...'}</p>
        <p>Longitude: {currentLon?.toFixed(4) ?? 'Loading...'}</p>
        <p>Altitude: {currentAlt ? `${currentAlt.toFixed(2)} km` : 'Loading...'}</p>
        <p>Velocity: {currentVel ? `${currentVel.toFixed(2)} km/h` : 'Loading...'}</p>
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

    let issMarker: L.Marker | null = null;
    let trajectoryLine: L.Polyline | null = null;
    let intervalId: number | null = null;

    const fetchISSData = async () => {
        try {
            // Fetch current position
            const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
            const data = await response.json();
            currentLat = data.latitude;
            currentLon = data.longitude;
            currentAlt = data.altitude;
            currentVel = data.velocity;

            // Update marker
            if (issMarker) {
                issMarker.setLatLng([currentLat, currentLon]);
            } else {
                issMarker = new L.Marker([currentLat, currentLon], {
                    title: 'International Space Station'
                }).addTo(map);
            }

            // Fetch trajectory (last 2 hours and next 2 hours)
            const now = Math.floor(Date.now() / 1000);
            const timestamps = [];
            for (let i = -7200; i <= 7200; i += 600) { // every 10 minutes
                timestamps.push(now + i);
            }
            const trajResponse = await fetch(`https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=${timestamps.join(',')}&units=miles`);
            const trajData = await trajResponse.json();

            const positions: [number, number][] = trajData.map((pos: any) => [pos.latitude, pos.longitude]);

            // Update trajectory line
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
        } catch (error) {
            console.error('Error fetching ISS data:', error);
        }
    };

    export const onopen = (_params: unknown) => {
        // Plugin opened
    };

    onMount(() => {
        fetchISSData();
        intervalId = window.setInterval(fetchISSData, 30000); // Update every 30 seconds
    });

    onDestroy(() => {
        if (intervalId) {
            clearInterval(intervalId);
        }
        if (issMarker) {
            map.removeLayer(issMarker);
        }
        if (trajectoryLine) {
            map.removeLayer(trajectoryLine);
        }
    });
</script>

<style lang="less">
    .iss-info {
        margin-top: 20px;
        p {
            margin: 5px 0;
        }
    }
</style>
