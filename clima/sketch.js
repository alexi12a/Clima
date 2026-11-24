// 1. Seleccionar los elementos HTML
const formulario = document.querySelector("#formulario");
const campoCiudad = document.querySelector("#ciudad");
const estado = document.querySelector("#estado");
const resultado = document.querySelector("#resultado");
const pronosticoGrid = document.querySelector("#pronostico-grid");

// 2. Escuchar el envío del formulario
formulario.addEventListener("submit", consultarClima);

// 3. Función asíncrona para consultar las API
async function consultarClima(evento) {
    evento.preventDefault();

    const ciudad = campoCiudad.value.trim();
    if (!ciudad) return;

    resultado.hidden = true;
    estado.textContent = "Buscando ciudad...";

    try {
        // 4. PRIMERA PETICIÓN: buscar las coordenadas
        const urlGeo = new URL("https://geocoding-api.open-meteo.com/v1/search");

        urlGeo.search = new URLSearchParams({
            name: ciudad,
            count: "1",
            language: "es",
            format: "json"
        }).toString();

        const respuestaGeo = await fetch(urlGeo);
        if (!respuestaGeo.ok) {
            throw new Error("No se pudo conectar con el servicio de ubicación.");
        }

        const datosGeo = await respuestaGeo.json();
        const lugar = datosGeo.results?.[0];

        if (!lugar) {
            throw new Error("No encontramos esa ciudad. Intenta con otro nombre.");
        }

        // 5. SEGUNDA PETICIÓN: consultar clima actual + pronóstico diario (hoy + 3 días)
        estado.textContent = "Obteniendo pronóstico...";

        const urlClima = new URL("https://api.open-meteo.com/v1/forecast");

        urlClima.search = new URLSearchParams({
            latitude: lugar.latitude,
            longitude: lugar.longitude,
            current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
            daily: "weather_code,temperature_2m_max,temperature_2m_min",
            forecast_days: "4",
            timezone: "auto",
            temperature_unit: "celsius",
            wind_speed_unit: "kmh"
        }).toString();

        const respuestaClima = await fetch(urlClima);
        if (!respuestaClima.ok) {
            throw new Error("No se pudo obtener la información meteorológica.");
        }

        const datosClima = await respuestaClima.json();

        // 6. Extraer los datos actuales y diarios
        const actual = datosClima.current;
        const diario = datosClima.daily;
        const condicion = describirClima(actual.weather_code);

        // 7. Renderizar clima actual
        document.querySelector("#ubicacion").textContent =
            [lugar.name, lugar.admin1, lugar.country].filter(Boolean).join(", ");

        document.querySelector("#icono").textContent = condicion.icono;
        document.querySelector("#temperatura").textContent = actual.temperature_2m.toFixed(1) + "°";
        document.querySelector("#descripcion").textContent = condicion.texto;
        document.querySelector("#humedad").textContent = actual.relative_humidity_2m + "%";
        document.querySelector("#sensacion").textContent = actual.apparent_temperature.toFixed(1) + "°";
        document.querySelector("#viento").textContent = actual.wind_speed_10m + " km/h";
        document.querySelector("#actualizacion").textContent =
            "Actualizado: " + actual.time.replace("T", " ") + " hrs";

        // 8. Renderizar pronóstico de los siguientes 3 días (índices 1, 2 y 3)
        renderizarPronostico(diario);

        // Mostrar resultado
        resultado.hidden = false;
        estado.textContent = "";

    } catch (error) {
        estado.textContent = error.message;
        console.error(error);
    }
}

// Función para construir las tarjetas de los próximos 3 días
function renderizarPronostico(diario) {
    pronosticoGrid.innerHTML = "";

    // Recorremos desde el índice 1 (mañana) hasta el 3 (pasado mañana + 1)
    for (let i = 1; i <= 3; i++) {
        const fechaISO = diario.time[i]; // Formato "YYYY-MM-DD"
        const codigo = diario.weather_code[i];
        const max = Math.round(diario.temperature_2m_max[i]);
        const min = Math.round(diario.temperature_2m_min[i]);

        const condicionDia = describirClima(codigo);
        const nombreDia = formatearFechaDia(fechaISO, i);

        const tarjeta = document.createElement("article");
        tarjeta.className = "dia-card";

        tarjeta.innerHTML = `
            <div class="dia-info">
                <span class="dia-icono">${condicionDia.icono}</span>
                <div>
                    <span class="dia-nombre">${nombreDia}</span>
                    <span class="dia-desc">${condicionDia.texto}</span>
                </div>
            </div>
            <div class="dia-temps">
                <span class="temp-max">${max}°</span>
                <span class="temp-min">${min}°</span>
            </div>
        `;

        pronosticoGrid.appendChild(tarjeta);
    }
}

// Convierte "2026-11-24" en "Mañana" o el nombre del día de la semana ("Miércoles, 25")
function formatearFechaDia(fechaISO, indice) {
    if (indice === 1) return "Mañana";

    // Agregamos T00:00:00 para evitar desfases de zona horaria al parsear
    const fecha = new Date(fechaISO + "T00:00:00");
    return fecha.toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric"
    });
}

// 9. Función para traducir los códigos meteorológicos
function describirClima(codigo) {
    const condiciones = {
        0:  { texto: "Despejado", icono: "☀️" },
        1:  { texto: "Mayormente despejado", icono: "🌤️" },
        2:  { texto: "Parcialmente nublado", icono: "⛅" },
        3:  { texto: "Nublado", icono: "☁️" },
        45: { texto: "Niebla", icono: "🌫️" },
        48: { texto: "Niebla densa", icono: "🌫️" },
        51: { texto: "Llovizna ligera", icono: "🌦️" },
        53: { texto: "Llovizna", icono: "🌦️" },
        55: { texto: "Llovizna intensa", icono: "🌧️" },
        61: { texto: "Lluvia ligera", icono: "🌧️" },
        63: { texto: "Lluvia moderada", icono: "🌧️" },
        65: { texto: "Lluvia intensa", icono: "🌧️" },
        71: { texto: "Nevada ligera", icono: "❄️" },
        73: { texto: "Nevada moderada", icono: "❄️" },
        75: { texto: "Nevada intensa", icono: "❄️" },
        80: { texto: "Chubascos ligeros", icono: "🌦️" },
        81: { texto: "Chubascos moderados", icono: "🌧️" },
        82: { texto: "Chubascos fuertes", icono: "🌧️" },
        95: { texto: "Tormenta eléctrica", icono: "⛈️" },
        96: { texto: "Tormenta con granizo", icono: "⛈️" },
        99: { texto: "Tormenta fuerte", icono: "⛈️" }
    };

    return condiciones[codigo] || {
        texto: "Clima variable",
        icono: "🌡️"
    };
}