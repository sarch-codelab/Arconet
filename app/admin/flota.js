"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Truck,
  FileText,
  Settings,
  Layers,
  Box,
  CheckCircle2,
  MapPin,
  Clock,
  MoreHorizontal,
  Plus,
  Minus,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageSquare,
  Thermometer,
  Fuel,
  Info,
  Zap,
  TrendingUp,
  X,
  UserCheck
} from "lucide-react";
import styles from "./flota.module.css";
import { sileo } from "../toaster";
import { SectionTabs, Topbar } from "./topbar";
import { useBodyScrollLock, useEscapeKey } from "./use-body-scroll-lock";

const TRUCKS_DATA = [
  {
    id: "trk-1",
    plate: "#A-BB84964",
    title: "Splitter óptico 1x8 PLC · 860 kg",
    containerId: "#YMLU 654383",
    type: "TRK200924 Carga",
    status: "Activo",
    location: "Sucursal San Pedro Sula",
    inTransit: "3 días",
    driver: "Carlos Discua",
    truckId: "TRK-318",
    dock: "Muelle #3",
    started: "10:30",
    originCode: "SPS",
    originCity: "San Pedro Sula",
    destCode: "LCE",
    destCity: "La Ceiba",
    currentLoad: "8.5 t",
    maxCapacity: "12.4 t",
    weightPercent: 68,
    pallets: "18/24",
    freeSpace: "25%",
    temperature: "4°C",
    fuelNeeded: "152.6 L",
    leftSide: "52%",
    rightSide: "48%",
    efficiency: "92%",
    avgDelay: "0.4 h",
    riskOfTilt: "Bajo"
  },
  {
    id: "trk-2",
    plate: "#A-BB84963",
    title: "Material de red FTTH · 760 kg",
    containerId: "#YMLU 654383",
    type: "TRK200924 Carga",
    status: "Activo",
    location: "Sucursal San Pedro Sula",
    inTransit: "3 días",
    driver: "Carlos Discua",
    truckId: "TRK-318",
    dock: "Muelle #3",
    started: "10:30",
    originCode: "SPS",
    originCity: "San Pedro Sula",
    destCode: "LCE",
    destCity: "La Ceiba",
    currentLoad: "8.5 t",
    maxCapacity: "12.4 t",
    weightPercent: 68,
    pallets: "18/24",
    freeSpace: "25%",
    temperature: "4°C",
    fuelNeeded: "152.6 L",
    leftSide: "52%",
    rightSide: "48%",
    efficiency: "92%",
    avgDelay: "0.4 h",
    riskOfTilt: "Bajo"
  },
  {
    id: "trk-3",
    plate: "#A-BB84965",
    title: "Cable ADSS y accesorios · 640 kg",
    containerId: "#WNL-492104",
    type: "TRK200924 Exprés",
    status: "Activo",
    location: "Sucursal La Ceiba",
    inTransit: "2 días",
    driver: "Camila Rojas",
    truckId: "TRK-210",
    dock: "Muelle #1",
    started: "08:15",
    originCode: "LCE",
    originCity: "La Ceiba",
    destCode: "SPS",
    destCity: "San Pedro Sula",
    currentLoad: "6.4 t",
    maxCapacity: "12.0 t",
    weightPercent: 54,
    pallets: "14/24",
    freeSpace: "42%",
    temperature: "6°C",
    fuelNeeded: "107.9 L",
    leftSide: "50%",
    rightSide: "50%",
    efficiency: "90%",
    avgDelay: "0.7 h",
    riskOfTilt: "Mínimo"
  },
  {
    id: "trk-4",
    plate: "#A-BB84962",
    title: "Gabinetes de telecomunicaciones · 580 kg",
    containerId: "#FTG-881230",
    type: "TRK200924 Reforzado",
    status: "Activo",
    location: "Sucursal San Pedro Sula",
    inTransit: "4 días",
    driver: "Marta Silva",
    truckId: "TRK-504",
    dock: "Muelle #5",
    started: "06:45",
    originCode: "SPS",
    originCity: "San Pedro Sula",
    destCode: "TGU",
    destCity: "Tegucigalpa",
    currentLoad: "9.2 t",
    maxCapacity: "14.0 t",
    weightPercent: 65,
    pallets: "16/24",
    freeSpace: "33%",
    temperature: "18°C",
    fuelNeeded: "129.4 L",
    leftSide: "51%",
    rightSide: "49%",
    efficiency: "94%",
    avgDelay: "0.5 h",
    riskOfTilt: "Bajo"
  }
];

