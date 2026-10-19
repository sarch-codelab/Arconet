"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Truck,
  FileText,
  Settings,
  Layers,
  Search,
  Bell,
  Menu,
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

const TRUCKS_DATA = [
  {
    id: "trk-1",
    plate: "#A-BB84964",
    title: "Hospital Freight 860kg",
    containerId: "#YMLU 654383",
    type: "TRK200924 Cargo",
    status: "Active",
    location: "Southgate Depot",
    inTransit: "3 Days",
    driver: "Ethan Carter",
    truckId: "TRK-318",
    dock: "Dock #3",
    started: "10:30 AM",
    originCode: "NY",
    originCity: "New York",
    destCode: "AU",
    destCity: "Australia",
    currentLoad: "8.5 tons",
    maxCapacity: "12.4 tons",
    weightPercent: 68,
    pallets: "18/24",
    freeSpace: "25%",
    temperature: "4°C",
    fuelNeeded: "40.32 gal",
    leftSide: "52%",
    rightSide: "48%",
    efficiency: "15%",
    avgDelay: "52%",
    riskOfTilt: "Low"
  },
  {
    id: "trk-2",
    plate: "#A-BB84963",
    title: "Clinic Materials 760kg",
    containerId: "#YMLU 654383",
    type: "TRK200924 Cargo",
    status: "Active",
    location: "Southgate Depot",
    inTransit: "3 Days",
    driver: "Ethan Carter",
    truckId: "TRK-318",
    dock: "Dock #3",
    started: "10:30 AM",
    originCode: "NY",
    originCity: "New York",
    destCode: "AU",
    destCity: "Australia",
    currentLoad: "8.5 tons",
    maxCapacity: "12.4 tons",
    weightPercent: 68,
    pallets: "18/24",
    freeSpace: "25%",
    temperature: "4°C",
    fuelNeeded: "40.32 gal",
    leftSide: "52%",
    rightSide: "48%",
    efficiency: "15%",
    avgDelay: "52%",
    riskOfTilt: "Low"
  },
  {
    id: "trk-3",
    plate: "#A-BB84965",
    title: "Wellness Products 640kg",
    containerId: "#WNL-492104",
    type: "TRK200924 Express",
    status: "Active",
    location: "Central Depot",
    inTransit: "2 Days",
    driver: "Camila Rojas",
    truckId: "TRK-210",
    dock: "Dock #1",
    started: "08:15 AM",
    originCode: "CHI",
    originCity: "Chicago",
    destCode: "MIA",
    destCity: "Miami",
    currentLoad: "6.4 tons",
    maxCapacity: "12.0 tons",
    weightPercent: 54,
    pallets: "14/24",
    freeSpace: "42%",
    temperature: "6°C",
    fuelNeeded: "28.50 gal",
    leftSide: "50%",
    rightSide: "50%",
    efficiency: "19%",
    avgDelay: "38%",
    riskOfTilt: "Minimal"
  },
  {
    id: "trk-4",
    plate: "#A-BB84962",
    title: "Fitness Gear 580kg",
    containerId: "#FTG-881230",
    type: "TRK200924 Heavy",
    status: "Active",
    location: "Westside Hub",
    inTransit: "4 Days",
    driver: "Marta Silva",
    truckId: "TRK-504",
    dock: "Dock #5",
    started: "06:45 AM",
    originCode: "LAX",
    originCity: "Los Angeles",
    destCode: "SEA",
    destCity: "Seattle",
    currentLoad: "9.2 tons",
    maxCapacity: "14.0 tons",
    weightPercent: 65,
    pallets: "16/24",
    freeSpace: "33%",
    temperature: "18°C",
    fuelNeeded: "34.20 gal",
    leftSide: "51%",
    rightSide: "49%",
    efficiency: "17%",
    avgDelay: "45%",
    riskOfTilt: "Low"
  }
];

// Helper: generate 24 ticks for the radial segmented arch gauge
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

