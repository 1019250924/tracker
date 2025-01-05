const map = L.map('map').setView([37.469152, 121.413794], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const busRoutes = {
    1: {
        stops: [
            [37.452884, 121.459474], [37.449204, 121.459591], [37.451323, 121.434782], 
            [37.458414, 121.434409], [37.46827, 121.425595], [37.478731, 121.420306], 
            [37.471843234493434, 121.40872525706443]
        ],
        routeColor: '#F0A332',
        password: 'bus0001'
    },
    2: {
        stops: [
            [37.579942, 121.190036], [37.586694, 121.1893], [37.583219, 121.21128], 
            [37.574336, 121.243813], [37.573172, 121.2547], [37.573691, 121.254103], 
            [37.471843234493434, 121.40872525706443]
        ],
        routeColor: '#798b27',
        password: 'bus0002'
    }
};

const busMarkers = {};
const routeControls = {};
const userMarkers = {};
let currentUserBus = null;
let currentUserId = null;

// 노선 및 정거장 표시
Object.keys(busRoutes).forEach(busNum => {
    const stops = busRoutes[busNum].stops;

    // 노선 추가
    const routeControl = L.Routing.control({
        waypoints: stops.map(coords => L.latLng(coords[0], coords[1])),
        lineOptions: { styles: [{ color: busRoutes[busNum].routeColor, weight: 5 }] },
        draggableWaypoints: false,
        createMarker: () => null
    }).addTo(map);
    routeControls[busNum] = routeControl;


    const busIcon = L.divIcon({ 
        html: `<i class="fa-solid fa-bus" style="color: ${busRoutes[busNum].routeColor}; font-size:24px;"></i>`,
        className: 'bus-marker' 
    });
    const marker = L.marker(stops[0], {
        title: `Bus ${busNum} Current Location`,
        icon: busIcon
    }).addTo(map);
    busMarkers[busNum] = marker;


    L.marker(stops[stops.length - 1], {
        icon: L.divIcon({ html: '<i class="fa-solid fa-school" style="font-size:24px; color: #B71C1C;"></i>;', className: 'stop-marker' })
    }).addTo(map);


stops.forEach((stop, index) => {
    const excludeCoordinates = [37.471843234493434, 121.40872525706443];

    if (stop[0] !== excludeCoordinates[0] || stop[1] !== excludeCoordinates[1]) {
        const stopIcon = L.divIcon({
            html: `<i class="fa-solid fa-location-dot" style="font-size:16px; color: #2E2E2E;"></i>`,
            className: 'stop-marker'
        });
        const stopMarker = L.marker(stop, { icon: stopIcon }).addTo(map);
        stopMarker.on('moveend', function() {
            if (index < stops.length - 1) {
                stopMarker.setIcon(L.divIcon({
                    html: `<i class="fa-solid fa-location-dot" style="color:gray; font-size:16px;"></i>`,
                    className: 'stop-marker'
                }));
            }
        });
    }
});
});

// WebSocket连接
const socket = new WebSocket('ws://localhost:8080');

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.busNum === 1) {
        if (!busMarkers[1]) {
            const busIcon = L.divIcon({
                html: `<i class="fa-solid fa-bus" style="color:${busRoutes[1].routeColor}; font-size:24px;"></i>`,
                className: 'bus-marker'
            });
            busMarkers[1] = L.marker([data.lat, data.lon], { icon: busIcon }).addTo(map);
        } else {
            busMarkers[1].setLatLng([data.lat, data.lon]);
        }
    }

    if (data.busNum === 2) {
        if (!busMarkers[2]) {
            const busIcon = L.divIcon({
                html: `<i class="fa-solid fa-bus" style="color:${busRoutes[2].routeColor}; font-size:24px;"></i>`,
                className: 'bus-marker'
            });
            busMarkers[2] = L.marker([data.lat, data.lon], { icon: busIcon }).addTo(map);
        } else {
            busMarkers[2].setLatLng([data.lat, data.lon]);
        }
    }
};

// 로그인 처리
function submitId() {
    const userId = document.getElementById('userId').value;
    
    if (userId === '1호차' || userId === '2호차') {
        const password = prompt(`${userId}의 비밀번호를 입력하세요:`);

        if ((userId === '1호차' && password === busRoutes[1].password) || 
            (userId === '2호차' && password === busRoutes[2].password)) {
            alert(`${userId}에 로그인 하셨습니다. 실시간 위치를 공유하시겠습니까?`);
            const shareLocation = confirm(`${userId}의 실시간 위치를 공유하시겠습니까?`);
            if (shareLocation) {
                currentUserBus = userId === '1호차' ? 1 : 2;
                currentUserId = userId;
                document.getElementById('user-id-display').textContent = `Logged in as: ${userId}`;
                startLocationTracking(true);
            } else {
                resetLogin();
            }
        } else {
            alert('잘못된 비밀번호입니다.');
            resetLogin();
        }
    } else {
        alert(`${userId}로 로그인 하셨습니다. 실시간 위치를 공유하시겠습니까?`);
        const shareLocation = confirm(`${userId}의 실시간 위치를 공유하시겠습니까?`);
        if (shareLocation) {
            document.getElementById('user-id-display').textContent = `Logged in as: ${userId}`;
            currentUserId = userId;
            startLocationTracking(false);
        } else {
            resetLogin();
        }
    }
}

function resetLogin() {
    document.getElementById('user-id-display').textContent = 'Not logged in';
    currentUserBus = null;
    currentUserId = null;
}

// 위치 추적 (사용자 위치 얻기)
function startLocationTracking(isBus) {
    if (currentUserBus || currentUserId) {
        navigator.geolocation.watchPosition((position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            if (isBus && currentUserBus) {
                socket.send(JSON.stringify({
                    busNum: currentUserBus,
                    lat: lat,
                    lon: lon
                }));
                busMarkers[currentUserBus].setLatLng([lat, lon]);
            }

            if (!isBus && currentUserId && !userMarkers[currentUserId]) {
                const userIcon = L.divIcon({
                    html: `<i class="fa-solid fa-person" style="font-size:24px;"></i>`,
                    className: 'user-marker'
                });
                userMarkers[currentUserId] = L.marker([lat, lon], { icon: userIcon }).addTo(map);
            }
            if (userMarkers[currentUserId]) {
                userMarkers[currentUserId].setLatLng([lat, lon]);
            }
        });
    }
}

// 노선 토글
function toggleRoute(busNum) {
    if (routeControls[busNum]._map) {
        map.removeControl(routeControls[busNum]);
        busMarkers[busNum].removeFrom(map);
    } else {
        routeControls[busNum].addTo(map);
        busMarkers[busNum].addTo(map);
    }
}