const UNIQUE_TRUCKS = [...new Map(TRUCKS_DATA.map((truck) => [truck.truckId, truck])).values()];

const FLEET_METRICS = {
  active: UNIQUE_TRUCKS.filter((truck) => truck.status === "Activo").length,
  maintenance: UNIQUE_TRUCKS.filter((truck) => truck.status === "En mantenimiento").length,
  onTimeAverage: Math.round(
    UNIQUE_TRUCKS.reduce((sum, truck) => sum + Number.parseInt(truck.efficiency, 10), 0) /
      UNIQUE_TRUCKS.length,
  ),
  inTransit: UNIQUE_TRUCKS.filter((truck) => truck.status === "Activo" && truck.inTransit).length,
};

// Genera las 24 marcas del arco radial segmentado
function renderRadialTicks(weightPercent) {
  const totalTicks = 24;
  const activeTicksCount = Math.round((weightPercent / 100) * totalTicks);
  const ticks = [];
  const startAngle = 195; // degrees
  const endAngle = -15; // degrees
  const radius = 56;
  const tickLength = 14;

  for (let i = 0; i < totalTicks; i++) {
    const t = i / (totalTicks - 1);
    const angleDeg = startAngle + t * (endAngle - startAngle);
    const angleRad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const x1 = 70 + (radius - tickLength) * cos;
    const y1 = 80 - (radius - tickLength) * sin;
    const x2 = 70 + radius * cos;
    const y2 = 80 - radius * sin;

    const isActive = i < activeTicksCount;

    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isActive ? "#f97316" : "#e5e7eb"}
        strokeWidth={isActive ? 3.4 : 2.8}
        strokeLinecap="round"
        style={{
          transition: "stroke 0.3s ease, stroke-width 0.3s ease"
        }}
      />
    );
  }
  return ticks;
}

const FLEET_TABS = [
  { id: "dashboard", label: "Panel", icon: Layers, title: "Panel de flota" },
  { id: "vehicles", label: "Vehículos", icon: Truck, title: "Lista de camiones" },
  { id: "map", label: "Mapa", icon: MapPin, title: "Sucursales y geolocalización GPS" },
  { id: "orders", label: "Documentos", icon: FileText, title: "Cotizaciones y manifiestos" },
  { id: "analytics", label: "Estadísticas", icon: TrendingUp, title: "Resumen y estadísticas de flota" },
];