export default function FleetSection({ onOpenNav, onNavigate }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedTruckId, setSelectedTruckId] = useState("trk-2");
  const [zoomScale, setZoomScale] = useState(1);
  const [hotspotModalOpen, setHotspotModalOpen] = useState(false);
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2800);
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
          1. TOP NAVIGATION BAR (Brand | Center Pill | Search & Profile)
          ================================================================== */}
      <header className={styles.topBar}>
        <div className={styles.brandArea}>
          {onOpenNav && (
            <button
              type="button"
              className={styles.navToggleBtn}
              onClick={onOpenNav}
              aria-label="Abrir menú"
              title="Menú del panel"
            >
              <Menu size={18} />
            </button>
          )}
          <Link
            href="/"
            className={styles.topbarBrand}
            title="Arconet, inicio"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/arconet.png"
              alt="Arconet"
              className={styles.topbarBrandImg}
            />
          </Link>
        </div>

        {/* Center Pill Nav Bar */}
        <nav className={styles.centerPillNav} aria-label="Navegación de flota">
          <button
            type="button"
            className={`${styles.pillItem} ${activeTab === "dashboard" ? styles.pillItemActive : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <Layers size={15} />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className={`${styles.pillIconOnly} ${activeTab === "vehicles" ? styles.pillIconOnlyActive : ""}`}
            onClick={() => {
              setActiveTab("vehicles");
              showToast("Vista de vehículos seleccionada");
            }}
            title="Lista de camiones"
            aria-label="Vehículos"
          >
            <Truck size={16} />
          </button>
          <button
            type="button"
            className={`${styles.pillIconOnly} ${activeTab === "map" ? styles.pillIconOnlyActive : ""}`}
            onClick={() => {
              if (onNavigate) {
                onNavigate("sucursales");
              } else {
                setActiveTab("map");
                showToast("Rastreo GPS en vivo activo");
              }
            }}
            title="Sucursales y Geolocalización GPS"
            aria-label="Mapa"
          >
            <MapPin size={16} />
          </button>
          <button
            type="button"
            className={`${styles.pillIconOnly} ${activeTab === "orders" ? styles.pillIconOnlyActive : ""}`}
            onClick={() => {
              if (onNavigate) {
                onNavigate("cotizaciones");
              } else {
                setActiveTab("orders");
                showToast("Manifiestos y órdenes de despacho");
              }
            }}
            title="Cotizaciones y Manifiestos"
            aria-label="Documentos"
          >
            <FileText size={16} />
          </button>
          <button
            type="button"
            className={`${styles.pillIconOnly} ${activeTab === "analytics" ? styles.pillIconOnlyActive : ""}`}
            onClick={() => {
              if (onNavigate) {
                onNavigate("resumen");
              } else {
                setActiveTab("analytics");
                showToast("Reportes y analíticas de flota");
              }
            }}
            title="Resumen y Estadísticas"
            aria-label="Estadísticas"
          >
            <TrendingUp size={16} />
          </button>
        </nav>

        {/* Right Search, Notification & Profile */}
        <div className={styles.rightActions}>
          <div className={styles.searchPill}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search.."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Search"
            />
          </div>
          <button
            type="button"
            className={styles.notifBtn}
            onClick={() => showToast("Tienes 3 notificaciones de telemetría")}
            aria-label="Notificaciones"
          >
            <Bell size={17} />
            <span className={styles.notifDot} />
          </button>
          <div
            className={styles.profileAvatar}
            onClick={() => showToast(`Conductor: ${currentTruck.driver}`)}
            title={currentTruck.driver}
          >
            <Image
              src="/fleet/driver-ethan.jpg"
              alt="Ethan Carter"
              width={40}
              height={40}
              priority
            />
          </div>
        </div>
      </header>

      {/* ==================================================================
          2. TITLE ROW & 4 FLOATING KPI CARDS
          ================================================================== */}
      <section className={styles.overviewRow} aria-label="Resumen de indicadores">
        <div className={styles.overviewTitleBlock}>
          <h1 className={styles.mainTitle}>Dashboard Overview</h1>
          <p className={styles.subtitle}>
            Welcome back! Here&apos;s what&apos;s happening with your clients today.
          </p>
        </div>

        <div className={styles.kpiCardsRow}>
          {/* Card 1: Active Vehicles */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrap}>
              <Truck size={17} />
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Active Vehicles</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>58</span>
                <span className={styles.kpiBadgeGreen}>↑ +2.5%</span>
              </div>
            </div>
          </div>

          {/* Card 2: Vehicles in Maintenance */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrap}>
              <FileText size={17} />
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Vehicles in Maintenance</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>10</span>
                <span className={styles.kpiBadgeGreen}>↑ +1.5%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Average Efficiency */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrap}>
              <Settings size={17} />
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Average Efficiency</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>86%</span>
                <span className={styles.kpiBadgeRed}>↓ -3.5%</span>
              </div>
            </div>
          </div>

          {/* Card 4: Cargo in Transit */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrap}>
              <Layers size={17} />
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Cargo in Transit</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>130</span>
                <span className={styles.kpiBadgeGreen}>↑ +2.0%</span>
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
            {/* Floating Glassmorphism Container Details Card */}
            <div className={styles.containerDetailsFloating}>
              <div className={styles.floatingHead}>
                <div className={styles.floatingHeadLeft}>
                  <Box size={13} color="#f97316" />
                  <span>Container Details</span>
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

              <div className={styles.containerIdLabel}>Container ID</div>
              <div className={styles.containerIdValue}>{currentTruck.containerId}</div>

              {/* 3D Container Thumbnail */}
              <div className={styles.container3DThumb}>
                <Image
                  src="/fleet/container-thumb.jpg"
                  alt="3D Container"
                  width={180}
                  height={62}
                  style={{ objectFit: "cover" }}
                />
              </div>

              {/* Specs Rows */}
              <div className={styles.floatingList}>
                <div className={styles.floatingRow}>
                  <span className={styles.floatingRowLabel}>
                    <Box size={11} /> Type
                  </span>
                  <span className={styles.floatingRowVal}>{currentTruck.type}</span>
                </div>
                <div className={styles.floatingRow}>
                  <span className={styles.floatingRowLabel}>
                    <CheckCircle2 size={11} /> Status
                  </span>
                  <span className={styles.activeDotPill}>
                    <span className={styles.activeDot} />
                    {currentTruck.status}
                  </span>
                </div>
                <div className={styles.floatingRow}>
                  <span className={styles.floatingRowLabel}>
                    <MapPin size={11} /> Location
                  </span>
                  <span className={styles.floatingRowVal}>{currentTruck.location}</span>
                </div>
                <div className={styles.floatingRow}>
                  <span className={styles.floatingRowLabel}>
                    <Clock size={11} /> In Transit
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

              {/* Interactive Hotspot (+) on the Container body */}
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
                <span>Reset View</span>
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

          {/* Truck Selector Carousel Strip */}
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

          {/* Bottom Row: 3 Informational Cards */}
          <div className={styles.bottomRowGrid}>
            {/* Card 1: 4-Quadrant Operational Stats */}
            <div className={styles.bottomCard}>
              <div className={styles.quadrantGrid}>
                {/* Quadrant 1 */}
                <div className={styles.quadrantItem}>
                  <div className={styles.quadrantHead}>
                    <span>Total Pallets loaded</span>
                    <Box size={14} className={styles.quadrantIcon} />
                  </div>
                  <div className={styles.quadrantValue}>{currentTruck.pallets}</div>
                </div>

                {/* Quadrant 2 */}
                <div className={styles.quadrantItem}>
                  <div className={styles.quadrantHead}>
                    <span>Free space remaining</span>
                    <Info size={14} className={styles.quadrantIcon} />
                  </div>
                  <div className={styles.quadrantValue}>{currentTruck.freeSpace}</div>
                </div>

                {/* Quadrant 3 */}
                <div className={styles.quadrantItem}>
                  <div className={styles.quadrantHead}>
                    <span>Temperature status</span>
                    <Thermometer size={14} className={styles.quadrantIcon} />
                  </div>
                  <div className={styles.quadrantValue}>{currentTruck.temperature}</div>
                </div>

                {/* Quadrant 4 */}
                <div className={styles.quadrantItem}>
                  <div className={styles.quadrantHead}>
                    <span>Fuel needed</span>
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
                <div className={styles.efficiencySublabel}>On-time probability</div>
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
                <span>Avg. delay (expected)</span>
                <span className={styles.efficiencyFooterVal}>{currentTruck.avgDelay}</span>
              </div>
            </div>

            {/* Card 3: Load Balance */}
            <div className={styles.bottomCard}>
              <div className={styles.loadBalanceHead}>Load Balance</div>

              <div className={styles.balanceStatsRow}>
                <div className={styles.balanceSide}>
                  <span className={styles.balancePercent}>{currentTruck.leftSide}</span>
                  <span className={styles.balanceLabel}>Left side</span>
                </div>
                <div className={styles.balanceSide} style={{ textAlign: "right" }}>
                  <span className={styles.balancePercent}>{currentTruck.rightSide}</span>
                  <span className={styles.balanceLabel}>Right side</span>
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
                <span>Risk of tilt:</span>
                <span className={styles.balanceRiskBadge}>{currentTruck.riskOfTilt}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3 Cards (Truck Info | Capacity & Load | AI Route) */}
        <div className={styles.rightColumn}>
          {/* Card 1: Truck Information */}
          <div className={styles.rightCard}>
            <div className={styles.rightCardTitle}>Truck Information</div>

            {/* Driver Profile Row */}
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
                  <span className={styles.driverLabel}>Driver</span>
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
                <span className={styles.specLabel}>Truck ID</span>
                <span className={styles.specValue}>{currentTruck.truckId}</span>
              </div>
              <div className={styles.specCol}>
                <span className={styles.specLabel}>Dock</span>
                <span className={styles.specValue}>{currentTruck.dock}</span>
              </div>
              <div className={styles.specCol}>
                <span className={styles.specLabel}>Started</span>
                <span className={styles.specValue}>{currentTruck.started}</span>
              </div>
            </div>

            {/* Route Timeline Slider */}
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

            {/* Action Buttons */}
            <div className={styles.driverActionBtnsRow}>
              <button
                type="button"
                className={styles.subtlePillBtn}
                onClick={() => setDriverModalOpen(true)}
              >
                Change Driver
              </button>
              <button
                type="button"
                className={styles.subtlePillBtn}
                onClick={() => setRouteModalOpen(true)}
              >
                Edit Route
              </button>
            </div>
          </div>

          {/* Card 2: Capacity & Load */}
          <div className={styles.rightCard}>
            <div className={styles.rightCardTitle}>Capacity &amp; load</div>

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
                  <span className={styles.gaugeSubtext}>Weight</span>
                </div>
              </div>

              {/* Load Specs */}
              <div className={styles.loadSpecsCol}>
                <div className={styles.loadSpecItem}>
                  <span className={styles.loadSpecLabel}>Current load</span>
                  <span className={styles.loadSpecValue}>{currentTruck.currentLoad}</span>
                </div>
                <div className={styles.loadSpecItem}>
                  <span className={styles.loadSpecLabel}>Max. Capacity</span>
                  <span className={styles.loadSpecValue}>{currentTruck.maxCapacity}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: AI Route Optimization */}
          <div className={`${styles.rightCard} ${styles.aiRouteCard}`}>
            <div className={styles.aiRouteTitleArea}>
              <div className={styles.rightCardTitle}>AI Route Optimization</div>
            </div>

            <div className={styles.aiRouteMapViewport}>
              <Image
                src="/fleet/ai-route.jpg"
                alt="AI Route 3D map"
                fill
                className={styles.aiRouteMapImg}
              />

              {/* Floating Badges */}
              <div className={styles.aiBadgesOverlay}>
                <span className={styles.aiPillBadge}>
                  <Zap size={12} color="#f97316" />
                  <span>AI Optimized</span>
                </span>
                <span className={styles.aiPillBadge}>
                  <Fuel size={12} color="#10b981" />
                  <span>24% Fuel Saved</span>
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

      {/* Hotspot Container Inspection Modal */}
      {hotspotModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setHotspotModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
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

      {/* Change Driver Modal */}
      {driverModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setDriverModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
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

      {/* Edit Route Modal */}
      {routeModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setRouteModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
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

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className={styles.toast} role="status">
          <Zap size={14} color="#f97316" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