export default function FleetSection({ onNavigate }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedTruckId, setSelectedTruckId] = useState("trk-2");
  const [zoomScale, setZoomScale] = useState(1);
  const [hotspotModalOpen, setHotspotModalOpen] = useState(false);
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Los modales de flota bloquean el fondo y se cierran con Escape.
  const anyModalOpen = hotspotModalOpen || driverModalOpen || routeModalOpen;
  useBodyScrollLock(anyModalOpen);
  useEscapeKey(hotspotModalOpen, () => setHotspotModalOpen(false));
  useEscapeKey(driverModalOpen, () => setDriverModalOpen(false));
  useEscapeKey(routeModalOpen, () => setRouteModalOpen(false));

  const showToast = (msg) => {
    if (msg) sileo.info({ title: String(msg) });
  };

  const handleTabSelect = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "map" && onNavigate) {
      onNavigate("sucursales");
      return;
    }
    if (tabId === "orders" && onNavigate) {
      onNavigate("cotizaciones");
      return;
    }
    if (tabId === "analytics" && onNavigate) {
      onNavigate("resumen");
      return;
    }
    if (tabId === "vehicles") {
      showToast("Vista de vehículos seleccionada");
    }
  };

  const currentTruck = useMemo(() => {
    return TRUCKS_DATA.find((t) => t.id === selectedTruckId) || TRUCKS_DATA[1];
  }, [selectedTruckId]);

  const handleNextTruck = () => {
    const idx = TRUCKS_DATA.findIndex((t) => t.id === selectedTruckId);
    const nextIdx = (idx + 1) % TRUCKS_DATA.length;
    setSelectedTruckId(TRUCKS_DATA[nextIdx].id);
  };

  const handlePrevTruck = () => {
    const idx = TRUCKS_DATA.findIndex((t) => t.id === selectedTruckId);
    const prevIdx = (idx - 1 + TRUCKS_DATA.length) % TRUCKS_DATA.length;
    setSelectedTruckId(TRUCKS_DATA[prevIdx].id);
  };

  return (
    <div className={styles.fleetContainer}>
      {/* ==================================================================
          1. BARRA GLOBAL (marca | pildoras | buscador y perfil)
          ================================================================== */}
      <Topbar
        title="Flota"
        subtitle="Vista de demostración de vehículos y rutas; los datos no provienen de rastreo en vivo."
      />

      <div className={styles.fleetContent}>
        <SectionTabs
          tabs={FLEET_TABS}
          activeTab={activeTab}
          onTabChange={handleTabSelect}
          label="Vistas de flota"
        />

      {/* ==================================================================
          2. TITLE ROW & 4 FLOATING KPI CARDS
          ================================================================== */}
      <section className={styles.overviewRow} aria-label="Resumen de indicadores">
        <div className={styles.overviewTitleBlock}>
          <h1 className={styles.mainTitle}>Resumen operativo</h1>
          <p className={styles.subtitle}>
            Datos de demostración de la flota. El rastreo GPS y la telemetría aún no están conectados.
          </p>
        </div>

        <div className={styles.kpiCardsRow}>
          {/* Card 1: Vehículos activos */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrap}>
              <Truck size={17} />
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Vehículos activos</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{FLEET_METRICS.active}</span>
                <span className={styles.kpiBadgeGreen}>Registrados</span>
              </div>
            </div>
          </div>

          {/* Card 2: Vehículos en mantenimiento */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrap}>
              <FileText size={17} />
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Vehículos en mantenimiento</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{FLEET_METRICS.maintenance}</span>
                <span className={styles.kpiBadgeGreen}>Registrados</span>
              </div>
            </div>
          </div>

          {/* Card 3: Eficiencia media */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrap}>
              <Settings size={17} />
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Puntualidad prevista</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{FLEET_METRICS.onTimeAverage}%</span>
                <span className={styles.kpiBadgeGreen}>Promedio</span>
              </div>
            </div>
          </div>

          {/* Card 4: Carga en tránsito */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrap}>
              <Layers size={17} />
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Carga en tránsito</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{FLEET_METRICS.inTransit}</span>
                <span className={styles.kpiBadgeGreen}>Rutas registradas</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
          3. MAIN LAYOUT (Left Column 70% | Right Column 30%)
          ================================================================== */}
      <div className={styles.mainGrid}>
        {/* LEFT COLUMN: Main Showcase + Strip + 3 Bottom Cards */}
        <div className={styles.leftColumn}>
          {/* Main Truck Showcase Viewport Card */}
          <div className={styles.truckShowcaseCard}>
            {/* Tarjeta flotante con efecto cristal: detalles del contenedor */}
            <div className={styles.containerDetailsFloating}>
              <div className={styles.floatingHead}>
                <div className={styles.floatingHeadLeft}>
                  <Box size={13} color="#f97316" />
                  <span>Detalles del contenedor</span>
                </div>
                <button
                  type="button"
                  className={styles.threeDotsBtn}
                  onClick={() => setHotspotModalOpen(true)}
                  aria-label="Opciones de contenedor"
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>

              <div className={styles.containerIdLabel}>ID del contenedor</div>
              <div className={styles.containerIdValue}>{currentTruck.containerId}</div>

              {/* Miniatura 3D del contenedor */}
              <div className={styles.container3DThumb}>
                <Image
                  src="/fleet/container-thumb.jpg"
                  alt="Contenedor en 3D"
                  width={180}
                  height={62}
                  style={{ objectFit: "cover" }}
                />
              </div>

              {/* Specs Rows */}
              <div className={styles.floatingList}>
                <div className={styles.floatingRow}>
                  <span className={styles.floatingRowLabel}>
                    <Box size={11} /> Tipo
                  </span>
                  <span className={styles.floatingRowVal}>{currentTruck.type}</span>
                </div>
                <div className={styles.floatingRow}>
                  <span className={styles.floatingRowLabel}>
                    <CheckCircle2 size={11} /> Estado
                  </span>
                  <span className={styles.activeDotPill}>
                    <span className={styles.activeDot} />
                    {currentTruck.status}
                  </span>
                </div>
                <div className={styles.floatingRow}>
                  <span className={styles.floatingRowLabel}>
                    <MapPin size={11} /> Ubicaci&oacute;n
                  </span>
                  <span className={styles.floatingRowVal}>{currentTruck.location}</span>
                </div>
                <div className={styles.floatingRow}>
                  <span className={styles.floatingRowLabel}>
                    <Clock size={11} /> En tr&aacute;nsito
                  </span>
                  <span className={styles.floatingRowVal}>{currentTruck.inTransit}</span>
                </div>
              </div>
            </div>

            {/* Truck Stage & Image */}
            <div
              className={styles.truckStage}
              style={{ transform: `scale(${zoomScale})` }}
            >
              <Image
                src="/fleet/truck-orange.jpg"
                alt="Orange Cargo Truck"
                fill
                priority
                className={styles.truckImage}
              />

              {/* Punto interactivo sobre el contenedor */}
              <button
                type="button"
                className={styles.truckHotspot}
                onClick={() => setHotspotModalOpen(true)}
                title="Inspeccionar telemetría de contenedor"
                aria-label="Inspeccionar contenedor"
              >
                <Plus size={16} strokeWidth={3} />
                <span className={styles.hotspotPulse} />
              </button>
            </div>

            {/* Floating Bottom-Left Zoom Controls */}
            <div className={styles.zoomControlsPill}>
              <button
                type="button"
                className={styles.zoomBtn}
                onClick={() => setZoomScale((z) => Math.max(0.85, z - 0.1))}
                title="Alejar"
                aria-label="Alejar"
              >
                <Minus size={13} />
              </button>
              <button
                type="button"
                className={styles.zoomBtn}
                onClick={() => setZoomScale((z) => Math.min(1.3, z + 0.1))}
                title="Acercar"
                aria-label="Acercar"
              >
                <Plus size={13} />
              </button>
              <button
                type="button"
                className={styles.resetViewBtn}
                onClick={() => setZoomScale(1)}
              >
                <RotateCcw size={11} />
                <span>Restablecer vista</span>
              </button>
            </div>

            {/* Floating Bottom-Right Slider Arrows */}
            <div className={styles.sliderArrowControls}>
              <button
                type="button"
                className={styles.sliderArrowBtn}
                onClick={handlePrevTruck}
                title="Camión anterior"
                aria-label="Camión anterior"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                className={styles.sliderArrowBtn}
                onClick={handleNextTruck}
                title="Siguiente camión"
                aria-label="Siguiente camión"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Carrusel de seleccion de camiones */}
          <div className={styles.carouselStrip} role="region" aria-label="Selector de camiones">
            <button
              type="button"
              className={styles.carouselArrowBtn}
              onClick={handlePrevTruck}
              aria-label="Anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <div className={styles.carouselTrack}>
              {TRUCKS_DATA.map((truck) => {
                const isSelected = truck.id === selectedTruckId;
                return (
                  <div
                    key={truck.id}
                    className={`${styles.truckCardMini} ${isSelected ? styles.truckCardMiniActive : ""}`}
                    onClick={() => {
                      setSelectedTruckId(truck.id);
                      showToast(`Seleccionado ${truck.plate} — ${truck.title}`);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelectedTruckId(truck.id);
                      }
                    }}
                  >
                    <div className={styles.truckMiniCopy}>
                      <span className={styles.truckMiniPlate}>{truck.plate}</span>
                      <span className={styles.truckMiniDesc}>{truck.title}</span>
                    </div>
                    <Image
                      src="/fleet/mini-truck.jpg"
                      alt={truck.plate}
                      width={44}
                      height={28}
                      className={styles.truckMiniImg}
                    />
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className={styles.carouselArrowBtn}
              onClick={handleNextTruck}
              aria-label="Siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Fila inferior: 3 tarjetas de informacion */}
          <div className={styles.bottomRowGrid}>
            {/* Tarjeta 1: estadisticas operativas en 4 cuadrantes */}
            <div className={styles.bottomCard}>
              <div className={styles.quadrantGrid}>
                {/* Quadrant 1 */}
                <div className={styles.quadrantItem}>
                  <div className={styles.quadrantHead}>
                    <span>Total de pallets cargados</span>
                    <Box size={14} className={styles.quadrantIcon} />
                  </div>
                  <div className={styles.quadrantValue}>{currentTruck.pallets}</div>
                </div>

                {/* Quadrant 2 */}
                <div className={styles.quadrantItem}>
                  <div className={styles.quadrantHead}>
                    <span>Espacio libre restante</span>
                    <Info size={14} className={styles.quadrantIcon} />
                  </div>
                  <div className={styles.quadrantValue}>{currentTruck.freeSpace}</div>
                </div>

                {/* Quadrant 3 */}
                <div className={styles.quadrantItem}>
                  <div className={styles.quadrantHead}>
                    <span>Estado de la temperatura</span>
                    <Thermometer size={14} className={styles.quadrantIcon} />
                  </div>
                  <div className={styles.quadrantValue}>{currentTruck.temperature}</div>
                </div>

                {/* Quadrant 4 */}
                <div className={styles.quadrantItem}>
                  <div className={styles.quadrantHead}>
                    <span>Combustible necesario</span>
                    <Fuel size={14} className={styles.quadrantIcon} />
                  </div>
                  <div className={styles.quadrantValue}>{currentTruck.fuelNeeded}</div>
                </div>
              </div>
            </div>

            {/* Card 2: Delivery efficiency Curve Chart */}
            <div className={styles.bottomCard}>
              <div className={styles.efficiencyHead}>
                <div className={styles.efficiencyBigNum}>{currentTruck.efficiency}</div>
                <div className={styles.efficiencySublabel}>Probabilidad de llegar a tiempo</div>
              </div>

              {/* Custom SVG Curve with Area & Peak Annotation */}
              <div className={styles.efficiencyChartWrap}>
                <svg
                  className={styles.efficiencyChartSvg}
                  viewBox="0 0 260 70"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Underlay subtle histogram bars */}
                  {Array.from({ length: 28 }).map((_, i) => {
                    const x = 8 + i * 8.8;
                    // bell shape height
                    const distFromCenter = Math.abs(x - 130);
                    const barHeight = Math.max(3, 26 - distFromCenter * 0.18);
                    return (
                      <rect
                        key={i}
                        x={x}
                        y={62 - barHeight}
                        width="1.6"
                        height={barHeight}
                        fill="#e5e7eb"
                        rx="0.8"
                      />
                    );
                  })}

                  {/* Shaded Area under Curve */}
                  <path
                    d="M 10 58 Q 70 54, 100 42 Q 130 18, 142 18 Q 165 24, 195 46 Q 225 56, 250 58 L 250 62 L 10 62 Z"
                    fill="url(#curveGradient)"
                  />

                  {/* Orange Curve Line */}
                  <path
                    d="M 10 58 Q 70 54, 100 42 Q 130 18, 142 18 Q 165 24, 195 46 Q 225 56, 250 58"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />

                  {/* Vertical Dotted Line at Peak */}
                  <line
                    x1="138"
                    y1="18"
                    x2="138"
                    y2="62"
                    stroke="#f97316"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />

                  {/* Arrow Pin at Peak */}
                  <circle cx="138" cy="18" r="2.5" fill="#f97316" />

                  {/* Floating Tag: ±0.4h */}
                  <g transform="translate(122, 2)">
                    <rect x="0" y="0" width="34" height="13" rx="6.5" fill="#f97316" />
                    <text
                      x="17"
                      y="9.5"
                      fill="#ffffff"
                      fontSize="8.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      ±0.4h
                    </text>
                  </g>
                </svg>
              </div>

              <div className={styles.efficiencyFooter}>
                <span>Retraso medio (previsto)</span>
                <span className={styles.efficiencyFooterVal}>{currentTruck.avgDelay}</span>
              </div>
            </div>

            {/* Tarjeta 3: balance de carga */}
            <div className={styles.bottomCard}>
              <div className={styles.loadBalanceHead}>Balance de carga</div>

              <div className={styles.balanceStatsRow}>
                <div className={styles.balanceSide}>
                  <span className={styles.balancePercent}>{currentTruck.leftSide}</span>
                  <span className={styles.balanceLabel}>Lado izquierdo</span>
                </div>
                <div className={styles.balanceSide} style={{ textAlign: "right" }}>
                  <span className={styles.balancePercent}>{currentTruck.rightSide}</span>
                  <span className={styles.balanceLabel}>Lado derecho</span>
                </div>
              </div>

              {/* Balance Visualization: Blue & Orange Segment Bars & Sensors */}
              <div className={styles.balanceVisualWrap}>
                <div className={styles.balanceSegments}>
                  <span className={styles.segmentBlue} />
                  <span className={styles.segmentBlue} />
                  <span className={styles.segmentBlue} />
                  <span className={styles.segmentOrange} />
                  <span className={styles.segmentOrange} />
                  <span className={styles.segmentOrange} />
                </div>

                {/* Sensor oscillations ticks */}
                <div className={styles.sensorTicks}>
                  {Array.from({ length: 26 }).map((_, i) => (
                    <span
                      key={i}
                      className={`${styles.sensorTick} ${i % 5 === 0 ? styles.sensorTickTall : ""}`}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.balanceFooter}>
                <span>Riesgo de vuelco:</span>
                <span className={styles.balanceRiskBadge}>{currentTruck.riskOfTilt}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: 3 tarjetas (camion | capacidad | ruta IA) */}
        <div className={styles.rightColumn}>
          {/* Tarjeta 1: informacion del camion */}
          <div className={styles.rightCard}>
            <div className={styles.rightCardTitle}>Información del camión</div>

            {/* Fila con el perfil del conductor */}
            <div className={styles.driverRow}>
              <div className={styles.driverInfoLeft}>
                <div className={styles.driverAvatarCircle}>
                  <Image
                    src="/fleet/driver-ethan.jpg"
                    alt={currentTruck.driver}
                    width={36}
                    height={36}
                  />
                </div>
                <div className={styles.driverMeta}>
                  <span className={styles.driverLabel}>Conductor</span>
                  <span className={styles.driverName}>{currentTruck.driver}</span>
                </div>
              </div>

              <div className={styles.driverActions}>
                <button
                  type="button"
                  className={styles.roundActionBtn}
                  onClick={() => showToast(`Llamando a ${currentTruck.driver}...`)}
                  title="Llamar al conductor"
                  aria-label="Llamar"
                >
                  <Phone size={14} />
                </button>
                <button
                  type="button"
                  className={styles.roundActionBtn}
                  onClick={() => showToast(`Enviando mensaje a ${currentTruck.driver}...`)}
                  title="Mensaje directo"
                  aria-label="Mensaje"
                >
                  <MessageSquare size={14} />
                </button>
              </div>
            </div>

            {/* 3-Column Truck Specs */}
            <div className={styles.truckSpecsGrid}>
              <div className={styles.specCol}>
                <span className={styles.specLabel}>ID del camión</span>
                <span className={styles.specValue}>{currentTruck.truckId}</span>
              </div>
              <div className={styles.specCol}>
                <span className={styles.specLabel}>Muelle</span>
                <span className={styles.specValue}>{currentTruck.dock}</span>
              </div>
              <div className={styles.specCol}>
                <span className={styles.specLabel}>Salida</span>
                <span className={styles.specValue}>{currentTruck.started}</span>
              </div>
            </div>

            {/* Linea de tiempo de la ruta */}
            <div className={styles.routeTimelineRow}>
              <div className={styles.routePoint}>
                <span className={styles.routeCode}>{currentTruck.originCode}</span>
                <span className={styles.routeName}>{currentTruck.originCity}</span>
              </div>

              <div className={styles.routeTrack}>
                <div className={styles.routeTrackFilled} />
                <div className={styles.routeTruckMarker}>
                  <Truck size={10} />
                </div>
              </div>

              <div className={styles.routePoint} style={{ textAlign: "right" }}>
                <span className={styles.routeCode}>{currentTruck.destCode}</span>
                <span className={styles.routeName}>{currentTruck.destCity}</span>
              </div>
            </div>

            {/* Botones de accion */}
            <div className={styles.driverActionBtnsRow}>
              <button
                type="button"
                className={styles.subtlePillBtn}
                onClick={() => setDriverModalOpen(true)}
              >
                Cambiar conductor
              </button>
              <button
                type="button"
                className={styles.subtlePillBtn}
                onClick={() => setRouteModalOpen(true)}
              >
                Editar ruta
              </button>
            </div>
          </div>

          {/* Tarjeta 2: capacidad y carga */}
          <div className={styles.rightCard}>
              <div className={styles.rightCardTitle}>Capacidad y carga</div>

            <div className={styles.gaugeAndSpecsRow}>
              {/* Radial Arch Gauge */}
              <div className={styles.radialGaugeWrap}>
                <svg
                  className={styles.radialGaugeSvg}
                  viewBox="0 0 140 90"
                  aria-label={`Capacidad utilizada: ${currentTruck.weightPercent}%`}
                >
                  {renderRadialTicks(currentTruck.weightPercent)}
                </svg>
                <div className={styles.gaugeCenterText}>
                  <span className={styles.gaugePercent}>{currentTruck.weightPercent}%</span>
                  <span className={styles.gaugeSubtext}>Peso</span>
                </div>
              </div>

              {/* Load Specs */}
              <div className={styles.loadSpecsCol}>
                <div className={styles.loadSpecItem}>
                  <span className={styles.loadSpecLabel}>Carga actual</span>
                  <span className={styles.loadSpecValue}>{currentTruck.currentLoad}</span>
                </div>
                <div className={styles.loadSpecItem}>
                  <span className={styles.loadSpecLabel}>Capacidad máxima</span>
                  <span className={styles.loadSpecValue}>{currentTruck.maxCapacity}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta 3: optimizacion de ruta con IA */}
          <div className={`${styles.rightCard} ${styles.aiRouteCard}`}>
            <div className={styles.aiRouteTitleArea}>
              <div className={styles.rightCardTitle}>Optimización de ruta con IA</div>
            </div>

            <div className={styles.aiRouteMapViewport}>
              <Image
                src="/fleet/ai-route.jpg"
                alt="Mapa 3D de la ruta optimizada"
                fill
                className={styles.aiRouteMapImg}
              />

              {/* Floating Badges */}
              <div className={styles.aiBadgesOverlay}>
                <span className={styles.aiPillBadge}>
                  <Zap size={12} color="#f97316" />
                  <span>Optimizada con IA</span>
                </span>
                <span className={styles.aiPillBadge}>
                  <Fuel size={12} color="#10b981" />
                  <span>24% de combustible ahorrado</span>
                </span>
              </div>

              {/* Map Zoom Controls */}
              <div className={styles.mapControlsOverlay}>
                <button
                  type="button"
                  className={styles.mapZoomBtn}
                  onClick={() => showToast("Mapa: nivel de zoom alejado")}
                  aria-label="Alejar mapa"
                >
                  <Minus size={12} />
                </button>
                <button
                  type="button"
                  className={styles.mapZoomBtn}
                  onClick={() => showToast("Mapa: nivel de zoom acercado")}
                  aria-label="Acercar mapa"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================
          MODALS & TOAST
          ================================================================== */}

      {/* Modal de inspeccion del contenedor en un punto caliente */}
      {hotspotModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setHotspotModalOpen(false)}>
          <div
              className={styles.modalContent}
              role="dialog"
              aria-modal="true"
              aria-label="Inspección de contenedor"
              onClick={(e) => e.stopPropagation()}
            >
            <div className={styles.modalHead}>
              <div className={styles.modalHeadTitle}>
                Inspección de Contenedor {currentTruck.containerId}
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setHotspotModalOpen(false)}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{ width: "80px", height: "60px", position: "relative" }}>
                  <Image
                    src="/fleet/container-thumb.jpg"
                    alt="Contenedor"
                    fill
                    style={{ objectFit: "cover", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700" }}>{currentTruck.type}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    Precinto digital #SEC-98412 · Válido
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                <div style={{ background: "#f8f9fb", padding: "10px", borderRadius: "10px" }}>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>Temperatura</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#111827" }}>
                    {currentTruck.temperature}
                  </div>
                </div>
                <div style={{ background: "#f8f9fb", padding: "10px", borderRadius: "10px" }}>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>Humedad relativa</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#111827" }}>
                    48% HR
                  </div>
                </div>
                <div style={{ background: "#f8f9fb", padding: "10px", borderRadius: "10px" }}>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>Carga estibada</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#111827" }}>
                    {currentTruck.pallets} palets
                  </div>
                </div>
                <div style={{ background: "#f8f9fb", padding: "10px", borderRadius: "10px" }}>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>Espacio libre</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#111827" }}>
                    {currentTruck.freeSpace}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button
                type="button"
                className={styles.modalSubmitBtn}
                onClick={() => {
                  setHotspotModalOpen(false);
                  showToast("Telemetría verificada sin anomalías");
                }}
              >
                Confirmar verificación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cambiar el conductor */}
      {driverModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setDriverModalOpen(false)}>
          <div
              className={styles.modalContent}
              role="dialog"
              aria-modal="true"
              aria-label="Asignar conductor"
              onClick={(e) => e.stopPropagation()}
            >
            <div className={styles.modalHead}>
              <div className={styles.modalHeadTitle}>Asignar conductor</div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setDriverModalOpen(false)}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 10px" }}>
                Selecciona el conductor certificado para el camión {currentTruck.plate}:
              </p>
              {["Ethan Carter", "Camila Rojas", "Marta Silva", "David Morales"].map((name) => (
                <div
                  key={name}
                  onClick={() => {
                    setDriverModalOpen(false);
                    showToast(`Conductor actualizado a: ${name}`);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: name === currentTruck.driver ? "#fef3c7" : "#f9fafb",
                    border: "1px solid #e5e7eb",
                    cursor: "pointer"
                  }}
                >
                  <span style={{ fontWeight: "600", fontSize: "13px" }}>{name}</span>
                  {name === currentTruck.driver && <UserCheck size={16} color="#d97706" />}
                </div>
              ))}
            </div>
            <div className={styles.modalFoot}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setDriverModalOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edicion de la ruta */}
      {routeModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setRouteModalOpen(false)}>
          <div
              className={styles.modalContent}
              role="dialog"
              aria-modal="true"
              aria-label="Modificar ruta inteligente"
              onClick={(e) => e.stopPropagation()}
            >
            <div className={styles.modalHead}>
              <div className={styles.modalHeadTitle}>Modificar ruta inteligente</div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setRouteModalOpen(false)}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalInputGroup}>
                <label className={styles.modalLabel}>Origen</label>
                <input
                  type="text"
                  defaultValue={`${currentTruck.originCode} — ${currentTruck.originCity}`}
                  className={styles.modalInput}
                />
              </div>
              <div className={styles.modalInputGroup}>
                <label className={styles.modalLabel}>Destino</label>
                <input
                  type="text"
                  defaultValue={`${currentTruck.destCode} — ${currentTruck.destCity}`}
                  className={styles.modalInput}
                />
              </div>
              <div className={styles.modalInputGroup}>
                <label className={styles.modalLabel}>Muelle asignado</label>
                <input
                  type="text"
                  defaultValue={currentTruck.dock}
                  className={styles.modalInput}
                />
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setRouteModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.modalSubmitBtn}
                onClick={() => {
                  setRouteModalOpen(false);
                  showToast("Ruta recalculada con éxito por IA");
                }}
              >
                Optimizar con IA
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
